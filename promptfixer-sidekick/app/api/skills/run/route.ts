/**
 * POST /api/skills/run
 *
 * Generic skill-runner. Takes `{ skillId, input }`, validates the id
 * against the registry, refuses planned/unknown skills, and invokes
 * the shipped skill's runner. Cloud-bound skills (prompt-fixer,
 * architect) go through the Phase-4 server billing gate so the daily
 * budget is enforced regardless of what the browser believes.
 *
 * Response shape:
 *   { ok: true, skillId, status, result: SkillResult, usage? }
 *   { ok: false, code, message, ... }
 */

import { NextRequest, NextResponse } from "next/server";
import { fireAndForgetAlert } from "@/lib/alert-dispatcher";
import {
  billingErrorResponse,
  requestExceedsSize,
  runBillingGate
} from "@/lib/billing/server";
import { isClientContext, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import { architectSkill } from "@/lib/skills/architect";
import { promptCleanerSkill } from "@/lib/skills/prompt-cleaner";
import { promptFixerSkill } from "@/lib/skills/prompt-fixer";
import { getSkill } from "@/lib/skills/registry";
import type { Skill, SkillContext, SkillId, SkillResult } from "@/lib/skills/types";
import type {
  ClientContext,
  Engine,
  ModelQuality,
  Tier
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

const VALID_SKILL_IDS: SkillId[] = [
  "prompt-fixer",
  "prompt-cleaner",
  "architect",
  "code-debugger",
  "ai-researcher",
  "crypto-analyst",
  "screenshot-analyzer",
  "terminal-assistant",
  "deployment-assistant",
  "marketing-generator",
  "outreach-agent",
  "vision-analyzer",
  "workflow-builder"
];

function isSkillId(v: unknown): v is SkillId {
  return typeof v === "string" && (VALID_SKILL_IDS as string[]).includes(v);
}

interface RunBody {
  skillId?: string;
  input?: unknown;
  modelQuality?: string;
  clientContext?: string;
  allowCloudFallback?: boolean;
  notifyOnHumanNeeded?: boolean;
  alertUser?: string;
}

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Request body too large.", 413);
  }

  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON body.", 400);
  }

  if (!isSkillId(body.skillId)) {
    return billingErrorResponse("unknown_skill", "Unknown skill id.", 400);
  }

  const skill = getSkill(body.skillId);
  if (!skill) {
    return billingErrorResponse("unknown_skill", "Unknown skill id.", 400);
  }
  if (skill.meta.status !== "shipped") {
    return billingErrorResponse(
      "not_implemented",
      `Skill "${body.skillId}" is not yet shipped (status: ${skill.meta.status}).`,
      400
    );
  }

  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : skill.meta.modelPreference?.quality ?? "fast";
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  const allowCloudFallback =
    modelQuality === "local" && body.allowCloudFallback === true;

  const requestedEngine: Engine = getQuality(modelQuality).engine;
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";
  const isCloudBoundSkill =
    skill.meta.id === "prompt-fixer" || skill.meta.id === "architect";

  // Phase-4 gate: rate limit + plan resolution + quota consume on
  // cloud-bound skills.
  const gate = await runBillingGate(req, {
    rateLimit: "cloudGenerate",
    action: "cloud-fix",
    consume: isCloudBoundSkill && willHitCloud
  });
  if (!gate.ok) return gate.errorResponse!;

  const tier: Tier = gate.isPro ? "pro" : "free";
  const ctx: SkillContext = {
    clientKey: gate.identity.id,
    user: typeof body.alertUser === "string" ? body.alertUser : undefined
  };

  let result: SkillResult<unknown>;
  let mission = "";
  switch (skill.meta.id) {
    case "prompt-fixer": {
      const inputText = typeof body.input === "string" ? body.input : "";
      mission = inputText;
      result = (await promptFixerSkill.run(
        {
          input: inputText,
          mode: undefined,
          autoMode: true,
          modelQuality,
          clientContext,
          allowCloudFallback,
          notifyOnHumanNeeded: Boolean(body.notifyOnHumanNeeded),
          alertUser: ctx.user
        },
        ctx
      )) as SkillResult<unknown>;
      break;
    }
    case "prompt-cleaner": {
      const inputText = typeof body.input === "string" ? body.input : "";
      mission = inputText;
      result = (await promptCleanerSkill.run(
        { input: inputText },
        ctx
      )) as SkillResult<unknown>;
      break;
    }
    case "architect": {
      const inputText = typeof body.input === "string" ? body.input : "";
      mission = inputText;
      result = (await architectSkill.run(
        { input: inputText, modelQuality, clientContext, allowCloudFallback },
        ctx
      )) as SkillResult<unknown>;
      break;
    }
    default: {
      const anySkill = skill as Skill<unknown, unknown>;
      result = await anySkill.run(body.input, ctx);
      break;
    }
  }

  if (skill.meta.id === "prompt-fixer" && result.ok) {
    fireAndForgetAlert({
      clientKey: gate.identity.id,
      surface: `skill:prompt-fixer · ${result.mode ?? "general"}`,
      user: ctx.user,
      mission,
      fix: result.output as Parameters<typeof fireAndForgetAlert>[0]["fix"],
      notifyOnHumanNeeded: Boolean(body.notifyOnHumanNeeded)
    });
  }

  const headers = new Headers();
  headers.set("X-Plan", gate.plan);
  if (gate.usage && gate.usage.limit > 0) {
    headers.set("X-RateLimit-Limit", String(gate.usage.limit));
    headers.set("X-RateLimit-Remaining", String(gate.usage.remaining));
    headers.set("X-RateLimit-Reset", gate.usage.resetAt);
  }

  return gate.attach(
    NextResponse.json(
      {
        ok: true,
        skillId: skill.meta.id,
        status: skill.meta.status,
        result,
        plan: gate.plan,
        usage: gate.usage
      },
      { status: 200, headers }
    )
  );
}

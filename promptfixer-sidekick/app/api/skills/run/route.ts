/**
 * POST /api/skills/run
 *
 * Generic skill-runner. Takes `{ skillId, input }`, validates the id
 * against the registry, refuses planned/unknown skills, and invokes
 * the shipped skill's runner. Wraps the same metering + alert path the
 * dedicated /api/fix and /api/architect routes use, so a click on a
 * skill suggestion never bypasses the daily budget.
 *
 * Response shape:
 *   { ok: true, skillId, status, result: SkillResult, usage? }
 *   { ok: false, error: "unknown_skill" | "not_implemented" | "rate_limited" }
 */

import { NextRequest, NextResponse } from "next/server";
import { fireAndForgetAlert } from "@/lib/alert-dispatcher";
import { isClientContext, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import { architectSkill } from "@/lib/skills/architect";
import { promptCleanerSkill } from "@/lib/skills/prompt-cleaner";
import { promptFixerSkill } from "@/lib/skills/prompt-fixer";
import { getSkill } from "@/lib/skills/registry";
import type { Skill, SkillContext, SkillId, SkillResult } from "@/lib/skills/types";
import {
  clientKeyFromHeaders,
  consume,
  FREE_DAILY_LIMIT,
  peek
} from "@/lib/usage";
import type {
  ClientContext,
  Engine,
  ModelQuality,
  Tier
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isSkillId(body.skillId)) {
    return NextResponse.json({ ok: false, error: "unknown_skill" }, { status: 400 });
  }

  const skill = getSkill(body.skillId);
  if (!skill) {
    return NextResponse.json({ ok: false, error: "unknown_skill" }, { status: 400 });
  }
  if (skill.meta.status !== "shipped") {
    return NextResponse.json(
      {
        ok: false,
        error: "not_implemented",
        skillId: body.skillId,
        status: skill.meta.status
      },
      { status: 400 }
    );
  }

  // Skill-specific input shaping + metering decision.
  const tier: Tier = "free";
  const clientKey = clientKeyFromHeaders(req.headers);
  const ctx: SkillContext = {
    clientKey,
    user: typeof body.alertUser === "string" ? body.alertUser : undefined
  };

  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : skill.meta.modelPreference?.quality ?? "fast";
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  const allowCloudFallback =
    modelQuality === "local" && body.allowCloudFallback === true;

  // Pre-flight metering for cloud-bound skills. Same predicate the
  // dedicated routes use.
  let usage = peek(clientKey, tier);
  let willHitCloud = false;
  if (skill.meta.id === "prompt-fixer" || skill.meta.id === "architect") {
    const requestedEngine: Engine = getQuality(modelQuality).engine;
    const routed = route(requestedEngine, clientContext, { allowCloudFallback });
    willHitCloud = routed.resolved === "cloud";
    if (willHitCloud) {
      const result = consume(clientKey, tier);
      if (!result.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: `Daily ${tier} limit reached (${result.snapshot.limit}/day). Resets at ${result.snapshot.resetAt}.`,
            usage: result.snapshot
          },
          { status: 429 }
        );
      }
      usage = result.snapshot;
    }
  }

  // Run the skill via its typed module export so we keep the I/O type
  // information at the call site.
  let result: SkillResult<unknown>;
  let mission = ""; // surface label for the alert payload
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
      result = (await promptCleanerSkill.run({ input: inputText }, ctx)) as SkillResult<unknown>;
      break;
    }
    case "architect": {
      const inputText = typeof body.input === "string" ? body.input : "";
      mission = inputText;
      result = (await architectSkill.run(
        {
          input: inputText,
          modelQuality,
          clientContext,
          allowCloudFallback
        },
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

  // Mission Alerts — non-blocking. Hard failures from prompt-fixer fire
  // admin-only; soft cases require user opt-in.
  if (skill.meta.id === "prompt-fixer" && result.ok) {
    fireAndForgetAlert({
      clientKey,
      surface: `skill:prompt-fixer · ${result.mode ?? "general"}`,
      user: ctx.user,
      mission,
      fix: result.output as Parameters<typeof fireAndForgetAlert>[0]["fix"],
      notifyOnHumanNeeded: Boolean(body.notifyOnHumanNeeded)
    });
  }

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(usage.limit));
  headers.set("X-RateLimit-Remaining", String(usage.remaining));
  headers.set("X-RateLimit-Reset", usage.resetAt);
  if (FREE_DAILY_LIMIT > 0) headers.set("X-Free-Daily-Limit", String(FREE_DAILY_LIMIT));

  return NextResponse.json(
    {
      ok: true,
      skillId: skill.meta.id,
      status: skill.meta.status,
      result,
      usage
    },
    { status: 200, headers }
  );
}

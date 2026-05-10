/**
 * POST /api/fix
 *
 * Phase-4: cloud-bound generation goes through the server billing
 * gate (`runBillingGate({ action: "cloud-fix", consume: willHitCloud })`).
 * Free identities get 10 cloud fixes / day; pro/team/enterprise are
 * unlimited. Output transforms (`action + previousSections`) only burn
 * a fix when they actually hit cloud.
 */

import { NextRequest, NextResponse } from "next/server";
import { isOutputAction } from "@/lib/actions";
import { fixPrompt } from "@/lib/ai";
import { fireAndForgetAlert } from "@/lib/alert-dispatcher";
import {
  billingErrorResponse,
  requestExceedsSize,
  runBillingGate
} from "@/lib/billing/server";
import { isMode } from "@/lib/modes";
import { isClientContext, isEngine, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import type {
  ClientContext,
  Engine,
  FixRequest,
  ModelQuality,
  PromptSections,
  Tier
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Request body too large.", 413);
  }

  let body: Partial<FixRequest> & { tier?: Tier };
  try {
    body = (await req.json()) as Partial<FixRequest> & { tier?: Tier };
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON body.", 400);
  }

  const action = isOutputAction(body.action) ? body.action : undefined;
  const previousSections = isPromptSections(body.previousSections)
    ? body.previousSections
    : undefined;
  const isTransform = Boolean(action && previousSections);

  const input = typeof body.input === "string" ? body.input : "";
  if (!isTransform && !input.trim()) {
    return billingErrorResponse("input_required", "input is required.", 400);
  }
  if (action && !previousSections) {
    return billingErrorResponse(
      "previousSections_required",
      "previousSections is required when action is set.",
      400
    );
  }

  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : "fast";

  const requestedEngine: Engine | undefined = isEngine(body.engine)
    ? body.engine
    : getQuality(modelQuality).engine;

  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";

  const allowCloudFallback =
    requestedEngine === "ollama" && body.allowCloudFallback === true;

  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  const gate = await runBillingGate(req, {
    rateLimit: "cloudGenerate",
    action: "cloud-fix",
    consume: willHitCloud
  });
  if (!gate.ok) return gate.errorResponse!;

  const tier: Tier = gate.isPro ? "pro" : "free";

  const response = await fixPrompt(
    {
      input,
      mode: isMode(body.mode) ? body.mode : undefined,
      engine: requestedEngine,
      autoMode: Boolean(body.autoMode),
      clientContext,
      allowCloudFallback,
      modelQuality,
      action,
      previousSections
    },
    {
      tier,
      // Older callers expected `usage` to be a UsageSnapshot
      // (lib/types.ts). The new ServerUsageSnapshot is shape-compatible
      // for the fields the AI pipeline reads (limit/remaining/resetAt).
      usage: gate.usage
        ? {
            tier,
            used: gate.usage.used,
            limit: gate.usage.limit,
            remaining: gate.usage.remaining,
            resetAt: gate.usage.resetAt
          }
        : undefined
    }
  );

  fireAndForgetAlert({
    clientKey: gate.identity.id,
    surface: `fix · ${response.mode}`,
    user: typeof body.alertUser === "string" ? body.alertUser : undefined,
    mission: input || "(transform)",
    fix: response,
    notifyOnHumanNeeded: Boolean(body.notifyOnHumanNeeded)
  });

  const headers = new Headers();
  headers.set("X-Plan", gate.plan);
  if (gate.usage && gate.usage.limit > 0) {
    headers.set("X-RateLimit-Limit", String(gate.usage.limit));
    headers.set("X-RateLimit-Remaining", String(gate.usage.remaining));
    headers.set("X-RateLimit-Reset", gate.usage.resetAt);
  }

  return gate.attach(NextResponse.json(response, { status: 200, headers }));
}

function isPromptSections(value: unknown): value is PromptSections {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.role === "string" &&
    typeof v.task === "string" &&
    typeof v.context === "string" &&
    Array.isArray(v.constraints) &&
    typeof v.outputFormat === "string"
  );
}

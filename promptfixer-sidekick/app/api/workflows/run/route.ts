/**
 * POST /api/workflows/run
 *
 * Runs a saved workflow over the existing typed runner. Phase-4
 * billing gate: a single cloud-fix consume covers the whole workflow
 * run (the `fix-clean-architect` chain has at most two cloud-bound
 * nodes — over-counting would surprise users).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  billingErrorResponse,
  requestExceedsSize,
  runBillingGate
} from "@/lib/billing/server";
import { isClientContext, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import type { SkillContext } from "@/lib/skills/types";
import type { ToolCallContext } from "@/lib/tools/types";
import type { ClientContext, Engine, ModelQuality } from "@/lib/types";
import { getSavedWorkflow, runWorkflow } from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

interface RunBody {
  workflowId?: string;
  input?: string;
  modelQuality?: string;
  clientContext?: string;
  allowCloudFallback?: boolean;
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

  const workflowId = (body.workflowId || "").trim();
  if (!workflowId) {
    return billingErrorResponse("workflowId_required", "Missing workflowId.", 400);
  }

  const def = getSavedWorkflow(workflowId);
  if (!def) {
    return billingErrorResponse("unknown_workflow", "Unknown workflow id.", 400);
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return billingErrorResponse("input_required", "input is required.", 400);
  }

  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : "fast";
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  const allowCloudFallback =
    modelQuality === "local" && body.allowCloudFallback === true;

  const requestedEngine: Engine = getQuality(modelQuality).engine;
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  const gate = await runBillingGate(req, {
    rateLimit: "cloudGenerate",
    action: "cloud-fix",
    consume: willHitCloud
  });
  if (!gate.ok) return gate.errorResponse!;

  const ctx: SkillContext & ToolCallContext = {
    clientKey: gate.identity.id,
    user: typeof body.alertUser === "string" ? body.alertUser : undefined
  };

  const wf = await runWorkflow(def, {
    ctx,
    input: shapeInputForWorkflow(workflowId, input, {
      modelQuality,
      clientContext,
      allowCloudFallback
    })
  });

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
        ok: wf.ok,
        workflowId: def.id,
        result: wf,
        plan: gate.plan,
        usage: gate.usage
      },
      { status: 200, headers }
    )
  );
}

function shapeInputForWorkflow(
  workflowId: string,
  input: string,
  opts: {
    modelQuality: ModelQuality;
    clientContext: ClientContext;
    allowCloudFallback: boolean;
  }
): unknown {
  void workflowId;
  return {
    input,
    autoMode: true,
    modelQuality: opts.modelQuality,
    clientContext: opts.clientContext,
    allowCloudFallback: opts.allowCloudFallback
  };
}

/**
 * POST /api/workflows/run
 *
 * Body: { workflowId: string, input: string }
 *
 * Runs a saved workflow over the existing typed runner. Meters the
 * single shipped workflow (`fix-clean-architect`) optimistically: a
 * single budget consume covers the prompt-fixer + architect cloud
 * calls inside, since they share the same per-IP daily quota.
 *
 * Returns the structured `WorkflowResult` (events + per-node outputs)
 * the UI can introspect. Output bodies are large — clients should
 * treat the response as one-shot, not poll.
 */

import { NextRequest, NextResponse } from "next/server";
import { isClientContext, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import type { SkillContext } from "@/lib/skills/types";
import type { ToolCallContext } from "@/lib/tools/types";
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
import { getSavedWorkflow, runWorkflow } from "@/lib/workflows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RunBody {
  workflowId?: string;
  input?: string;
  modelQuality?: string;
  clientContext?: string;
  allowCloudFallback?: boolean;
  alertUser?: string;
}

export async function POST(req: NextRequest) {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const workflowId = (body.workflowId || "").trim();
  if (!workflowId) {
    return NextResponse.json({ ok: false, error: "workflowId_required" }, { status: 400 });
  }

  const def = getSavedWorkflow(workflowId);
  if (!def) {
    return NextResponse.json({ ok: false, error: "unknown_workflow" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return NextResponse.json({ ok: false, error: "input_required" }, { status: 400 });
  }

  const tier: Tier = "free";
  const clientKey = clientKeyFromHeaders(req.headers);
  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : "fast";
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  const allowCloudFallback =
    modelQuality === "local" && body.allowCloudFallback === true;

  // Workflow-level meter. The fix-clean-architect chain has at most two
  // cloud-bound nodes; charge once per workflow run regardless. Lossy
  // but bounded — full per-node metering lands when the runner gains a
  // pre-flight cost estimator.
  const requestedEngine: Engine = getQuality(modelQuality).engine;
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  let usage = peek(clientKey, tier);
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

  const ctx: SkillContext & ToolCallContext = {
    clientKey,
    user: typeof body.alertUser === "string" ? body.alertUser : undefined
  };

  // The saved workflow's nodes use ref:$input — pass `input` shaped per
  // each skill's expected payload via a thin wrapper run.
  const wf = await runWorkflow(def, {
    ctx,
    input: shapeInputForWorkflow(workflowId, input, {
      modelQuality,
      clientContext,
      allowCloudFallback
    })
  });

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(usage.limit));
  headers.set("X-RateLimit-Remaining", String(usage.remaining));
  headers.set("X-RateLimit-Reset", usage.resetAt);
  if (FREE_DAILY_LIMIT > 0) headers.set("X-Free-Daily-Limit", String(FREE_DAILY_LIMIT));

  return NextResponse.json(
    {
      ok: wf.ok,
      workflowId: def.id,
      result: wf,
      usage
    },
    { status: 200, headers }
  );
}

/**
 * Each skill takes a slightly different shape:
 *   - prompt-fixer needs { input, ... routing }
 *   - prompt-cleaner needs { input }
 *   - architect needs { input, ... routing }
 *
 * Since all three nodes ref the same workflow-level $input, we shape
 * once into the broadest acceptable object — every skill ignores fields
 * it doesn't understand.
 */
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

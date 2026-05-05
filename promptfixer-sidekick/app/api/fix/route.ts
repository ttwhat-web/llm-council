import { NextRequest, NextResponse } from "next/server";
import { isOutputAction } from "@/lib/actions";
import { fixPrompt } from "@/lib/ai";
import { isMode } from "@/lib/modes";
import { isClientContext, isEngine, route } from "@/lib/providers";
import { getQuality, isModelQuality } from "@/lib/quality";
import {
  clientKeyFromHeaders,
  consume,
  FREE_DAILY_LIMIT,
  peek
} from "@/lib/usage";
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

export async function POST(req: NextRequest) {
  let body: Partial<FixRequest> & { tier?: Tier };
  try {
    body = (await req.json()) as Partial<FixRequest> & { tier?: Tier };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const action = isOutputAction(body.action) ? body.action : undefined;
  const previousSections = isPromptSections(body.previousSections)
    ? body.previousSections
    : undefined;
  const isTransform = Boolean(action && previousSections);

  const input = typeof body.input === "string" ? body.input : "";
  if (!isTransform && !input.trim()) {
    return NextResponse.json({ ok: false, error: "input is required" }, { status: 400 });
  }
  if (action && !previousSections) {
    return NextResponse.json(
      { ok: false, error: "previousSections is required when action is set" },
      { status: 400 }
    );
  }

  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : "fast";

  // Quality drives engine when the caller didn't pass an explicit engine.
  // (Power-user override still works via `engine` in the body.)
  const requestedEngine: Engine | undefined = isEngine(body.engine)
    ? body.engine
    : getQuality(modelQuality).engine;

  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";

  const allowCloudFallback =
    requestedEngine === "ollama" && body.allowCloudFallback === true;

  const tier: Tier = "free";

  // Resolve which provider we'd actually use, so we only meter cloud calls.
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  let usage = peek(clientKeyFromHeaders(req.headers), tier);

  if (willHitCloud) {
    const result = consume(clientKeyFromHeaders(req.headers), tier);
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
    { tier, usage }
  );

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(usage.limit));
  headers.set("X-RateLimit-Remaining", String(usage.remaining));
  headers.set("X-RateLimit-Reset", usage.resetAt);
  if (FREE_DAILY_LIMIT > 0) headers.set("X-Free-Daily-Limit", String(FREE_DAILY_LIMIT));

  return NextResponse.json(response, { status: 200, headers });
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

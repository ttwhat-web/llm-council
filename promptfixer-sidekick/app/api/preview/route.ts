/**
 * POST /api/preview
 *
 * Pro-tier "Execution Preview" endpoint. Runs the user's execution-ready
 * prompt against whatever provider their quality choice + clientContext
 * resolves to, and returns the model's response labelled as a preview —
 * never as the authoritative answer.
 *
 * Routing + metering use the same primitives as /api/fix, so a preview
 * call counts against the same daily cloud quota. Local Ollama and
 * deterministic previews are not metered.
 */

import { NextRequest, NextResponse } from "next/server";
import { isMode } from "@/lib/modes";
import { deterministicPreview, PREVIEW_SYSTEM } from "@/lib/preview";
import { isClientContext, route } from "@/lib/providers";
import {
  getQuality,
  isModelQuality,
  resolveCloudModel,
  resolveOllamaModel
} from "@/lib/quality";
import {
  clientKeyFromHeaders,
  consume,
  FREE_DAILY_LIMIT,
  peek
} from "@/lib/usage";
import type {
  ClientContext,
  ModelQuality,
  PreviewRequest,
  PreviewResponse,
  Tier
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let body: Partial<PreviewRequest>;
  try {
    body = (await req.json()) as Partial<PreviewRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt.trim()) {
    return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 });
  }
  const mode = isMode(body.mode) ? body.mode : "general";
  const modelQuality: ModelQuality = isModelQuality(body.modelQuality)
    ? body.modelQuality
    : "fast";
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  const allowCloudFallback =
    modelQuality === "local" && body.allowCloudFallback === true;

  const tier: Tier = "free";
  const requestedEngine = getQuality(modelQuality).engine;
  const routed = route(requestedEngine, clientContext, { allowCloudFallback });
  const willHitCloud = routed.resolved === "cloud";

  // ---- deterministic short-circuit ----
  if (routed.resolved === "deterministic") {
    const usage = peek(clientKeyFromHeaders(req.headers), tier);
    const payload: PreviewResponse = {
      ok: true,
      preview: deterministicPreview(mode),
      mode,
      label: "AI response preview",
      isDeterministic: true,
      resolved: "deterministic",
      model: "rules-only",
      usage,
      notice:
        "Deterministic preview — connect a cloud key (or run Ollama) for a live AI-generated preview.",
      elapsedMs: Date.now() - t0
    };
    return NextResponse.json(payload, { status: 200 });
  }

  // ---- meter cloud calls ----
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

  const modelOverride = willHitCloud
    ? resolveCloudModel(modelQuality)
    : routed.resolved === "ollama"
      ? resolveOllamaModel(modelQuality)
      : undefined;

  const result = await routed.provider.generate(prompt, {
    system: PREVIEW_SYSTEM,
    temperature: 0.4,
    tier,
    model: modelOverride
  });

  if (!result.ok || !result.content.trim()) {
    // Provider failed — degrade to the deterministic template so the user
    // still sees something useful, and surface the error as a notice.
    const payload: PreviewResponse = {
      ok: true,
      preview: deterministicPreview(mode),
      mode,
      label: "AI response preview",
      isDeterministic: true,
      resolved: result.providerId,
      model: result.model,
      latencyMs: result.latencyMs,
      usage,
      notice: result.error
        ? `Live preview unavailable (${result.error}). Showing a deterministic shape.`
        : "Live preview returned empty. Showing a deterministic shape.",
      elapsedMs: Date.now() - t0
    };

    const headers = rateHeaders(usage);
    return NextResponse.json(payload, { status: 200, headers });
  }

  const payload: PreviewResponse = {
    ok: true,
    preview: result.content,
    mode,
    label: "AI response preview",
    isDeterministic: false,
    resolved: result.providerId,
    model: result.model,
    latencyMs: result.latencyMs,
    usage,
    elapsedMs: Date.now() - t0
  };

  return NextResponse.json(payload, { status: 200, headers: rateHeaders(usage) });
}

function rateHeaders(usage: { limit: number; remaining: number; resetAt: string }): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(usage.limit));
  headers.set("X-RateLimit-Remaining", String(usage.remaining));
  headers.set("X-RateLimit-Reset", usage.resetAt);
  if (FREE_DAILY_LIMIT > 0) headers.set("X-Free-Daily-Limit", String(FREE_DAILY_LIMIT));
  return headers;
}

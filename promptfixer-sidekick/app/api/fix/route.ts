import { NextRequest, NextResponse } from "next/server";
import { fixPrompt } from "@/lib/ai";
import { isMode } from "@/lib/modes";
import { isClientContext, isEngine, route } from "@/lib/providers";
import {
  clientKeyFromHeaders,
  consume,
  FREE_DAILY_LIMIT,
  peek
} from "@/lib/usage";
import type { ClientContext, Engine, FixRequest, Tier } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Partial<FixRequest> & { tier?: Tier };
  try {
    body = (await req.json()) as Partial<FixRequest> & { tier?: Tier };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return NextResponse.json({ ok: false, error: "input is required" }, { status: 400 });
  }

  const requestedEngine: Engine | undefined = isEngine(body.engine) ? body.engine : undefined;
  const clientContext: ClientContext = isClientContext(body.clientContext)
    ? body.clientContext
    : "web";
  // Strict by default. Only the user can flip this on, and only when
  // engine === "ollama" — the router enforces the same.
  const allowCloudFallback =
    requestedEngine === "ollama" && body.allowCloudFallback === true;

  const tier: Tier = "free";

  // Resolve which provider we'd actually use, so we only meter cloud calls.
  // Ollama in strict mode (the default) NEVER resolves to cloud — guaranteed
  // by the router — so cloud metering cannot fire by accident on a fallback.
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
      allowCloudFallback
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

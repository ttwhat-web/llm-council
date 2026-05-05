import { NextRequest, NextResponse } from "next/server";
import { fixPrompt } from "@/lib/ai";
import { isMode } from "@/lib/modes";
import { isEngine, route } from "@/lib/providers";
import {
  clientKeyFromHeaders,
  consume,
  FREE_DAILY_LIMIT,
  peek
} from "@/lib/usage";
import type { Engine, FixRequest, Tier } from "@/lib/types";

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
  // Tier is server-decided in v1 (no auth yet). Wired so the billing layer can
  // populate it from a session/JWT later without changing the route shape.
  const tier: Tier = "free";

  // Resolve which provider we'd actually use, so we only meter cloud calls.
  const routed = route(requestedEngine);
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
      autoMode: Boolean(body.autoMode)
    },
    { tier, usage }
  );

  // Soft hint header that lets the UI surface remaining quota.
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(usage.limit));
  headers.set("X-RateLimit-Remaining", String(usage.remaining));
  headers.set("X-RateLimit-Reset", usage.resetAt);
  if (FREE_DAILY_LIMIT > 0) headers.set("X-Free-Daily-Limit", String(FREE_DAILY_LIMIT));

  return NextResponse.json(response, { status: 200, headers });
}

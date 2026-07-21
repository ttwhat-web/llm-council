import { NextRequest, NextResponse } from "next/server";
import { cleanInput } from "@/lib/cleaner";
import type { CleanResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let body: { input?: string };
  try {
    body = (await req.json()) as { input?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input : "";
  const { cleaned, removed } = cleanInput(input);
  const payload: CleanResponse = {
    ok: true,
    cleaned,
    removed,
    elapsedMs: Date.now() - t0
  };
  return NextResponse.json(payload, { status: 200 });
}

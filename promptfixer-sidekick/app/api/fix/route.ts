import { NextRequest, NextResponse } from "next/server";
import { fixPrompt } from "@/lib/ai";
import { isMode } from "@/lib/modes";
import type { FixRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Partial<FixRequest>;
  try {
    body = (await req.json()) as Partial<FixRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) {
    return NextResponse.json({ ok: false, error: "input is required" }, { status: 400 });
  }

  const result = await fixPrompt({
    input,
    mode: isMode(body.mode) ? body.mode : undefined,
    useLocalAI: Boolean(body.useLocalAI),
    autoMode: Boolean(body.autoMode)
  });

  return NextResponse.json(result, { status: 200 });
}

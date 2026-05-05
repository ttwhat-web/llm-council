import { NextResponse } from "next/server";
import { health } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await health();
  return NextResponse.json(
    {
      ok: true,
      ollama: status,
      version: "1.0.0"
    },
    { status: 200 }
  );
}

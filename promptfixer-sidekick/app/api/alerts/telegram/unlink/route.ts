/**
 * POST /api/alerts/telegram/unlink
 *
 * Body: { userEmail: string }
 * Removes the user → chat binding. Idempotent.
 */

import { NextRequest, NextResponse } from "next/server";
import { unlinkTelegramUser } from "@/lib/telegram-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { userEmail?: string };
  try {
    body = (await req.json()) as { userEmail?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const userId = (body.userEmail || "").trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userEmail required" }, { status: 400 });
  }
  const removed = await unlinkTelegramUser(userId).catch(() => false);
  return NextResponse.json({ ok: true, unlinked: removed }, { status: 200 });
}

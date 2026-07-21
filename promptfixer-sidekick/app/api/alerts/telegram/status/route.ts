/**
 * GET /api/alerts/telegram/status?userEmail=...
 *
 * Polled by the UI after the user sends `/start CODE` to the bot, to
 * detect when the webhook has bound the chat. Never returns the actual
 * chat id — only `linked: bool`, a redacted hint, and the link timestamp.
 */

import { NextRequest, NextResponse } from "next/server";
import { hasAdminTelegramChat, hasTelegramToken } from "@/lib/telegram";
import { getTelegramLinkForUser } from "@/lib/telegram-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim();
  if (!userEmail) {
    return NextResponse.json({ ok: false, error: "userEmail required" }, { status: 400 });
  }

  const flag = (process.env.NEXT_PUBLIC_MISSION_ALERTS_ENABLED || "").toLowerCase() === "true";
  const link = await getTelegramLinkForUser(userEmail).catch(() => null);

  return NextResponse.json(
    {
      ok: true,
      linked: Boolean(link),
      linkedAt: link?.linkedAt,
      // Redact: surface only the last 4 chars of the chat id so the user
      // can verify they linked the right account, without leaking the id.
      chatHint: link ? `…${link.chatId.slice(-4)}` : undefined,
      featureEnabled: flag,
      hasToken: hasTelegramToken(),
      hasAdminFallback: hasAdminTelegramChat()
    },
    { status: 200 }
  );
}

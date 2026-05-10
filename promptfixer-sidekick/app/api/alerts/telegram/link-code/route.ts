/**
 * POST /api/alerts/telegram/link-code
 *
 * Mint a fresh `PF-XXXXX` link code for the given user identifier.
 * The user then sends `/start <CODE>` to the bot; the webhook consumes
 * the code and binds the chat id.
 *
 * Body:
 *   { userEmail: string }
 *
 * Response:
 *   { ok, code, botUsername, expiresAt }
 *   { ok: true, sent: false, reason } when feature flag is off OR the
 *     server has no bot token / username configured.
 *
 * Rate-limited per IP via the existing alert budget so a hostile
 * caller can't burn through codes.
 */

import { NextRequest, NextResponse } from "next/server";
import { consumeAlertBudget, gcAlertBuckets } from "@/lib/mission-alerts";
import { hasTelegramToken } from "@/lib/telegram";
import { createTelegramLinkCode } from "@/lib/telegram-links";
import { clientKeyFromHeaders } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_USER_LEN = 200;
const USER_PATTERN = /^[\w.@+\-]{1,200}$/i;

export async function POST(req: NextRequest) {
  let body: { userEmail?: string };
  try {
    body = (await req.json()) as { userEmail?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const userId = (body.userEmail || "").trim();
  if (!userId || userId.length > MAX_USER_LEN || !USER_PATTERN.test(userId)) {
    return NextResponse.json(
      { ok: false, error: "userEmail required (≤200 chars, alphanum/. _ @ + -)" },
      { status: 400 }
    );
  }

  const flag = (process.env.NEXT_PUBLIC_MISSION_ALERTS_ENABLED || "").toLowerCase() === "true";
  if (!flag) {
    return NextResponse.json(
      { ok: true, ready: false, reason: "feature_disabled" },
      { status: 200 }
    );
  }
  if (!hasTelegramToken()) {
    return NextResponse.json(
      { ok: true, ready: false, reason: "no_token" },
      { status: 200 }
    );
  }

  const botUsername = (process.env.TELEGRAM_BOT_USERNAME || "").trim().replace(/^@/, "");
  if (!botUsername) {
    return NextResponse.json(
      { ok: true, ready: false, reason: "no_bot_username" },
      { status: 200 }
    );
  }

  // Rate-limit code creation: per IP, sharing the alerts bucket.
  gcAlertBuckets();
  const key = `link-code:${clientKeyFromHeaders(req.headers)}`;
  if (!consumeAlertBudget(key)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 }
    );
  }

  const entry = createTelegramLinkCode(userId);
  return NextResponse.json(
    {
      ok: true,
      ready: true,
      code: entry.code,
      botUsername,
      expiresAt: entry.expiresAt,
      ttlSeconds: Math.round((entry.expiresAt - entry.createdAt) / 1000)
    },
    { status: 200 }
  );
}

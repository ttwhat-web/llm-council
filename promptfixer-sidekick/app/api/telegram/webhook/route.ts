/**
 * POST /api/telegram/webhook
 *
 * Telegram BotFather → us. Set this URL with:
 *
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *        -d url="https://yourdomain.com/api/telegram/webhook" \
 *        -d secret_token="<RANDOM_HEX>"
 *
 *   then in your env:  TELEGRAM_WEBHOOK_SECRET=<RANDOM_HEX>
 *
 * Telegram includes the secret in the `X-Telegram-Bot-Api-Secret-Token`
 * header on every request. When the env var is set we require an exact
 * match; when it's unset we accept any caller (dev only).
 *
 * The handler ignores everything except `/start <CODE>` — keeps the
 * surface tiny and safe.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  escapeHtml,
  hasTelegramToken,
  sendTelegramAlert
} from "@/lib/telegram";
import { consumeTelegramLinkCode } from "@/lib/telegram-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TgUser {
  id?: number;
  username?: string;
  first_name?: string;
}
interface TgChat {
  id?: number | string;
  type?: string;
}
interface TgMessage {
  message_id?: number;
  from?: TgUser;
  chat?: TgChat;
  text?: string;
}
interface TgUpdate {
  update_id?: number;
  message?: TgMessage;
  edited_message?: TgMessage;
}

const START_CODE = /^\/start(?:@\w+)?\s+([A-Za-z0-9-]{4,32})/;

export async function POST(req: NextRequest) {
  // Always 200 — Telegram retries aggressively on non-2xx and we never
  // want it to redeliver a malformed update.
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 200 });
  }

  if (!hasTelegramToken()) {
    return NextResponse.json({ ok: false, reason: "no_token" }, { status: 200 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 200 });
  }

  const msg = update.message ?? update.edited_message;
  const text = (msg?.text || "").trim();
  const chatId = msg?.chat?.id;

  if (!text || !chatId) {
    return NextResponse.json({ ok: true, ignored: "non_text" }, { status: 200 });
  }

  const match = text.match(START_CODE);
  if (!match) {
    // Polite acknowledgement so curious users know the bot is alive.
    if (text === "/start" || text.startsWith("/start")) {
      void sendTelegramAlert(
        [
          "👋 <b>PromptFixer Mission Alerts</b>",
          "",
          "To connect this chat, generate a code in the PromptFixer app, then send:",
          "<code>/start PF-XXXXX</code>"
        ].join("\n"),
        { chatId: String(chatId), parseMode: "HTML" }
      );
    }
    return NextResponse.json({ ok: true, ignored: "no_code" }, { status: 200 });
  }

  const code = match[1];
  const link = await consumeTelegramLinkCode(code, chatId).catch(() => null);

  if (!link) {
    void sendTelegramAlert(
      "⚠️ That code is invalid or has expired. Generate a fresh one in the PromptFixer app and try again.",
      { chatId: String(chatId), parseMode: "HTML" }
    );
    return NextResponse.json({ ok: true, linked: false }, { status: 200 });
  }

  void sendTelegramAlert(
    [
      "✅ <b>Telegram connected to PromptFixer Mission Alerts.</b>",
      "",
      `Linked to: <code>${escapeHtml(link.userId)}</code>`,
      "You'll receive alerts here when a mission needs human action."
    ].join("\n"),
    { chatId: String(chatId), parseMode: "HTML" }
  );

  return NextResponse.json({ ok: true, linked: true }, { status: 200 });
}

function checkSecret(req: NextRequest): boolean {
  const expected = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (!expected) return true; // dev mode — no secret required
  const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
  // Constant-time-ish compare. Length mismatch is fine to short-circuit.
  if (got.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < got.length; i++) {
    mismatch |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

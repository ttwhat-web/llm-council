/**
 * POST /api/alerts/telegram
 *
 * Manual alert dispatcher. The same `sendTelegramAlert` is also called
 * from /api/fix and /api/architect on auto-detected failure cases — this
 * route is for explicit dispatch from the UI or other server code.
 *
 * Body:
 *   {
 *     type: "mission_failed" | "needs_human" | "low_confidence" | "system_error",
 *     mission: string,
 *     summary: string,
 *     userEmail?: string,
 *     severity?: "low" | "medium" | "high",
 *     surface?: string
 *   }
 *
 * The bot token + admin chat id are server-only. Even when this route is
 * 200, the alert may have been silently skipped (feature flag off, bot
 * not configured, rate-limited) — callers can read `sent` + `reason`.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  consumeAlertBudget,
  formatAlertMessage,
  gcAlertBuckets,
  type AlertSeverity,
  type AlertType
} from "@/lib/mission-alerts";
import {
  getAdminTelegramChatId,
  hasTelegramToken,
  sendTelegramAlert
} from "@/lib/telegram";
import { getTelegramChatIdForUser } from "@/lib/telegram-links";
import { clientKeyFromHeaders } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  type?: string;
  mission?: string;
  summary?: string;
  userEmail?: string;
  severity?: string;
  surface?: string;
}

const ALLOWED_TYPES: AlertType[] = [
  "mission_failed",
  "needs_human",
  "low_confidence",
  "system_error"
];
const ALLOWED_SEVERITY: AlertSeverity[] = ["low", "medium", "high"];

function isType(v: unknown): v is AlertType {
  return typeof v === "string" && (ALLOWED_TYPES as string[]).includes(v);
}
function isSeverity(v: unknown): v is AlertSeverity {
  return typeof v === "string" && (ALLOWED_SEVERITY as string[]).includes(v);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (!isType(body.type)) {
    return NextResponse.json(
      { ok: false, error: `type must be one of ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!body.mission || !body.mission.trim()) {
    return NextResponse.json({ ok: false, error: "mission is required" }, { status: 400 });
  }
  if (!body.summary || !body.summary.trim()) {
    return NextResponse.json({ ok: false, error: "summary is required" }, { status: 400 });
  }

  const severity: AlertSeverity = isSeverity(body.severity) ? body.severity : "medium";

  // Feature flag — must be explicitly enabled.
  const flag = (process.env.NEXT_PUBLIC_MISSION_ALERTS_ENABLED || "").toLowerCase() === "true";
  if (!flag) {
    return NextResponse.json(
      { ok: true, sent: false, reason: "feature_disabled" },
      { status: 200 }
    );
  }

  if (!hasTelegramToken()) {
    return NextResponse.json(
      { ok: true, sent: false, reason: "no_token" },
      { status: 200 }
    );
  }

  // Resolve destination: user link → admin fallback.
  const userChatId = await getTelegramChatIdForUser(body.userEmail).catch(() => null);
  const chatId = userChatId || getAdminTelegramChatId();
  if (!chatId) {
    return NextResponse.json(
      { ok: true, sent: false, reason: "no_chat" },
      { status: 200 }
    );
  }

  // Per-IP rate limit.
  gcAlertBuckets();
  const key = `alert:${clientKeyFromHeaders(req.headers)}`;
  if (!consumeAlertBudget(key)) {
    return NextResponse.json(
      { ok: true, sent: false, reason: "rate_limited" },
      { status: 200 }
    );
  }

  const text = formatAlertMessage({
    type: body.type,
    severity,
    mission: body.mission,
    summary: body.summary,
    surface: body.surface,
    user: body.userEmail
  });

  const send = await sendTelegramAlert(text, { chatId, parseMode: "HTML" });
  return NextResponse.json(
    {
      ok: true,
      sent: send.ok,
      reason: send.ok ? (userChatId ? "sent_user" : "sent_admin") : send.reason
    },
    { status: 200 }
  );
}

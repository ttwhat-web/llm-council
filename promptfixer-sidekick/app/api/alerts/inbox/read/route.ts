/**
 * POST /api/alerts/inbox/read
 *
 * Body: { userEmail: string, alertId: string, read?: boolean }
 *
 * Marks one record as read (default) or unread. Idempotent. Lightly rate-
 * limited per IP via the existing alert budget so a hostile caller can't
 * mass-flip read state.
 */

import { NextRequest, NextResponse } from "next/server";
import { markAlertRead } from "@/lib/alert-inbox";
import { consumeAlertBudget, gcAlertBuckets } from "@/lib/mission-alerts";
import { clientKeyFromHeaders } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_USER_LEN = 200;
const USER_PATTERN = /^[\w.@+\-]{1,200}$/i;
const MAX_ID_LEN = 120;

export async function POST(req: NextRequest) {
  let body: { userEmail?: string; alertId?: string; read?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const userEmail = (body.userEmail || "").trim();
  const alertId = (body.alertId || "").trim();
  if (!userEmail || userEmail.length > MAX_USER_LEN || !USER_PATTERN.test(userEmail)) {
    return NextResponse.json({ ok: false, error: "userEmail required" }, { status: 400 });
  }
  if (!alertId || alertId.length > MAX_ID_LEN) {
    return NextResponse.json({ ok: false, error: "alertId required" }, { status: 400 });
  }

  gcAlertBuckets();
  const key = `inbox-read:${clientKeyFromHeaders(req.headers)}`;
  if (!consumeAlertBudget(key)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const read = body.read !== false; // default true
  const updated = await markAlertRead(userEmail, alertId, read).catch(() => false);
  return NextResponse.json({ ok: true, updated, read }, { status: 200 });
}

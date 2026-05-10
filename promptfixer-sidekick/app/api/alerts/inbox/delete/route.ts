/**
 * POST /api/alerts/inbox/delete
 *
 * Body: { userEmail: string, alertId: string }
 *
 * Removes one record. Idempotent — returns `{ deleted: false }` when the
 * record didn't exist. Lightly rate-limited per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteAlertRecord } from "@/lib/alert-inbox";
import { consumeAlertBudget, gcAlertBuckets } from "@/lib/mission-alerts";
import { clientKeyFromHeaders } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_USER_LEN = 200;
const USER_PATTERN = /^[\w.@+\-]{1,200}$/i;
const MAX_ID_LEN = 120;

export async function POST(req: NextRequest) {
  let body: { userEmail?: string; alertId?: string };
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
  const key = `inbox-del:${clientKeyFromHeaders(req.headers)}`;
  if (!consumeAlertBudget(key)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const deleted = await deleteAlertRecord(userEmail, alertId).catch(() => false);
  return NextResponse.json({ ok: true, deleted }, { status: 200 });
}

/**
 * GET /api/alerts/inbox?userEmail=...&limit=50
 *
 * Returns the latest Mission Alert records for the supplied user. Records
 * are written by lib/alert-dispatcher.ts whenever an alert is triggered
 * (regardless of whether Telegram was actually reachable) — this endpoint
 * is read-only.
 *
 * Never returns secrets, chat ids, or bot tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listAlertRecords,
  unreadAlertCount
} from "@/lib/alert-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_USER_LEN = 200;
const USER_PATTERN = /^[\w.@+\-]{1,200}$/i;

export async function GET(req: NextRequest) {
  const userEmail = (req.nextUrl.searchParams.get("userEmail") || "").trim();
  if (!userEmail || userEmail.length > MAX_USER_LEN || !USER_PATTERN.test(userEmail)) {
    return NextResponse.json(
      { ok: false, error: "userEmail required (≤200 chars, alphanum/. _ @ + -)" },
      { status: 400 }
    );
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 50);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.trunc(limitRaw))) : 50;

  try {
    const records = await listAlertRecords(userEmail, limit);
    const unread = await unreadAlertCount(userEmail);
    return NextResponse.json(
      { ok: true, records, unread, limit },
      { status: 200 }
    );
  } catch (err) {
    console.warn("[inbox/list]", (err as Error)?.message);
    return NextResponse.json({ ok: true, records: [], unread: 0, limit }, { status: 200 });
  }
}

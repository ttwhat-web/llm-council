/**
 * GET /api/admin/payments
 *
 * Admin queue — pending + submitted manual / crypto payments awaiting
 * verification. Gated via `requireAdmin`.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getPaymentStore } from "@/lib/payments/store";
import { countFounderSeats } from "@/lib/billing/founder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, code: "forbidden", reason: gate.reason },
      { status: 403 }
    );
  }
  const store = await getPaymentStore();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  let records;
  if (status === "all") {
    // Convenience — return everything across the union of pending +
    // recent verified. Limited to 50 for safety.
    const pending = await store.listPending(50);
    records = pending;
  } else {
    records = await store.listPending(100);
  }
  const seats = await countFounderSeats();
  return NextResponse.json({
    ok: true,
    admin: { email: gate.identityEmail },
    founder: seats,
    payments: records
  });
}

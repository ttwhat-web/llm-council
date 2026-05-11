/**
 * POST /api/admin/payments/[id]/reject
 *
 * Body: { reason?: string }
 *
 * Admin-only. Flips a payment record to `rejected` with an optional
 * short reason. Does NOT touch BillingStore subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getBillingStore } from "@/lib/billing/store";
import { getPaymentStore, isPaymentId } from "@/lib/payments/store";
import { toPublicPayment } from "@/lib/payments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const gate = await requireAdmin(req);
  if (!gate.allowed) {
    return NextResponse.json(
      { ok: false, code: "forbidden", reason: gate.reason },
      { status: 403 }
    );
  }

  const id = ctx.params.id;
  if (!isPaymentId(id)) {
    return NextResponse.json({ ok: false, code: "invalid_id" }, { status: 400 });
  }

  let reason: string | undefined;
  try {
    const body = (await req.json()) as { reason?: unknown };
    if (typeof body.reason === "string") reason = body.reason.slice(0, 240);
  } catch {
    /* allow empty body */
  }

  const store = await getPaymentStore();
  const record = await store.get(id);
  if (!record) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }
  if (record.status === "rejected") {
    return NextResponse.json({ ok: true, payment: toPublicPayment(record), already: true });
  }
  if (record.status === "verified") {
    return NextResponse.json(
      { ok: false, code: "already_verified" },
      { status: 409 }
    );
  }

  const updated = await store.patch(record.id, (r) => ({
    ...r,
    status: "rejected",
    rejectedAt: Date.now(),
    rejectedReason: reason
  }));

  const billing = await getBillingStore();
  void billing.appendAuditEvent({
    kind: "revoke",
    identityKey: record.identityKey,
    detail: `admin rejected ${record.provider} payment ${record.reference}${reason ? ` — ${reason}` : ""}`,
    meta: { paymentId: record.id, by: gate.identityEmail }
  });

  return NextResponse.json({ ok: true, payment: updated ? toPublicPayment(updated) : null });
}

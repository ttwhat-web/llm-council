/**
 * GET /api/payments/[id]
 *
 * Returns the public projection of a payment record. Owner sees status
 * + tx hash; strangers 404 (no probing).
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveUserIdentity } from "@/lib/billing/server";
import { getPaymentStore, isPaymentId } from "@/lib/payments/store";
import { toPublicPayment } from "@/lib/payments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = NextResponse.json(
  { ok: false, code: "not_found", message: "Payment not found." },
  { status: 404 }
);

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!isPaymentId(id)) return NOT_FOUND;

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getPaymentStore();
  const record = await store.get(id);
  if (!record) return attachToResponse(NOT_FOUND);
  if (record.identityKey !== identity.id) return attachToResponse(NOT_FOUND);

  return attachToResponse(
    NextResponse.json({ ok: true, payment: toPublicPayment(record) })
  );
}

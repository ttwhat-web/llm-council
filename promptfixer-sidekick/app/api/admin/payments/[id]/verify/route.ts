/**
 * POST /api/admin/payments/[id]/verify
 *
 * Admin-only. Confirms a submitted manual / crypto payment, grants the
 * matching plan via BillingStore, and appends an audit event.
 *
 * Idempotent: re-verifying an already-verified record is a no-op.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getBillingStore, newCustomerId, newSubscriptionId } from "@/lib/billing/store";
import { getPaymentStore, isPaymentId } from "@/lib/payments/store";
import { countFounderSeats } from "@/lib/billing/founder";
import { sendEmail } from "@/lib/email";
import { paymentVerifiedTemplate } from "@/lib/email/templates";
import { toPublicPayment } from "@/lib/payments/types";
import type { Subscription } from "@/lib/billing/store";

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

  const store = await getPaymentStore();
  const billing = await getBillingStore();

  const record = await store.get(id);
  if (!record) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }
  if (record.status === "verified") {
    return NextResponse.json({ ok: true, payment: toPublicPayment(record), already: true });
  }
  if (record.status === "rejected") {
    return NextResponse.json(
      { ok: false, code: "already_rejected" },
      { status: 409 }
    );
  }

  // Re-check founder cap at verify time: if the cap was hit by another
  // verification in flight, refuse cleanly instead of overshooting.
  if (record.plan === "founder_lifetime") {
    const seats = await countFounderSeats();
    if (seats.soldOut) {
      return NextResponse.json(
        {
          ok: false,
          code: "founder_sold_out",
          message: "Founder lifetime is fully claimed."
        },
        { status: 410 }
      );
    }
  }

  // 1) Mark the payment record verified.
  const verifiedRecord = await store.patch(record.id, (r) => ({
    ...r,
    status: "verified",
    verifiedAt: Date.now(),
    verifiedBy: gate.identityEmail
  }));
  if (!verifiedRecord) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }

  // 2) Grant the plan via BillingStore. Customer + Subscription upsert
  //    against the same identity that initiated the payment. Lifetime
  //    SKUs leave `currentPeriodEnd` undefined; recurring SKUs land at
  //    +30 / +365 days as a placeholder until provider webhooks take
  //    over their renewal lifecycle.
  const customer = await billing.upsertCustomer({
    id:
      (await billing.getCustomerByIdentity(verifiedRecord.identityKey))?.id ??
      newCustomerId(),
    identityKey: verifiedRecord.identityKey,
    email: verifiedRecord.email,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  const plan: Exclude<Subscription["plan"], never> =
    verifiedRecord.plan === "team_monthly" || verifiedRecord.plan === "team_annual"
      ? "team"
      : "pro";

  const now = Date.now();
  const periodEnd =
    verifiedRecord.plan === "founder_lifetime"
      ? undefined
      : verifiedRecord.plan.endsWith("annual")
        ? now + 365 * 24 * 60 * 60 * 1000
        : now + 30 * 24 * 60 * 60 * 1000;

  const subscription: Subscription = {
    id: newSubscriptionId(),
    customerId: customer.id,
    plan,
    status: "active",
    source:
      verifiedRecord.provider === "crypto_manual"
        ? "debug-grant"
        : verifiedRecord.provider === "paddle"
          ? "paddle"
          : verifiedRecord.provider === "lemon_squeezy"
            ? "lemon_squeezy"
            : "debug-grant",
    externalId: verifiedRecord.id,
    currentPeriodEnd: periodEnd,
    createdAt: now,
    updatedAt: now
  };
  await billing.upsertSubscription(subscription);

  void billing.appendAuditEvent({
    kind: "grant",
    identityKey: verifiedRecord.identityKey,
    customerId: customer.id,
    subscriptionId: subscription.id,
    plan,
    detail: `admin verified ${verifiedRecord.provider} payment ${verifiedRecord.reference}`,
    meta: { paymentId: verifiedRecord.id, by: gate.identityEmail }
  });

  // Activation email — fire and forget. Noop unless Resend is configured.
  if (verifiedRecord.email) {
    const tpl = paymentVerifiedTemplate({
      reference: verifiedRecord.reference,
      plan: verifiedRecord.plan,
      isFounder: verifiedRecord.plan === "founder_lifetime"
    });
    void sendEmail({ to: verifiedRecord.email, ...tpl });
  }

  return NextResponse.json({
    ok: true,
    payment: toPublicPayment(verifiedRecord),
    granted: { customerId: customer.id, subscriptionId: subscription.id, plan }
  });
}

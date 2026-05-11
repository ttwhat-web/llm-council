/**
 * POST /api/payments/crypto/submit
 *
 * Body: { paymentId, txHash, note? }
 *
 * Moves a `pending` PaymentRecord to `submitted` once the user reports
 * the transaction hash. Subsequent admin verification flips it to
 * `verified` (or `rejected`).
 *
 * Guards:
 *   - Caller must be the record's owner identity.
 *   - Rate-limit: billingMutation policy.
 *   - Duplicate tx hash submission (same identity, same hash) is
 *     dropped with 200 + already=true so the UI can retry safely.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  billingErrorResponse,
  requestExceedsSize,
  resolveUserIdentity,
  runBillingGate
} from "@/lib/billing/server";
import { getBillingStore } from "@/lib/billing/store";
import { getPaymentStore, isPaymentId } from "@/lib/payments/store";
import { redactSecrets } from "@/lib/missions/redact";
import { sendEmail } from "@/lib/email";
import { cryptoSubmittedTemplate } from "@/lib/email/templates";
import { getNetwork } from "@/lib/payments/crypto";
import { toPublicPayment } from "@/lib/payments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4 * 1024;

interface SubmitBody {
  paymentId?: unknown;
  txHash?: unknown;
  note?: unknown;
}

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Request body too large.", 413);
  }

  const gate = await runBillingGate(req, { rateLimit: "billingMutation" });
  if (!gate.ok) return gate.errorResponse!;

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return gate.attach(billingErrorResponse("invalid_json", "Invalid JSON body."));
  }

  if (!isPaymentId(body.paymentId)) {
    return gate.attach(billingErrorResponse("invalid_payment_id", "Unknown payment id."));
  }
  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";
  if (!txHash || txHash.length < 8 || txHash.length > 256) {
    return gate.attach(
      billingErrorResponse(
        "invalid_tx_hash",
        "Transaction hash must be 8–256 characters."
      )
    );
  }
  const note =
    typeof body.note === "string"
      ? redactSecrets(body.note).text.slice(0, 500)
      : undefined;

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getPaymentStore();
  const record = await store.get(body.paymentId);
  if (!record) {
    return attachToResponse(billingErrorResponse("not_found", "Payment not found.", 404));
  }
  if (record.identityKey !== identity.id) {
    // Don't leak the existence of other identities' payments.
    return attachToResponse(billingErrorResponse("not_found", "Payment not found.", 404));
  }
  if (record.provider !== "crypto_manual" && record.provider !== "local_manual") {
    return attachToResponse(
      billingErrorResponse(
        "wrong_provider",
        "This endpoint accepts manual / crypto payment submissions only."
      )
    );
  }
  if (record.status === "verified") {
    return attachToResponse(
      billingErrorResponse(
        "already_verified",
        "Payment is already verified — nothing to submit."
      )
    );
  }
  if (record.status === "rejected") {
    return attachToResponse(
      billingErrorResponse(
        "already_rejected",
        "Payment was rejected. Start a fresh checkout to retry."
      )
    );
  }

  // Duplicate tx hash idempotency.
  if (record.status === "submitted" && record.crypto?.txHash === txHash) {
    return attachToResponse(
      NextResponse.json({ ok: true, already: true, payment: toPublicPayment(record) })
    );
  }

  // Audit event lives in the BillingStore — keeps a single audit feed.
  const billing = await getBillingStore();

  const updated = await store.patch(record.id, (r) => ({
    ...r,
    status: "submitted",
    crypto: r.crypto
      ? { ...r.crypto, txHash, txNote: note }
      : { network: "n/a", address: "n/a", txHash, txNote: note }
  }));
  if (!updated) {
    return attachToResponse(billingErrorResponse("not_found", "Payment vanished.", 404));
  }

  void billing.appendAuditEvent({
    kind: "subscription-upserted",
    identityKey: identity.id,
    detail: `payment ${updated.reference} submitted (${updated.crypto?.network || updated.provider})`,
    meta: {
      paymentId: updated.id,
      reference: updated.reference,
      plan: updated.plan,
      txHash
    }
  });

  // Acknowledgement email — fire and forget. Noop provider when Resend
  // isn't configured, so this is safe in every environment.
  if (updated.email) {
    const network = updated.crypto?.network
      ? getNetwork(updated.crypto.network)
      : null;
    const tpl = cryptoSubmittedTemplate({
      reference: updated.reference,
      plan: updated.plan,
      networkLabel: network?.label || updated.crypto?.network || updated.provider,
      txHash
    });
    void sendEmail({ to: updated.email, ...tpl });
  }

  return attachToResponse(
    NextResponse.json({ ok: true, payment: toPublicPayment(updated) })
  );
}

/**
 * POST /api/payments/iyzico/callback
 *
 * Phase-11 stub. iyzico's actual callback shape depends on which Link
 * variant you wire (Iyzilink vs Checkout Form vs Checkout Form
 * Initialize). Real signatures use HMAC-SHA256 with the iyzico
 * secret-key + a concatenation of body fields — implement the parse +
 * verification per https://docs.iyzico.com/ when you turn it on.
 */

import { NextRequest } from "next/server";
import {
  handleProviderCallback,
  type NormalizedCallbackEvent
} from "@/lib/payments/callbackHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleProviderCallback(req, {
    provider: "iyzico",
    secretEnv: "IYZICO_CALLBACK_SECRET",
    signatureHeaders: ["x-iyz-signature-v3", "x-iyz-signature", "x-pf-signature"],
    parse(body): NormalizedCallbackEvent | null {
      const fields = parseLoose(body);
      const reference = fields.ref || fields.basketId || fields.conversationId;
      if (!reference) return null;
      const rawStatus = (fields.status || fields.paymentStatus || "").toLowerCase();
      const status =
        rawStatus === "success" || rawStatus === "paid" || rawStatus === "callback_threed_payment"
          ? "paid"
          : rawStatus === "failure" || rawStatus === "fail" || rawStatus === "error"
            ? "failed"
            : "pending";
      return {
        reference,
        externalId: fields.paymentId || fields.paymentTransactionId,
        status,
        reason: fields.errorMessage || fields.reason
      };
    }
  });
}

function parseLoose(body: string): Record<string, string> {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = typeof v === "string" || typeof v === "number" ? String(v) : "";
      }
      return out;
    }
  } catch {
    /* not JSON */
  }
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

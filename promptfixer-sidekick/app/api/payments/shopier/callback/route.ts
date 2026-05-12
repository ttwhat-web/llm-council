/**
 * POST /api/payments/shopier/callback
 *
 * Stub-shape Shopier callback. Real Shopier sends a POST form-encoded
 * body with fields like `platform_order_id`, `status`, `payment_id`,
 * `installment`, and a signature in `random_nr`. Replace the parse()
 * below with the real field names once you wire the API path; the
 * shared handler in `lib/payments/callbackHandler.ts` does the rest.
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
    provider: "shopier",
    secretEnv: "SHOPIER_CALLBACK_SECRET",
    signatureHeaders: ["x-shopier-signature", "x-pf-signature"],
    parse(body): NormalizedCallbackEvent | null {
      // Phase-11 stub: accept either JSON or form-urlencoded with a
      // `ref` (our reference) and `status` field. Real Shopier callback
      // posts form-encoded with `platform_order_id` carrying our ref
      // and `status` ∈ { "success", "fail" }.
      const fields = parseLoose(body);
      const reference = fields.ref || fields.platform_order_id || fields.merchant_oid;
      if (!reference) return null;
      const rawStatus = (fields.status || fields.payment_status || "").toLowerCase();
      const status =
        rawStatus === "success" || rawStatus === "paid"
          ? "paid"
          : rawStatus === "fail" || rawStatus === "failure" || rawStatus === "failed"
            ? "failed"
            : "pending";
      return {
        reference,
        externalId: fields.payment_id || fields.order_id,
        status,
        reason: fields.reason || fields.error_message
      };
    }
  });
}

function parseLoose(body: string): Record<string, string> {
  // Try JSON.
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
  // Form-urlencoded.
  const params = new URLSearchParams(body);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

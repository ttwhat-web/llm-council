/**
 * POST /api/payments/paytr/callback
 *
 * Phase-11 stub. PayTR's real callback verifies via
 *   hash = HMAC-SHA256(merchant_oid + merchant_salt + status + total_amount)
 * keyed with `merchant_key`. The shared handler hashes the raw body
 * with `PAYTR_CALLBACK_SECRET` as a generic stand-in until you wire
 * the real verifier inside this route.
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
    provider: "paytr",
    secretEnv: "PAYTR_CALLBACK_SECRET",
    signatureHeaders: ["x-paytr-signature", "x-pf-signature"],
    parse(body): NormalizedCallbackEvent | null {
      const fields = parseLoose(body);
      const reference = fields.ref || fields.merchant_oid;
      if (!reference) return null;
      const rawStatus = (fields.status || "").toLowerCase();
      const status =
        rawStatus === "success" || rawStatus === "paid"
          ? "paid"
          : rawStatus === "failed" || rawStatus === "fail"
            ? "failed"
            : "pending";
      return {
        reference,
        externalId: fields.merchant_oid || fields.payment_id,
        status,
        reason: fields.failed_reason_msg || fields.reason
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

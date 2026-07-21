/**
 * POST /api/billing/portal
 *
 * Returns a Stripe Customer Portal URL for the current identity. The
 * Customer Portal is where operators manage their subscription, change
 * cards, download invoices, cancel.
 *
 * Behaviour:
 *   - Stripe configured + caller has a Stripe customer recorded:
 *       → 200 { ok: true, url }
 *   - Stripe configured + caller has no Stripe customer:
 *       → 404 { ok: false, code: "no_subscription" }
 *   - Stripe not configured:
 *       → 503 { ok: false, code: "billing_not_configured" }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  billingErrorResponse,
  resolveUserIdentity,
  runBillingGate
} from "@/lib/billing/server";
import { getBillingStore } from "@/lib/billing/store";
import { appUrl, getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await runBillingGate(req, { rateLimit: "billingMutation" });
  if (!gate.ok) return gate.errorResponse!;

  const stripe = getStripe();
  if (!stripe) {
    return gate.attach(
      billingErrorResponse(
        "billing_not_configured",
        "Stripe is not configured on this deployment.",
        503
      )
    );
  }

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getBillingStore();
  const customer = await store.getCustomerByIdentity(identity.id);
  if (!customer || !customer.externalId) {
    return attachToResponse(
      billingErrorResponse(
        "no_subscription",
        "No Stripe customer is linked to this identity yet. Buy a plan first.",
        404
      )
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.externalId,
      return_url: `${appUrl()}/app?billing=portal-return`
    });
    return attachToResponse(
      NextResponse.json({ ok: true, url: session.url })
    );
  } catch (err) {
    const detail = (err as Error).message?.slice(0, 200);
    return attachToResponse(
      billingErrorResponse(
        "stripe_error",
        `Stripe portal request failed${detail ? `: ${detail}` : "."}`,
        502
      )
    );
  }
}

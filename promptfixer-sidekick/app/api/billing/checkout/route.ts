/**
 * POST /api/billing/checkout
 *
 * Body: { plan: "free" | "pro" | "team" | "enterprise" }
 *
 * Today this is a stub: it responds with `{ ok: true, mode: "stub" }`
 * and — when `BILLING_PROVIDER === "stub"` AND
 * `BILLING_DEV_OVERRIDE_SECRET` is configured — sets a signed dev
 * cookie so the rest of the system treats the caller as if they were
 * subscribed. There is NO payment processing.
 *
 * When real billing lands:
 *   - Wire `BILLING_PROVIDER === "stripe"` to call
 *     `stripe.checkout.sessions.create({...})` and return
 *     `{ ok: true, mode: "stripe", url }`.
 *   - The webhook (see ./webhook/route.ts) writes the resulting
 *     `customer_id → plan` mapping into KV.
 *   - `lib/billing/server.ts → resolvePlan` reads from that mapping
 *     ahead of the dev cookie.
 *
 * Free plan is always honoured — it just clears any active dev cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { isPlan } from "@/lib/billing/plans";
import {
  billingErrorResponse,
  billingMode,
  devOverrideEnabled,
  devOverrideMutationFor,
  requestExceedsSize,
  resolveUserIdentity,
  runBillingGate
} from "@/lib/billing/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;

export async function POST(req: NextRequest) {
  if (requestExceedsSize(req, MAX_BODY_BYTES)) {
    return billingErrorResponse("payload_too_large", "Request body too large.", 413);
  }

  // Cheap rate-limit: protects the cookie-mutation endpoint from
  // abusive loops even before payments land.
  const gate = await runBillingGate(req, { rateLimit: "billingMutation" });
  if (!gate.ok) return gate.errorResponse!;

  let body: { plan?: unknown };
  try {
    body = (await req.json()) as { plan?: unknown };
  } catch {
    return gate.attach(billingErrorResponse("invalid_json", "Invalid JSON body."));
  }

  if (!isPlan(body.plan)) {
    return gate.attach(billingErrorResponse("invalid_plan", "Unknown plan id."));
  }
  const requested = body.plan;

  const mode = billingMode();

  // Real provider wiring — explicitly NOT shipped yet. The route is
  // shaped so adding it is one switch.
  if (mode !== "stub") {
    return gate.attach(
      billingErrorResponse(
        "billing_not_configured",
        `Provider "${mode}" is selected but no checkout integration is wired in this build. Set BILLING_PROVIDER=stub for the dev override flow.`,
        503
      )
    );
  }

  // Free plan: clear any active dev override cookie and acknowledge.
  if (requested === "free") {
    const { identity, attachToResponse } = resolveUserIdentity(req);
    const ops = devOverrideMutationFor(identity, "free");
    return attachToResponse(
      ops.clear(
        NextResponse.json({
          ok: true,
          mode: "stub",
          plan: "free",
          message: "Dev override cleared.",
          nextAction: "reload"
        })
      )
    );
  }

  // Paid plans in stub mode: only proceed if the dev override flow is
  // explicitly enabled via BILLING_DEV_OVERRIDE_SECRET. Otherwise we
  // refuse with a clear message — never silently grant Pro.
  if (!devOverrideEnabled()) {
    return gate.attach(
      billingErrorResponse(
        "checkout_unavailable",
        "Dev override is disabled (BILLING_DEV_OVERRIDE_SECRET not set). " +
          "Configure a real provider or enable the dev override secret for local previews.",
        503
      )
    );
  }

  const { identity, attachToResponse } = resolveUserIdentity(req);
  const ops = devOverrideMutationFor(identity, requested);

  return attachToResponse(
    ops.apply(
      NextResponse.json({
        ok: true,
        mode: "stub",
        plan: requested,
        message:
          "Stub checkout — signed dev override applied. No payment was processed.",
        nextAction: "reload"
      })
    )
  );
}

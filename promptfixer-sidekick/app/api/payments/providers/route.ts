/**
 * GET /api/payments/providers
 *
 * Returns the dynamic provider list the UpgradeModal renders:
 *   - which providers are enabled (env configured)
 *   - which plans each accepts
 *   - founder seat snapshot (cap, claimed, remaining, soldOut) so the
 *     founder CTA can disable itself
 *
 * Always returns 200; an empty `enabled` set just means no payment
 * surface beyond the dev stub.
 */

import { NextResponse } from "next/server";
import { listProviderInfo } from "@/lib/payments/registry";
import { countFounderSeats } from "@/lib/billing/founder";
import { cryptoConfig } from "@/lib/payments/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = listProviderInfo();
  const seats = await countFounderSeats();
  const crypto = cryptoConfig();

  // Soldout founder lifetime: strip it from each provider's plan list
  // and surface a clean unavailableReason on the front end.
  const founderSoldOut = seats.soldOut;
  const sanitized = providers.map((p) => ({
    ...p,
    plans: founderSoldOut ? p.plans.filter((x) => x !== "founder_lifetime") : p.plans
  }));

  return NextResponse.json({
    ok: true,
    providers: sanitized,
    founder: seats,
    crypto: {
      enabled: crypto.enabled,
      networks: crypto.networks
        .filter((n) => n.enabled)
        .map((n) => ({ id: n.id, label: n.label, asset: n.asset }))
    }
  });
}

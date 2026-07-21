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
import { founderLaunchEnabled } from "@/lib/launchMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = listProviderInfo();
  const seats = await countFounderSeats();
  const crypto = cryptoConfig();
  const founderEnabled = founderLaunchEnabled();

  // Strip founder_lifetime from every provider's plans list when the
  // SKU is disabled by env (private beta phase) OR the cap is hit.
  const founderShouldHide = !founderEnabled || seats.soldOut;
  const sanitized = providers.map((p) => ({
    ...p,
    plans: founderShouldHide
      ? p.plans.filter((x) => x !== "founder_lifetime")
      : p.plans
  }));

  return NextResponse.json({
    ok: true,
    providers: sanitized,
    founder: { ...seats, enabled: founderEnabled },
    crypto: {
      enabled: crypto.enabled,
      networks: crypto.networks
        .filter((n) => n.enabled)
        .map((n) => ({ id: n.id, label: n.label, asset: n.asset }))
    }
  });
}

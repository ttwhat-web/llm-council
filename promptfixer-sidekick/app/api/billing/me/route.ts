/**
 * GET /api/billing/me
 *
 * Returns the caller's billing snapshot: identity, plan, quota,
 * features, source, mode. The UI hydrates the UsageMeter and
 * UpgradeModal from this. Anonymous callers get an auto-issued session
 * cookie so the server can keep counting their usage.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  billingMode,
  readBillingSnapshot,
  resolveUserIdentity
} from "@/lib/billing/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { identity, attachToResponse } = resolveUserIdentity(req);
  const snapshot = readBillingSnapshot(req, identity);

  // Don't leak the full opaque session id — return enough for the UI
  // to render but keep the cookie-issuance value private.
  const publicIdentity = {
    kind: snapshot.identity.kind,
    email: snapshot.identity.email,
    /** Short fingerprint used purely for "Server verified" display. */
    fingerprint: snapshot.identity.id.slice(0, 18)
  };

  return attachToResponse(
    NextResponse.json({
      ok: true,
      mode: billingMode(),
      identity: publicIdentity,
      plan: snapshot.plan,
      isPro: snapshot.isPro,
      source: snapshot.source,
      features: snapshot.features,
      quota: snapshot.usage
    })
  );
}

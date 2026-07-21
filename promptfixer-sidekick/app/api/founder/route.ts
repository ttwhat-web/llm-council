/**
 * GET /api/founder
 *
 * Public, cacheless. Returns the founder lifetime snapshot:
 *
 *   { ok: true,
 *     enabled: boolean,                  // FOUNDER_LAUNCH_ENABLED
 *     cap, claimed, remaining, soldOut } // from countFounderSeats()
 *
 * Read by the landing page + /pricing + UpgradeModal so they can all
 * render a live "X / 100 founder seats claimed" indicator without
 * shipping a server component into each surface.
 */

import { NextResponse } from "next/server";
import { countFounderSeats } from "@/lib/billing/founder";
import { founderLaunchEnabled } from "@/lib/launchMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const seats = await countFounderSeats();
  return NextResponse.json({
    ok: true,
    enabled: founderLaunchEnabled(),
    ...seats
  });
}

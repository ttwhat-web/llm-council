/**
 * /api/missions/[id]
 *
 *   GET   → return the receipt.
 *           - Owner: full record (including private metadata).
 *           - Anyone else: only the public projection AND only when
 *             `visibility === "shared"`. Otherwise 404.
 *   PATCH → mutate `visibility` (only). Owner only.
 *
 * 404s are deliberately indistinguishable between "doesn't exist" and
 * "exists but not shared and you aren't the owner" so private receipts
 * can't be probed.
 */

import { NextRequest, NextResponse } from "next/server";
import { billingErrorResponse, resolveUserIdentity } from "@/lib/billing/server";
import { getMissionStore, isMissionId } from "@/lib/missions/store";
import { toPublicReceipt, type MissionVisibility } from "@/lib/missions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = NextResponse.json(
  { ok: false, code: "not_found", message: "Mission receipt not found." },
  { status: 404 }
);

// ============================================================================
// GET
// ============================================================================

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!isMissionId(id)) return NOT_FOUND;

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getMissionStore();
  const receipt = await store.get(id);
  if (!receipt) return NOT_FOUND;

  if (receipt.ownerKey === identity.id) {
    return attachToResponse(NextResponse.json({ ok: true, receipt, owned: true }));
  }
  if (receipt.visibility === "shared") {
    return attachToResponse(
      NextResponse.json({ ok: true, receipt: toPublicReceipt(receipt), owned: false })
    );
  }
  return attachToResponse(NOT_FOUND);
}

// ============================================================================
// PATCH
// ============================================================================

interface PatchBody {
  visibility?: MissionVisibility;
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  if (!isMissionId(id)) return NOT_FOUND;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return billingErrorResponse("invalid_json", "Invalid JSON body.");
  }

  if (body.visibility !== "private" && body.visibility !== "shared") {
    return billingErrorResponse(
      "invalid_visibility",
      "visibility must be 'private' or 'shared'."
    );
  }

  const { identity, attachToResponse } = await resolveUserIdentity(req);
  const store = await getMissionStore();
  const existing = await store.get(id);
  if (!existing) return NOT_FOUND;
  if (existing.ownerKey !== identity.id) return attachToResponse(NOT_FOUND);

  const updated = await store.updateVisibility(id, body.visibility);
  if (!updated) return attachToResponse(NOT_FOUND);

  return attachToResponse(NextResponse.json({ ok: true, receipt: updated, owned: true }));
}

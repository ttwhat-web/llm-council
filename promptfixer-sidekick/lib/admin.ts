/**
 * Admin gate.
 *
 * Admin surfaces (`/admin/payments`, `/api/admin/payments/[id]/*`,
 * `/api/billing/debug`) are dev-only by default. Production access
 * requires both:
 *
 *   ENABLE_ADMIN_ROUTES=true
 *   ADMIN_EMAILS=ops@example.com,founder@example.com
 *
 * And a matching authenticated identity (Clerk email, lowercased).
 *
 * If `ENABLE_ADMIN_ROUTES` is false or the allowlist is empty,
 * production access is denied. Development access is always open so the
 * UI is testable without auth.
 */

import type { NextRequest } from "next/server";
import { resolveUserIdentity } from "./billing/server";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter((s) => /.+@.+\..+/.test(s));

const PRODUCTION_ADMIN_ENABLED =
  (process.env.ENABLE_ADMIN_ROUTES || "").toLowerCase() === "true";

export interface AdminGateResult {
  allowed: boolean;
  reason?: "dev_disabled" | "anonymous" | "not_in_allowlist" | "no_allowlist";
  identityEmail?: string;
}

export async function requireAdmin(req: NextRequest): Promise<AdminGateResult> {
  // Development: always allow. The UI is wide open so we can iterate.
  if (process.env.NODE_ENV !== "production") {
    const { identity } = await resolveUserIdentity(req);
    return { allowed: true, identityEmail: identity.email };
  }

  // Production: require explicit opt-in.
  if (!PRODUCTION_ADMIN_ENABLED) {
    return { allowed: false, reason: "dev_disabled" };
  }
  if (ADMIN_EMAILS.length === 0) {
    return { allowed: false, reason: "no_allowlist" };
  }
  const { identity } = await resolveUserIdentity(req);
  if (identity.kind !== "email" || !identity.email) {
    return { allowed: false, reason: "anonymous" };
  }
  const email = identity.email.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    return { allowed: false, reason: "not_in_allowlist" };
  }
  return { allowed: true, identityEmail: email };
}

/** Pure inspection — used by `/api/health/full`. */
export function adminEnvSnapshot() {
  return {
    productionAdminEnabled: PRODUCTION_ADMIN_ENABLED,
    allowlistCount: ADMIN_EMAILS.length
  };
}

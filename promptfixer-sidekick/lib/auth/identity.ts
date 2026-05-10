/**
 * Auth seam — the single function the billing layer calls to learn
 * "is this request authenticated, and if so as whom?".
 *
 * Today this is a stub:
 *   - In development with `ALLOW_DEV_USER_HEADER=true`, an
 *     `x-user-email` header is honoured.
 *   - Production NEVER trusts that header — anyone could send it.
 *   - Otherwise, returns `null`.
 *
 * Future integration is mechanical: add the relevant branch (Clerk
 * `auth()`, Auth.js `getServerSession`, JWT verifier) ahead of the dev
 * header. The rest of the system already prefers an authenticated user
 * over the dev-override cookie and the anonymous session, so flipping
 * this on is the only change needed to graduate the product to a
 * proper account model.
 */

import type { NextRequest } from "next/server";

export interface AuthenticatedUser {
  /**
   * Stable opaque identifier the rest of the system uses as
   * `Identity.id`. Format: "email:<lowercased email>" today; will
   * become "auth:<provider-user-id>" when a real provider lands.
   */
  id: string;
  email: string;
  /** How the identity was established. Renders in /api/billing/me. */
  source: "dev-header" | "clerk" | "auth-js" | "jwt";
}

export async function resolveAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  // 1. (Future) Clerk
  //    const { userId, sessionClaims } = auth();
  //    if (userId) return { id: `auth:${userId}`, email: sessionClaims?.email, source: "clerk" };

  // 2. (Future) Auth.js / NextAuth
  //    const session = await getServerSession(authOptions);
  //    if (session?.user?.email) return { id: `auth:${session.user.id}`, email: session.user.email, source: "auth-js" };

  // 3. (Future) JWT verifier
  //    const payload = await verifyJwt(req.headers.get("authorization"));
  //    if (payload?.sub) return { id: `auth:${payload.sub}`, email: payload.email, source: "jwt" };

  // 4. Dev-only header. Production NEVER honours this — even if
  //    ALLOW_DEV_USER_HEADER were accidentally set in prod env, the
  //    NODE_ENV check below shuts it down.
  if (process.env.NODE_ENV !== "production") {
    if ((process.env.ALLOW_DEV_USER_HEADER || "").toLowerCase() === "true") {
      const raw = req.headers.get("x-user-email");
      const email = (raw || "").trim().toLowerCase();
      if (email && /.+@.+\..+/.test(email)) {
        return { id: `email:${email}`, email, source: "dev-header" };
      }
    }
  }

  return null;
}

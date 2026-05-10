/**
 * Auth seam — the single function the billing layer calls to learn
 * "is this request authenticated, and if so as whom?".
 *
 * Resolution order:
 *   1. Clerk session (when @clerk/nextjs is configured AND the
 *      request carries a valid session). Production identity.
 *   2. Dev `x-user-email` header — only when
 *      `NODE_ENV !== "production"` AND `ALLOW_DEV_USER_HEADER=true`.
 *      Strictly for local testing.
 *   3. null → caller is anonymous; the upstream resolver falls back
 *      to a session cookie identity.
 *
 * Future Auth.js / JWT branches go in the same file ahead of the
 * dev-header. Routes never need to change.
 */

import type { NextRequest } from "next/server";

export interface AuthenticatedUser {
  /** Stable opaque identifier the rest of the system uses as
   *  `Identity.id`. Format: `auth:<provider-user-id>` for real auth,
   *  `email:<lowercased>` for the dev header. */
  id: string;
  email: string;
  source: "clerk" | "dev-header" | "auth-js" | "jwt";
}

const CLERK_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export async function resolveAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  // 1. Clerk — only attempted when keys are configured. The dynamic
  //    import keeps Clerk out of the bundle when it isn't wired.
  if (CLERK_ENABLED) {
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const session = auth();
      if (session?.userId) {
        // currentUser() makes a network call; only do it when we have
        // a session id, and tolerate failures (return id-only user).
        let email: string | undefined;
        try {
          const u = await currentUser();
          email =
            u?.primaryEmailAddress?.emailAddress ??
            u?.emailAddresses?.[0]?.emailAddress;
        } catch {
          /* fall through with no email */
        }
        return {
          id: `auth:${session.userId}`,
          email: email ?? `${session.userId}@clerk.local`,
          source: "clerk"
        };
      }
    } catch {
      // Clerk middleware not on the request? Treat as anonymous;
      // never fail closed.
    }
  }

  // 2. Dev-only header. Production NEVER honours this.
  if (process.env.NODE_ENV !== "production") {
    if ((process.env.ALLOW_DEV_USER_HEADER || "").toLowerCase() === "true") {
      const raw = req.headers.get("x-user-email");
      const email = (raw || "").trim().toLowerCase();
      if (email && /.+@.+\..+/.test(email)) {
        return { id: `email:${email}`, email, source: "dev-header" };
      }
    }
  }

  // 3. Anonymous — caller falls back to session cookie identity.
  return null;
}

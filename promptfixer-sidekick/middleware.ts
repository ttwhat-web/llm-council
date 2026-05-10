/**
 * Clerk middleware — Phase 6.
 *
 * Wired in permissive mode: every route remains anonymous-accessible.
 * The middleware exists so `auth()` is available inside route handlers
 * and Server Components — that's how `lib/auth/identity.ts` reads the
 * authenticated user. Anonymous Mission Control stays free, Stripe /
 * webhook / debug routes keep their own gating.
 */

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Run on app routes; skip Next internals + static assets.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)"
  ]
};

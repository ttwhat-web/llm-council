/**
 * Clerk middleware — Phase 6, hardened for dev-without-keys in Phase 11.
 *
 * When `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are
 * both set, we run Clerk's middleware so `auth()` is available inside
 * route handlers and Server Components. When either is missing
 * (local dev, anonymous preview deploys, the marketing site without
 * auth), the middleware degrades to a pure passthrough — every route
 * stays accessible and the rest of the app already handles "no Clerk"
 * gracefully (see `lib/auth/identity.ts` + `components/UserMenu.tsx`).
 *
 * Wired in permissive mode either way: every route remains
 * anonymous-accessible by design.
 */

import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const HAS_CLERK = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

// We can safely call `clerkMiddleware()` at module load when keys are
// present — the resulting handler only consults env when invoked. When
// keys are missing we skip construction entirely so Clerk's runtime
// error never fires.
const clerkHandler = HAS_CLERK ? clerkMiddleware() : null;

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (clerkHandler) return clerkHandler(req, event);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on app routes; skip Next internals + static assets.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)"
  ]
};

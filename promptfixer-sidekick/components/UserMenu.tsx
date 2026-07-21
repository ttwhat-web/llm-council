"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

/**
 * Top-right account chip.
 *
 * - When Clerk is configured AND the user is signed in: Clerk's
 *   `<UserButton />` (avatar, sign-out, manage account).
 * - When Clerk is configured AND the user is anonymous: a discreet
 *   "Sign in" / "Start free" pair.
 * - When Clerk isn't configured at all: render nothing — Mission
 *   Control still works anonymously, anonymous quota still applies.
 *
 * The component is `"use client"` so it can read the public flag at
 * render time without forcing the whole header to be a client tree.
 */

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function UserMenu({ compact }: { compact?: boolean }) {
  if (!CLERK_ENABLED) return null;
  return (
    <div className="flex items-center gap-1.5">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="no-drag inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            <LogIn className="h-3 w-3" />
            Sign in
          </button>
        </SignInButton>
        {!compact && (
          <SignUpButton mode="modal">
            <button
              type="button"
              className="no-drag inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2 py-1 text-[11px] font-semibold text-white shadow-glow transition hover:bg-accent"
            >
              Start free
            </button>
          </SignUpButton>
        )}
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox:
                "h-7 w-7 rounded-md ring-1 ring-white/10 hover:ring-accent/50 transition"
            }
          }}
          afterSignOutUrl="/"
        />
      </SignedIn>
      {/* Subtle entry to /app for signed-out marketing users. Hidden on the
          app surface itself — there's no useful destination from /app. */}
      <SignedOut>
        <Link
          href="/app"
          className="hidden text-[10px] uppercase tracking-[0.18em] text-white/30 hover:text-white/55 sm:inline"
        >
          /app →
        </Link>
      </SignedOut>
    </div>
  );
}

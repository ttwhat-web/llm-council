import type { ReactNode } from "react";
import Link from "next/link";
import { LaunchBadge } from "@/components/LaunchBadge";
import { OperatorMobileNav } from "@/components/OperatorMobileNav";
import { OperatorRail } from "@/components/OperatorRail";
import { UserMenu } from "@/components/UserMenu";

/**
 * Operator.Center shell.
 *
 * Wraps the five operator surfaces (Mission Control, Library, Memory,
 * Terminal, Settings) with the persistent nav rail on desktop + a
 * bottom tab bar on mobile. Marketing pages keep their own
 * MarketingShell — this layout is intentionally separate.
 */

export default function OperatorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-bg">
      <OperatorRail />
      <div className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-ink-950/70 px-4 py-2 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="group inline-flex items-center font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/75 transition hover:text-white"
            >
              operator
              <span className="text-white/45 transition group-hover:text-accent">.center</span>
            </Link>
            <span aria-hidden className="h-3 w-px bg-white/10" />
            <LaunchBadge compact />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/launch"
              className="hidden rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/85 transition hover:border-accent/35 hover:bg-accent/[0.08] hover:text-accent md:inline-block"
            >
              Launch readiness
            </Link>
            <UserMenu compact />
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
      <OperatorMobileNav />
    </div>
  );
}

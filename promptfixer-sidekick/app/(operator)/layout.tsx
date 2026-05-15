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
        <header className="flex items-center justify-between gap-3 border-b border-white/6 bg-white/[0.012] px-4 py-2 md:px-6">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 transition hover:text-white/80"
            >
              operator<span className="text-white/30">.center</span>
            </Link>
            <LaunchBadge compact />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/launch"
              className="hidden rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08] md:inline-block"
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

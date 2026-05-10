import Link from "next/link";
import type { ReactNode } from "react";
import { UserMenu } from "./UserMenu";

/**
 * Shared shell for every marketing / legal page.
 *
 * Owns the header (wordmark + nav + user menu) and the footer. Pages
 * pass their content as `children`. Visual language matches the app
 * surface so the marketing pages don't feel like a different product.
 */

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[1100px] flex-col px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 ring-1 ring-accent/30 shadow-glow">
            <span className="font-mono text-[11px] tracking-wider text-accent">[ ]</span>
          </span>
          <span className="font-mono text-[12px] tracking-tight text-white">
            operator<span className="text-white/40">.center</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 md:gap-5">
          <Link
            href="/pricing"
            className="text-[12px] text-white/65 transition hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/security"
            className="hidden text-[12px] text-white/65 transition hover:text-white sm:inline"
          >
            Security
          </Link>
          <Link
            href="/app"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white/85 transition hover:bg-white/[0.08]"
          >
            Open Mission Control →
          </Link>
          <UserMenu compact />
        </nav>
      </header>

      <main className="flex flex-1 flex-col gap-12 py-12 md:py-16">{children}</main>

      <footer className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 text-[11px] text-white/50 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-white/35">[ ]</span>
          <span>operator.center · operate, don&apos;t prompt.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/pricing" className="hover:text-white/85">
            Pricing
          </Link>
          <Link href="/security" className="hover:text-white/85">
            Security
          </Link>
          <Link href="/privacy" className="hover:text-white/85">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white/85">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

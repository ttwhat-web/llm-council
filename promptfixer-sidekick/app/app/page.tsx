import { Suspense } from "react";
import Link from "next/link";
import { PromptFixer } from "@/components/PromptFixer";
import { UserMenu } from "@/components/UserMenu";
import { MissionToast } from "@/components/MissionToast";

/**
 * Mission Control surface — operator.center / app.
 *
 * The marketing landing lives at `/`; this is the working operator
 * console. Anonymous visitors run on the free quota (server-enforced
 * via the BillingStore), authenticated visitors get the plan their
 * Stripe subscription resolves to.
 */

export default function AppPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40 transition hover:text-white/70"
        >
          <span className="font-mono text-accent">[ ]</span>
          <span>operator.center · mission control</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/floating"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Open floating →
          </Link>
          <UserMenu />
        </div>
      </nav>

      <div className="glass min-h-[720px] rounded-3xl">
        <PromptFixer variant="web" />
      </div>

      {/* Reads ?billing=success|cancel|portal-return and toasts; clears the
          query param via router.replace so reloads don't re-fire. Wrapped
          in Suspense because it depends on useSearchParams. */}
      <Suspense fallback={null}>
        <MissionToast />
      </Suspense>
    </main>
  );
}

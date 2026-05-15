import { Suspense } from "react";
import { MissionToast } from "@/components/MissionToast";
import { PromptFixer } from "@/components/PromptFixer";

/**
 * Mission Control — the working operator console.
 *
 * Anonymous visitors run on the free quota (server-enforced via the
 * BillingStore); authenticated visitors get the plan their Stripe /
 * Lemon Squeezy subscription resolves to. The 3-column HUD lives in
 * `<PromptFixer variant="web" />` — that component owns its own
 * internal layout and is unchanged by this slice.
 */

export const metadata = {
  title: "Mission Control · operator.center",
  description: "Mission Control for AI Workflows. You stop pasting. You dispatch."
};

export default function MissionControlPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <div className="glass min-h-[720px] rounded-3xl">
        <PromptFixer variant="web" />
      </div>

      {/* Reads ?billing=success|cancel|portal-return and toasts; clears the
          query param via router.replace so reloads don't re-fire. Wrapped
          in Suspense because it depends on useSearchParams. */}
      <Suspense fallback={null}>
        <MissionToast />
      </Suspense>
    </div>
  );
}

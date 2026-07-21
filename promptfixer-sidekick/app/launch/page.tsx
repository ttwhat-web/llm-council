import { LaunchChecklistClient } from "@/components/LaunchChecklistClient";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = { title: "Launch checklist · operator.center" };
export const dynamic = "force-dynamic";

/**
 * /launch — internal-but-public launch readiness checklist.
 *
 * Reads /api/health/full and renders each environment + provider as a
 * checkbox. Safe to publish: the underlying endpoint reports presence
 * (boolean) only, never values.
 */

export default function LaunchPage() {
  return (
    <MarketingShell>
      <LaunchChecklistClient />
    </MarketingShell>
  );
}

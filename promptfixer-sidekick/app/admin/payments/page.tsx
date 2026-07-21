import { AdminPaymentsClient } from "@/components/AdminPaymentsClient";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = { title: "Admin · payments · operator.center" };
export const dynamic = "force-dynamic";

/**
 * /admin/payments — manual / crypto verification queue.
 *
 * The page renders the shell; the client component fetches data from
 * /api/admin/payments. The admin gate is enforced server-side on those
 * routes (development → wide open; production → ADMIN_EMAILS allowlist),
 * so this page is safe to ship in the public bundle.
 */

export default function AdminPaymentsPage() {
  return (
    <MarketingShell>
      <AdminPaymentsClient />
    </MarketingShell>
  );
}

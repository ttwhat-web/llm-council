import { OperatorPageHeader } from "@/components/OperatorPageHeader";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata = {
  title: "Settings · operator.center",
  description: "Routing, models, integrations, workspace, billing."
};

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <OperatorPageHeader
        eyebrow="settings · runtime configuration"
        title="Operator settings"
        sub="Live diagnostics pulled from /api/health/full. No toggles that aren't wired — every row maps to an env var on the server."
      />
      <SettingsClient />
    </div>
  );
}

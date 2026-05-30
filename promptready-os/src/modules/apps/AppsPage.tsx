"use client";

import { AppWindow, ExternalLink, ShieldCheck } from "lucide-react";
import { WebAppsPanel } from "@/components/MediaDock";

export default function AppsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] min-w-0 flex-col gap-3 overflow-hidden px-4 py-4">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
            <AppWindow className="h-3.5 w-3.5" />
            apps · web workspace
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-white">App Dock</h1>
          <p className="max-w-2xl text-[12px] leading-snug text-white/55">
            Launch official web apps in persistent browser/app windows. Provider logins stay in those windows; Operator.Center does not iframe blocked apps or store credentials.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-white/48">
          <ShieldCheck className="h-3 w-3 text-emerald-300" />
          external only
          <span className="text-white/18">·</span>
          <ExternalLink className="h-3 w-3 text-accent" />
          browser session persists
        </div>
      </header>

      <div className="grid min-h-0 max-w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
        <WebAppsPanel className="min-h-0 min-w-0 max-w-full overflow-hidden" />

        <aside className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.018] p-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/42">
            app workspace
          </span>
          <div className="grid min-w-0 gap-1.5">
            <InfoPanel
              title="session model"
              rows={[
                ["launch", "external tab/window"],
                ["login", "provider browser session"],
                ["storage", "recent URLs in localStorage"],
                ["credentials", "not stored"]
              ]}
            />
            <InfoPanel
              title="provider limits"
              rows={[
                ["Gmail", "no iframe · external only"],
                ["WhatsApp", "QR/login stays with provider"],
                ["Telegram", "web app separate from bot bridge"],
                ["TradingView", "external workspace"]
              ]}
            />
            <InfoPanel
              title="dashboard links"
              rows={[
                ["Market Lab", "internal canvas chart"],
                ["Server", "desktop SSH bridge required"],
                ["Settings", "providers and workspace"],
                ["Atlas", "local workspace home"]
              ]}
            />
          </div>
          <p className="mt-auto rounded-md border border-dashed border-white/10 bg-black/20 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-white/38">
            custom URLs are stored as recent launchers in localStorage only. No web app is embedded or proxied.
          </p>
        </aside>
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  rows
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5 rounded-md border border-white/8 bg-white/[0.012] p-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-accent/85">{title}</span>
      <div className="grid gap-1">
        {rows.map(([label, value]) => (
          <div key={label} className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-2 font-mono text-[10px]">
            <span className="uppercase tracking-wider text-white/42">{label}</span>
            <span className="min-w-0 truncate text-white/68">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { AppWindow, ExternalLink, QrCode, ShieldCheck } from "lucide-react";
import { WebAppsPanel } from "@/components/MediaDock";

export default function AppsPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1440px] min-w-0 flex-col gap-3 overflow-hidden px-4 py-4">
      <header className="flex max-w-full min-w-0 flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-accent">
            <AppWindow className="h-3.5 w-3.5" />
            apps · web launcher
          </span>
          <h1 className="text-[22px] font-semibold leading-tight text-white">Apps</h1>
          <p className="max-w-2xl text-[12px] leading-snug text-white/55">
            One-click launchers for Gmail, WhatsApp, Telegram, YouTube, TradingView, and any custom web app. Every launch opens an official browser tab — no iframes, no embedded fakes, no stored credentials.
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

      <div className="grid min-h-0 max-w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]">
        <WebAppsPanel className="min-h-0 min-w-0 max-w-full overflow-hidden" />

        <aside className="flex min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.018] p-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/42">how it works</span>
          <ul className="flex flex-col gap-1.5 text-[11.5px] leading-snug text-white/72">
            <li className="flex items-start gap-1.5">
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              <span>Clicking a tile opens the official web app in a new tab or window.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-300" />
              <span>Logins live in your browser — Operator.Center never sees credentials.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <AppWindow className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              <span>Recent launches and custom URLs are saved to local storage only.</span>
            </li>
          </ul>
          <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-white/10 bg-black/30 p-2">
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200/85">
              <QrCode className="h-3 w-3" />
              QR login · WhatsApp & Telegram
            </span>
            <p className="text-[10.5px] leading-snug text-white/65">
              WhatsApp Web and Telegram Web ask you to scan a QR code from your phone the first time. Keep the tab open and the session stays logged in until your phone signs it out.
            </p>
          </div>
          <p className="mt-auto rounded-md border border-dashed border-white/10 bg-black/20 px-2 py-2 font-mono text-[9.5px] uppercase tracking-wider text-white/38">
            need a tile you don&apos;t see? paste any https:// URL in the custom field — it&apos;s saved to recents.
          </p>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ArrowDown,
  Download,
  Loader2,
  Package,
  RotateCcw
} from "lucide-react";
import { downloadDiagnostics } from "@/services/diagnostics";

/**
 * Release Center · Phase 20.
 *
 * Shows the current build channel + version, when the app was last
 * updated, and a couple of operator actions (export logs, rollback
 * placeholder). Channel choice is persisted to localStorage; the
 * actual update-feed wiring lives in the desktop runtime.
 */

type Channel = "dev" | "beta" | "stable";

const APP_VERSION = "0.1.0";
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const CHANNEL_KEY = "promptready-os.release-channel";

function loadChannel(): Channel {
  if (typeof window === "undefined") return "dev";
  try {
    const raw = window.localStorage.getItem(CHANNEL_KEY);
    if (raw === "beta" || raw === "stable" || raw === "dev") return raw;
  } catch {
    // ignore
  }
  return "dev";
}

function saveChannel(c: Channel) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHANNEL_KEY, c);
  } catch {
    // ignore
  }
}

export function ReleaseCenter() {
  const [channel, setChannel] = useState<Channel>(() => loadChannel());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const onChannel = (c: Channel) => {
    setChannel(c);
    saveChannel(c);
    setFlash(`Channel set to ${c} · next update pulls from this feed`);
    window.setTimeout(() => setFlash(null), 3500);
  };

  const onExportLogs = () => {
    setBusy(true);
    try {
      const filename = downloadDiagnostics();
      setFlash(`logs saved · ${filename}`);
    } finally {
      setBusy(false);
      window.setTimeout(() => setFlash(null), 3500);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Release center</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {channel}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="version" value={APP_VERSION} />
        <Stat label="build date" value={BUILD_DATE} />
        <Stat label="channel" value={channel} />
        <Stat label="last update" value="—" hint="updater ships with desktop runtime" />
      </div>

      <div className="mt-3">
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          channel
        </div>
        <div className="flex items-center gap-1">
          {(["dev", "beta", "stable"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChannel(c)}
              className={
                channel === c
                  ? "rounded border border-accent/40 bg-accent/[0.1] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-accent"
                  : "rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          title="rollback feed ships with desktop updater"
          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/45"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Rollback
        </button>
        <button
          type="button"
          onClick={onExportLogs}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/85 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export logs
        </button>
        <a
          href="https://github.com/ttwhat-web/llm-council/releases"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/85 hover:bg-white/[0.06]"
        >
          <ArrowDown className="h-3.5 w-3.5" /> Open GitHub Releases
        </a>
      </div>

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">{label}</span>
      <span className="text-[12.5px] font-semibold text-white">{value}</span>
      {hint && (
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">{hint}</span>
      )}
    </div>
  );
}

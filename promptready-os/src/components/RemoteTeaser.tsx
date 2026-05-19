"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, BellRing, CheckCircle2, Phone, Radio } from "lucide-react";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";
import { readPresence, type PresenceSnapshot } from "@/services/presence";
import { getTelegramBridgeStatus } from "@/services/telegramLive";

/**
 * Remote teaser · UX RESET 04.
 *
 * Surfaces the operator's remote runtime even when Telegram or mobile
 * are not yet live. Four cells map to real counters:
 *
 *   · Presence   · desktop · ollama · workflow rollup
 *   · Approvals  · workflowRuns awaiting-approval
 *   · Receipts   · mission history shipped
 *   · Alerts     · intelligence-terminal alerts armed
 *
 * Status pill at the top reflects the actual telegram live state. We
 * never claim a remote link when no real round-trip has succeeded.
 */

export function RemoteTeaser() {
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const history = useMissionStore((s) => s.history);
  const link = useAtlasStore((s) => s.telegram);

  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);
  useEffect(() => {
    setPresence(readPresence());
    const t = window.setInterval(() => setPresence(readPresence()), 3500);
    return () => window.clearInterval(t);
  }, []);

  const tg = getTelegramBridgeStatus();
  const liveLabel = tgLabel(tg.live);
  const liveTone = tgTone(tg.live);

  const approvals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;
  const receipts = history.length;
  const alertCount = readAlertsCount();
  const presenceDesktop = presence?.desktop ?? "online";
  const presenceOllama = presence?.ollama ?? "unknown";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Phone is the Remote</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            liveTone
          )}
        >
          {liveLabel}
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Approvals, receipts, presence, alerts — everything the desktop watches is
        ready to mirror to a remote runtime. Until a real round-trip
        succeeds, status stays honest.
      </p>

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Cell
          Icon={Radio}
          label="Presence"
          value={`${presenceDesktop} · ${presenceOllama}`}
          hint="desktop · ollama probe"
        />
        <Cell
          Icon={CheckCircle2}
          label="Approvals"
          value={String(approvals)}
          hint={approvals === 0 ? "queue empty" : "awaiting tap"}
          tone={approvals > 0 ? "warn" : undefined}
        />
        <Cell
          Icon={BellRing}
          label="Receipts"
          value={String(receipts)}
          hint="archived missions"
        />
        <Cell
          Icon={AlertTriangle}
          label="Alerts"
          value={String(alertCount)}
          hint={alertCount === 0 ? "no rules armed" : "intel terminal"}
          tone={alertCount > 0 ? "warn" : undefined}
        />
      </ul>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        <span>{link ? `link code · ${link.code}` : "no link code yet"}</span>
        <span>{tg.source === "none" ? "no bot token configured" : `token · ${tg.source}`}</span>
      </footer>
    </section>
  );
}

function Cell({
  Icon,
  label,
  value,
  hint,
  tone
}: {
  Icon: typeof Phone;
  label: string;
  value: string;
  hint: string;
  tone?: "warn";
}) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={clsx("h-3 w-3", tone === "warn" ? "text-amber-300" : "text-accent")} />
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
          {label}
        </span>
      </div>
      <span
        className={clsx(
          "font-mono text-[14px] tabular-nums",
          tone === "warn" ? "text-amber-200" : "text-white"
        )}
      >
        {value}
      </span>
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
        {hint}
      </span>
    </li>
  );
}

function tgLabel(live: string): string {
  switch (live) {
    case "live-connected":
      return "live · connected";
    case "live-ready":
      return "live · ready";
    case "error":
      return "live · error";
    default:
      return "simulator";
  }
}

function tgTone(live: string): string {
  switch (live) {
    case "live-connected":
      return "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200";
    case "live-ready":
      return "border-accent/30 bg-accent/[0.08] text-accent";
    case "error":
      return "border-rose-400/30 bg-rose-500/[0.08] text-rose-200";
    default:
      return "border-white/10 bg-white/[0.03] text-white/55";
  }
}

function readAlertsCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal.alerts");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

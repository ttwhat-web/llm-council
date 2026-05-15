"use client";

import clsx from "clsx";
import {
  Activity,
  Clock,
  Cpu,
  Gauge,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import type { FixResponse } from "@/lib/types";

/**
 * Compact Mission Receipt panel.
 *
 * Rendered above the OutputTabs once a mission completes. Every value
 * comes from the real `FixResponse` (no synthetic state). The component
 * is read-only — Save / Share / Copy / Export live in the surrounding
 * panels (ReceiptStrip + ExportMenu).
 */

interface Props {
  result: FixResponse;
  /** Local receipt id assigned at save time. Optional. */
  receiptId?: string | null;
  /** ISO / epoch ms when the mission landed. Optional; defaults to now. */
  createdAt?: number;
  compact?: boolean;
}

export function MissionReceipt({ result, receiptId, createdAt, compact }: Props) {
  const ts = createdAt ?? Date.now();
  const safetyBlocked = Boolean(result.safety?.blocked);
  const safetyFindings = result.safety?.findings?.length ?? 0;
  const supervisorLatency = result.supervisor?.latencyMs;
  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/8 bg-white/[0.02]",
        compact ? "p-2.5" : "p-3"
      )}
    >
      <header className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            Mission Receipt
          </span>
          {receiptId && (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
              {receiptId.replace(/^r_/, "").slice(0, 10)}
            </span>
          )}
        </div>
        <span
          className="font-mono text-[9px] uppercase tracking-wider text-white/35"
          title={new Date(ts).toISOString()}
        >
          {formatRelative(ts)}
        </span>
      </header>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        <Cell
          Icon={Activity}
          label="mode"
          value={result.mode}
          mono
        />
        <Cell
          Icon={Gauge}
          label="quality"
          value={result.modelQuality}
          mono
        />
        <Cell
          Icon={Cpu}
          label="route"
          value={result.supervisor?.resolved ?? "—"}
          mono
          tone={result.supervisor?.fallbackUsed ? "warn" : "ok"}
        />
        <Cell
          Icon={Clock}
          label="latency"
          value={
            typeof supervisorLatency === "number"
              ? `${supervisorLatency}ms`
              : `${result.elapsedMs}ms`
          }
          mono
        />
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
        <ScorePill label="clarity" value={result.score.clarity} />
        <ScorePill label="spec" value={result.score.specificity} />
        <ScorePill label="safety" value={result.score.safety} />
        <ScorePill label="fit" value={result.score.modelFit} />
        <SafetyPill blocked={safetyBlocked} findings={safetyFindings} />
        {result.supervisor?.model && (
          <span
            className="ml-auto truncate font-mono text-[9px] uppercase tracking-wider text-white/35"
            title={result.supervisor.model}
          >
            {result.supervisor.model}
          </span>
        )}
      </div>
    </section>
  );
}

// ---------- cells ---------------------------------------------------------

function Cell({
  Icon,
  label,
  value,
  mono,
  tone
}: {
  Icon: typeof Activity;
  label: string;
  value: string;
  mono?: boolean;
  tone?: "ok" | "warn";
}) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon
        className={clsx(
          "h-3 w-3 shrink-0",
          tone === "warn" ? "text-amber-300" : "text-white/45"
        )}
      />
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span
        className={clsx(
          "ml-auto truncate text-[11px] text-white/85",
          mono && "font-mono",
          tone === "warn" && "text-amber-200"
        )}
      >
        {value}
      </span>
    </li>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone =
    value >= 80
      ? "border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200"
      : value >= 60
        ? "border-accent/30 bg-accent/[0.06] text-accent"
        : value >= 40
          ? "border-amber-400/30 bg-amber-500/[0.06] text-amber-200"
          : "border-rose-400/30 bg-rose-500/[0.06] text-rose-200";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
        tone
      )}
    >
      {label}
      <span className="text-white">{value}</span>
    </span>
  );
}

function SafetyPill({ blocked, findings }: { blocked: boolean; findings: number }) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-rose-200">
        <ShieldAlert className="h-3 w-3" />
        blocked
      </span>
    );
  }
  if (findings > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-400/35 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-amber-200">
        <ShieldAlert className="h-3 w-3" />
        {findings} {findings === 1 ? "finding" : "findings"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200">
      <ShieldCheck className="h-3 w-3" />
      clear
    </span>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


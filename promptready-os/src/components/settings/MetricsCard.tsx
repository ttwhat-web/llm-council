"use client";

/**
 * Metrics · the numbers, not the guesses.
 *
 * Surfaces the single KPI — approval without edit — plus the funnel it
 * comes from. If founders approve drafts without editing, Operator is
 * good enough and memory is the next lever. If they edit constantly,
 * draft quality is the bottleneck. This card is how we know which.
 *
 * Local-only. Export dumps the raw event log for offline analysis.
 */

import { useCallback } from "react";
import { BarChart3, Download, Trash2 } from "lucide-react";
import { useMetricsStore } from "@/store/metrics";

export function MetricsCard() {
  const events = useMetricsStore((s) => s.events);
  const aggregates = useMetricsStore((s) => s.aggregates);
  const exportJson = useMetricsStore((s) => s.exportJson);
  const reset = useMetricsStore((s) => s.reset);
  const a = aggregates();

  const kpi = a.approvalWithoutEditRate;
  const kpiPct = kpi == null ? null : Math.round(kpi * 100);

  const onExport = useCallback(() => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    el.href = url;
    el.download = `operator-metrics-${ts}.json`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
    URL.revokeObjectURL(url);
  }, [exportJson]);

  const onReset = useCallback(() => {
    if (!confirm("Reset metrics? The event log is cleared on this device.")) return;
    reset();
  }, [reset]);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.025] p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.15em] text-white/40">Metrics</span>
          <h2 className="text-[18px] font-semibold tracking-tight text-white">
            <BarChart3 className="mr-2 inline h-4 w-4 -translate-y-px text-white/65" />
            How Operator is doing
          </h2>
          <p className="text-[12.5px] leading-relaxed text-white/55">
            The one number that matters: how often you approve a reply without
            editing it. High means the drafts are good. Local to this device.
          </p>
        </div>
      </header>

      {/* KPI */}
      <div className="flex items-baseline gap-3 rounded-xl bg-white/[0.02] px-4 py-4">
        <span className="text-[34px] font-semibold leading-none tabular-nums text-white">
          {kpiPct == null ? "—" : `${kpiPct}%`}
        </span>
        <span className="flex flex-col">
          <span className="text-[13px] font-medium text-white/85">approved without editing</span>
          <span className="text-[11.5px] text-white/45">
            {a.approved === 0
              ? "no approvals yet"
              : `${a.approvalWithoutEdit} of ${a.approved} approvals`}
          </span>
        </span>
      </div>

      {/* Funnel */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
        <Stat label="Generated" value={a.generated} />
        <Stat label="Shown" value={a.shown} />
        <Stat label="Edited" value={a.edited} />
        <Stat label="Approved" value={a.approved} />
        <Stat label="Sent" value={a.sent} />
        <Stat label="Undone" value={a.undone} />
        <Stat label="Failed" value={a.failed} tone={a.failed > 0 ? "rose" : undefined} />
        <Stat
          label="Median time"
          value={a.medianCompletionMs == null ? "—" : formatMs(a.medianCompletionMs)}
        />
      </dl>

      <footer className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onExport}
          disabled={events.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12.5px] font-medium text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export events ({events.length})
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={events.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-white/45 transition hover:bg-rose-500/[0.06] hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" /> Reset
        </button>
      </footer>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "rose" }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] text-white/45">{label}</dt>
      <dd className={`text-[15px] font-medium tabular-nums ${tone === "rose" ? "text-rose-200" : "text-white"}`}>
        {value}
      </dd>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.round(s / 60)}m`;
}

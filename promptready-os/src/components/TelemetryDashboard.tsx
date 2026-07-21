"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain as BrainIcon,
  Cpu,
  Database,
  FileText,
  Inbox as InboxIcon,
  ShieldCheck,
  Workflow,
  Zap
} from "lucide-react";
import {
  snapshot as readTelemetry,
  recentMissionTrend,
  resetCrashCounter,
  type TelemetrySnapshot
} from "@/services/telemetry";

/**
 * Telemetry dashboard · Phase 20.
 *
 * Every value is computed locally from existing stores. We never
 * transmit anything. The "send anonymous counts" toggle on the older
 * Telemetry card stays opt-in and unwired.
 */

export function TelemetryDashboard() {
  const [snap, setSnap] = useState<TelemetrySnapshot | null>(null);
  const [trend, setTrend] = useState<number[]>([]);

  useEffect(() => {
    const refresh = () => {
      setSnap(readTelemetry());
      setTrend(recentMissionTrend());
    };
    refresh();
    const t = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(t);
  }, []);

  if (!snap) return null;

  const stats: Array<{ Icon: typeof Activity; label: string; value: string }> = [
    { Icon: Activity, label: "missions", value: String(snap.missionCount) },
    { Icon: Cpu, label: "ollama runs", value: String(snap.ollamaMissions) },
    { Icon: Workflow, label: "workflow runs", value: String(snap.workflowRuns) },
    { Icon: FileText, label: "receipts", value: String(snap.receiptCount) },
    { Icon: Database, label: "imported docs", value: String(snap.importedDocs) },
    { Icon: InboxIcon, label: "inbox items", value: String(snap.inboxItems) },
    { Icon: BrainIcon, label: "brain size", value: `${(snap.brainBytes / 1024).toFixed(1)}KB` },
    { Icon: ShieldCheck, label: "crashes", value: String(snap.crashCount) }
  ];

  const maxTrend = Math.max(1, ...trend);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Local telemetry</span>
        </div>
        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200">
          never sent
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Counters computed from real local stores. Nothing leaves this
        machine. Use these to track growth, brain size, and crash
        frequency.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {stats.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
          >
            <s.Icon className="h-3.5 w-3.5 text-accent" />
            <div className="flex min-w-0 flex-col">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                {s.label}
              </span>
              <span className="text-[13px] font-semibold text-white">{s.value}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
            7-day mission trend
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
            total {trend.reduce((a, b) => a + b, 0)}
          </span>
        </div>
        <div className="flex items-end gap-1 rounded-md border border-white/8 bg-black/30 px-2 py-2" style={{ height: 64 }}>
          {trend.map((v, i) => {
            const h = Math.max(2, Math.round((v / maxTrend) * 48));
            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-accent/40"
                style={{ height: h }}
                title={`day ${i - 6}: ${v} missions`}
              />
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-white/40">
          <span>-6d</span>
          <span>today</span>
        </div>
      </div>

      {snap.crashCount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-amber-400/25 bg-amber-500/[0.05] px-2 py-1.5">
          <span className="flex items-center gap-1.5 text-[11px] text-amber-200/85">
            <Zap className="h-3 w-3" />
            {snap.crashCount} unclean shutdown{snap.crashCount === 1 ? "" : "s"} detected
          </span>
          <button
            type="button"
            onClick={() => {
              resetCrashCounter();
              setSnap(readTelemetry());
            }}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
          >
            reset counter
          </button>
        </div>
      )}
    </section>
  );
}

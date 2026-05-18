"use client";

import { useEffect, useState } from "react";
import { Download, FileSearch, Trash2 } from "lucide-react";
import {
  readAuditLog,
  clearAuditLog,
  downloadAuditLog,
  type AuditEntry,
  type AuditKind
} from "@/services/auditLog";

/**
 * Audit log card · Phase 24.
 *
 * Local ledger. Every persisted operator action lands here so the
 * timeline replays cleanly during migration, debug, and compliance
 * review. Nothing leaves the machine.
 */

const KIND_FILTERS: Array<{ value: AuditKind | "all"; label: string }> = [
  { value: "all", label: "all" },
  { value: "mission.dispatch", label: "missions" },
  { value: "workflow.run", label: "workflows" },
  { value: "workflow.approve", label: "approvals" },
  { value: "snapshot.export", label: "snapshots" },
  { value: "pack.install", label: "packs" },
  { value: "repo.attach", label: "repos" }
];

export function AuditLogCard() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<AuditKind | "all">("all");
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = () => setEntries(readAuditLog());

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(t);
  }, []);

  const visible = entries.filter((e) => filter === "all" || e.kind === filter);

  const onExport = () => {
    const filename = downloadAuditLog();
    setFlash(`exported ${filename}`);
    window.setTimeout(() => setFlash(null), 3500);
  };

  const onClear = () => {
    if (!window.confirm("Clear the local audit log? This cannot be undone.")) return;
    clearAuditLog();
    refresh();
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Audit log</span>
        </div>
        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-emerald-200">
          local only
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Persistent ledger of operator actions: missions, workflow runs,
        approvals, snapshot exports, pack installs, repo attaches. Use
        for compliance, migration, debug. Nothing is transmitted.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {KIND_FILTERS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setFilter(k.value)}
              className={
                filter === k.value
                  ? "rounded border border-accent/40 bg-accent/[0.1] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent"
                  : "rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
              }
            >
              {k.label}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-white/45">
          {visible.length} of {entries.length} entries
        </span>
        <button
          type="button"
          onClick={onExport}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3 w-3" /> Export
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" /> Clear
        </button>
      </div>

      {flash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
          No entries match the current filter. Dispatch a mission or
          install a pack to populate the ledger.
        </p>
      ) : (
        <ul className="mt-3 flex max-h-[260px] flex-col gap-1 overflow-auto pr-1">
          {visible.slice(0, 50).map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[10.5px]"
            >
              <span className="text-white/40">{new Date(e.at).toLocaleString()}</span>
              <span className="rounded border border-accent/25 bg-accent/[0.06] px-1.5 py-px uppercase tracking-wider text-accent">
                {e.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-white/75">
                {Object.entries(e.detail)
                  .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
                  .join(" · ") || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

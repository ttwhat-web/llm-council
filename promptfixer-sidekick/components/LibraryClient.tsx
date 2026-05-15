"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  Clock,
  Cpu,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from "lucide-react";
import {
  deleteReceipt,
  loadReceipts,
  type ReceiptEntry
} from "@/lib/receipts";

/**
 * Library — local Mission Receipt archive.
 *
 * Reads `lib/receipts.ts` from localStorage. No network. When empty,
 * shows an honest "no missions archived yet" state. Each row exposes
 * the data the receipt actually carries — no synthetic fields.
 */

export function LibraryClient() {
  const [receipts, setReceipts] = useState<ReceiptEntry[] | null>(null);

  useEffect(() => {
    setReceipts(loadReceipts());
    // Keep in sync across tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pf.receipts.v1" || e.key === null) {
        setReceipts(loadReceipts());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (receipts === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-white/45">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading archive…
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] px-5 py-10 text-center">
        <p className="text-[13px] text-white/85">No missions archived yet.</p>
        <p className="mt-1 text-[12px] text-white/45">
          Run a mission from Mission Control. Receipts persist to this browser
          only — nothing is sent to a server.
        </p>
        <Link
          href="/app"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          Open Mission Control
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {receipts.length} mission{receipts.length === 1 ? "" : "s"} archived ·
          local only
        </span>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Clear every local receipt? This cannot be undone.")) {
              return;
            }
            // Lazy import to avoid bundling clearReceipts in unused branches.
            void import("@/lib/receipts").then(({ clearReceipts }) => {
              clearReceipts();
              setReceipts([]);
            });
          }}
          className="font-mono text-[10px] uppercase tracking-wider text-white/35 transition hover:text-rose-200"
        >
          clear all
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
        {receipts.map((r) => (
          <li key={r.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex flex-1 flex-col gap-1.5 leading-tight">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.id.replace(/^r_/, "").slice(0, 10)}
                </span>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.mode}
                </span>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.quality}
                </span>
                <span
                  className={clsx(
                    "rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider",
                    r.fallbackUsed
                      ? "border-amber-400/30 bg-amber-500/[0.06] text-amber-200"
                      : "border-white/10 bg-white/[0.04] text-white/55"
                  )}
                  title={r.model || r.provider}
                >
                  {r.provider.replace(/^cloud-/, "")}
                </span>
                <SafetyChip blocked={r.safety.blocked} findings={r.safety.findings} />
              </div>
              <div className="truncate text-[12.5px] text-white/85">
                {r.inputPreview || "(no input recorded)"}
              </div>
              {r.outputPreview && (
                <div className="truncate text-[11px] text-white/50">
                  → {r.outputPreview}
                </div>
              )}
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[10px] text-white/40">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Activity className="h-3 w-3" />
                  {r.elapsedMs}ms
                  {typeof r.latencyMs === "number" && r.latencyMs !== r.elapsedMs && (
                    <span className="text-white/30"> · {r.latencyMs}ms model</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Cpu className="h-3 w-3" />
                  c{r.score.clarity} · s{r.score.specificity} · f{r.score.modelFit}
                </span>
              </div>
            </div>
            <button
              type="button"
              title="Delete this receipt"
              onClick={() => {
                setReceipts(deleteReceipt(r.id));
              }}
              className="rounded-md border border-white/10 bg-white/[0.03] p-1 text-white/45 transition hover:border-rose-400/40 hover:bg-rose-500/[0.08] hover:text-rose-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SafetyChip({ blocked, findings }: { blocked: boolean; findings: number }) {
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-rose-200">
        <ShieldAlert className="h-3 w-3" />
        blocked
      </span>
    );
  }
  if (findings > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-400/35 bg-amber-500/[0.08] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-amber-200">
        <ShieldAlert className="h-3 w-3" />
        {findings}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-500/[0.06] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-emerald-200">
      <ShieldCheck className="h-3 w-3" />
      clear
    </span>
  );
}

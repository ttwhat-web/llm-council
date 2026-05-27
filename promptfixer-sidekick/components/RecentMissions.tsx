"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowUpRight, ChevronDown, ChevronRight, Loader2, Share2 } from "lucide-react";
import type { Mode } from "@/lib/types";

/**
 * Compact rail of the caller's most recent server-side Mission Receipts.
 *
 * Sources from `/api/missions?limit=10` — the route is anonymous-safe
 * (session cookie identity), so this still works without Clerk.
 */

interface RecentRow {
  id: string;
  title: string;
  inputSummary: string;
  mode: Mode;
  score: { clarity: number; specificity: number; safety: number; modelFit: number };
  visibility: "private" | "shared";
  createdAt: number;
  elapsedMs: number;
  supervisor: { resolved: string; model?: string };
}

interface Props {
  reloadKey?: number;
  onCopyShareUrl?: (id: string) => void;
  compact?: boolean;
}

export function RecentMissions({ reloadKey, onCopyShareUrl, compact }: Props) {
  const [open, setOpen] = useState(false);
  const [missions, setMissions] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/missions?limit=10", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { ok: boolean; missions: RecentRow[] }) => {
        if (!cancelled) setMissions(data.missions ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  return (
    <section
      className={clsx(
        "rounded-2xl border border-white/[0.07] bg-white/[0.018] shadow-[inset_0_1px_0_rgba(230,230,250,0.04)]",
        compact && "text-[11px]"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-white/65">
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/40" />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/40" />
          )}
          Mission Archive
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
          {missions.length || "—"}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 px-3 py-2.5">
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading receipts…
            </div>
          )}
          {error && !loading && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
              {error}
            </div>
          )}
          {!loading && !error && missions.length === 0 && (
            <p className="text-[11px] text-white/45">
              No saved missions yet. Run a fix and tap{" "}
              <span className="text-accent">Save receipt</span> to build your library.
            </p>
          )}
          {!loading && missions.length > 0 && (
            <ul className="flex flex-col divide-y divide-white/5">
              {missions.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-1 flex-col leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-medium text-white/85">
                        {m.title}
                      </span>
                      <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-white/55">
                        {m.mode}
                      </span>
                      {m.visibility === "shared" && (
                        <span className="rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1 py-px font-mono text-[8.5px] uppercase tracking-wider text-emerald-200">
                          shared
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 truncate text-[10.5px] text-white/55">
                      {m.inputSummary}
                    </span>
                    <span className="mt-0.5 font-mono text-[9px] text-white/35">
                      {new Date(m.createdAt).toLocaleString()} · {m.elapsedMs}ms
                      {m.supervisor.model ? ` · ${m.supervisor.model}` : ""}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <a
                      href={`/m/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title={m.visibility === "shared" ? "Open share page" : "Owner preview"}
                      className="no-drag flex h-5 w-5 items-center justify-center rounded-md border border-white/8 bg-white/[0.02] text-white/55 transition hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                    {onCopyShareUrl && (
                      <button
                        type="button"
                        onClick={() => onCopyShareUrl(m.id)}
                        title="Copy share link"
                        className="no-drag flex h-5 w-5 items-center justify-center rounded-md border border-white/8 bg-white/[0.02] text-white/55 transition hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
                      >
                        <Share2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

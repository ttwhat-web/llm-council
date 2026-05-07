"use client";

import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { formatLogTime } from "@/lib/missionLog";
import type { LogEntry, LogKind } from "@/lib/types";

/**
 * Compact operations stream that lives directly under PipelineViz.
 * Reads pre-built LogEntry[]s from PromptFixer state. Newest first.
 */

interface Props {
  entries: LogEntry[];
  busy?: boolean;
  /** Default 6 — keep the rail tight under the pipeline. */
  visible?: number;
  compact?: boolean;
}

const KIND: Record<LogKind, { dot: string; text: string }> = {
  ok: { dot: "bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.5)]", text: "text-emerald-200/85" },
  info: { dot: "bg-white/40", text: "text-white/65" },
  warn: { dot: "bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.45)]", text: "text-amber-200/90" },
  err: { dot: "bg-red-400 shadow-[0_0_4px_1px_rgba(248,113,113,0.5)]", text: "text-red-200/95" }
};

export function MissionLog({ entries, busy, visible = 6, compact }: Props) {
  const slice = entries.slice(0, visible);

  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/6 bg-white/[0.015] px-3 py-2",
        compact && "px-2 py-1.5"
      )}
    >
      <div className="flex items-center justify-between pb-1">
        <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/35">
          Mission log
        </div>
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-white/35">
          {busy && (
            <span className="inline-flex items-center gap-1 text-accent">
              <span className="relative h-1 w-1 rounded-full bg-accent shadow-[0_0_5px_2px_rgba(124,155,255,0.45)]">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
              </span>
              live
            </span>
          )}
          <span>{entries.length} events</span>
        </div>
      </div>

      <ul className="flex flex-col gap-0.5 font-mono text-[11px] leading-5">
        <AnimatePresence initial={false} mode="popLayout">
          {slice.map((e) => {
            const k = KIND[e.kind];
            return (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex items-baseline gap-2"
              >
                <span className="w-[58px] shrink-0 text-[10px] text-white/30">
                  [{formatLogTime(e.ts)}]
                </span>
                <span className={clsx("inline-block h-1 w-1 shrink-0 rounded-full", k.dot)} />
                {e.tag && (
                  <span className="w-[64px] shrink-0 truncate text-[9px] uppercase tracking-wider text-white/35">
                    {e.tag}
                  </span>
                )}
                <span className={clsx("truncate", k.text)}>{e.message}</span>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {slice.length === 0 && (
          <li className="flex items-center gap-2 py-1 text-[10px] text-white/25">
            <span className="inline-block h-1 w-1 rounded-full bg-white/20" />
            <span>idle — submit a prompt to populate the log.</span>
          </li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Copy, History as HistoryIcon, Trash2, X } from "lucide-react";
import {
  clearHistory,
  deleteEntry,
  loadHistory,
  type HistoryEntry
} from "@/lib/history";

interface Props {
  onReopen: (entry: HistoryEntry) => void;
  compact?: boolean;
  /** Bumped by the parent after each save so the drawer refreshes. */
  reloadKey?: number;
}

export function HistoryDrawer({ onReopen, compact, reloadKey }: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const refresh = () => setEntries(loadHistory());

  useEffect(() => {
    if (open) refresh();
  }, [open, reloadKey]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]",
          compact && "px-2 py-0.5 text-[11px]"
        )}
      >
        <HistoryIcon className="h-3.5 w-3.5" />
        Mission Archive
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.aside
              key="drawer"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.18 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[min(92vw,420px)] flex-col glass-strong shadow-glass"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <HistoryIcon className="h-4 w-4 text-accent" />
                  Mission Archive
                  <span className="text-[11px] text-white/45">({entries.length})</span>
                </div>
                <div className="flex items-center gap-1">
                  {entries.length > 0 && (
                    <button
                      onClick={() => {
                        clearHistory();
                        refresh();
                      }}
                      className="rounded-md px-2 py-1 text-[11px] text-white/55 hover:bg-white/5 hover:text-red-200"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1 text-white/55 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="scrollbar-thin flex-1 overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs text-white/45">
                    No saved prompts yet. Every successful fix lands here.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {entries.map((e) => (
                      <li key={e.id} className="group p-3 transition hover:bg-white/[0.02]">
                        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/40">
                          <span>{formatTime(e.timestamp)}</span>
                          <span>·</span>
                          <span>{e.mode}</span>
                          <span>·</span>
                          <span>{e.modelQuality}</span>
                          <span className="ml-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              onClick={() => navigator.clipboard?.writeText(e.output)}
                              className="rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"
                              title="Copy output"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                deleteEntry(e.id);
                                refresh();
                              }}
                              className="rounded p-1 text-white/55 hover:bg-red-500/20 hover:text-red-200"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onReopen(e);
                            setOpen(false);
                          }}
                          className="block w-full text-left"
                        >
                          <div className="line-clamp-2 text-xs text-white/85">
                            {e.input.trim() || "(empty input)"}
                          </div>
                          <div className="mt-1 line-clamp-2 font-mono text-[11px] text-white/45">
                            {e.output.trim()}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

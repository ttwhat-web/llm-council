"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { ChevronDown, Wrench } from "lucide-react";
import { AGENT_ACTIONS } from "@/lib/agentActions";
import type { Mode } from "@/lib/types";

/**
 * Operator-tier "Agent Actions" picker. Sits in the secondary control row
 * alongside Templates / History / Mode / Quality. On click, an action's
 * curated body lands in the input and the matching mode is pinned.
 */

interface Props {
  onPick: (body: string, mode: Mode) => void;
  compact?: boolean;
}

export function AgentActions({ onPick, compact }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]",
          compact && "px-2 py-0.5 text-[11px]"
        )}
      >
        <Wrench className="h-3.5 w-3.5" />
        Agents
        <span className="rounded border border-accent/25 bg-accent/[0.08] px-1 py-0.5 text-[8px] uppercase tracking-wider text-accent">
          op
        </span>
        <ChevronDown className={clsx("h-3 w-3 transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 z-40 mt-1.5 w-[300px] overflow-hidden rounded-2xl glass-strong border border-white/10 shadow-glass"
          >
            <div className="border-b border-white/5 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
                Agent actions
              </div>
              <div className="text-[10px] text-white/45">
                Operator-tier — high-leverage starting points.
              </div>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1 scrollbar-thin">
              {AGENT_ACTIONS.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(a.body, a.mode);
                      setOpen(false);
                    }}
                    className="no-drag flex w-full flex-col gap-0.5 px-3 py-2 text-left transition hover:bg-white/5"
                  >
                    <span className="text-[12px] font-medium text-white">{a.label}</span>
                    <span className="text-[10px] text-white/55">{a.blurb}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

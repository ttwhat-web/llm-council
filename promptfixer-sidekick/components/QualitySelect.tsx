"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bolt, BrainCircuit, ChevronDown, Code2, Cpu, Sparkles } from "lucide-react";
import clsx from "clsx";
import { QUALITY_LIST } from "@/lib/quality";
import type { ModelQuality } from "@/lib/types";

const ICONS: Record<ModelQuality, typeof Bolt> = {
  fast: Bolt,
  smart: Sparkles,
  expert: BrainCircuit,
  code: Code2,
  local: Cpu
};

interface Props {
  value: ModelQuality;
  onChange: (q: ModelQuality) => void;
  compact?: boolean;
}

export function QualitySelect({ value, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);
  const current = QUALITY_LIST.find((q) => q.id === value) ?? QUALITY_LIST[0];
  const CurrentIcon = ICONS[current.id];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "no-drag flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/8",
          compact && "text-xs px-2.5 py-1"
        )}
      >
        <CurrentIcon className="h-3.5 w-3.5 text-accent" />
        <span>{current.label}</span>
        <ChevronDown className={clsx("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl glass-strong shadow-glass"
          >
            <ul className="py-1">
              {QUALITY_LIST.map((q) => {
                const Icon = ICONS[q.id];
                const active = q.id === value;
                return (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(q.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "no-drag flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/5",
                        active && "bg-white/5"
                      )}
                    >
                      <Icon
                        className={clsx(
                          "mt-0.5 h-4 w-4 shrink-0",
                          active ? "text-accent" : "text-white/45"
                        )}
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="flex items-center gap-2">
                          <span className="font-medium text-white">{q.label}</span>
                          {q.requiresTier === "pro" && (
                            <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent">
                              Pro
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-white/55">{q.blurb}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

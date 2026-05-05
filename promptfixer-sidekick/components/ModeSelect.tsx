"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";
import { MODE_LIST } from "@/lib/modes";
import type { Mode } from "@/lib/types";

interface Props {
  value: Mode;
  onChange: (mode: Mode) => void;
  compact?: boolean;
  disabled?: boolean;
}

export function ModeSelect({ value, onChange, compact, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODE_LIST.find((m) => m.id === value) ?? MODE_LIST[0];

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "no-drag flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/8 disabled:opacity-40",
          compact && "text-xs px-2.5 py-1"
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(124,155,255,0.6)]" />
        {current.label}
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
            <ul className="max-h-[60vh] overflow-y-auto scrollbar-thin py-1">
              {MODE_LIST.map((m) => {
                const active = m.id === value;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(m.id);
                        setOpen(false);
                      }}
                      className={clsx(
                        "no-drag flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-white/5",
                        active && "bg-white/5"
                      )}
                    >
                      <Check
                        className={clsx(
                          "mt-0.5 h-4 w-4 shrink-0 text-accent",
                          !active && "opacity-0"
                        )}
                      />
                      <span className="flex flex-col">
                        <span className="font-medium text-white">{m.label}</span>
                        <span className="text-xs text-white/55">{m.blurb}</span>
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

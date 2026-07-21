"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { LayoutTemplate } from "lucide-react";
import { templatesByCategory } from "@/lib/templates";
import type { Template } from "@/lib/templates";

interface Props {
  onPick: (t: Template) => void;
  compact?: boolean;
}

export function TemplatePicker({ onPick, compact }: Props) {
  const [open, setOpen] = useState(false);
  const grouped = templatesByCategory();
  const categories = Object.keys(grouped);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "no-drag inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/[0.06]",
          compact && "px-2 py-0.5 text-[11px]"
        )}
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        Mission Templates
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 z-50 mt-2 w-[min(86vw,420px)] overflow-hidden rounded-2xl glass-strong shadow-glass"
            >
              <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                {categories.map((cat) => (
                  <div key={cat} className="border-b border-white/5 last:border-b-0">
                    <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-white/40">
                      {cat}
                    </div>
                    <ul className="pb-1">
                      {grouped[cat].map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onPick(t);
                              setOpen(false);
                            }}
                            className="no-drag flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-white/5"
                          >
                            <span className="font-medium text-white">{t.title}</span>
                            <span className="text-xs text-white/55">{t.blurb}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

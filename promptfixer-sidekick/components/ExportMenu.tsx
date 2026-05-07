"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Download } from "lucide-react";
import { EXPORT_DEFS } from "@/lib/exports";
import type { FixResponse } from "@/lib/types";

/**
 * Tight dropdown next to the prompt's Copy button. Each export is a pure
 * client-side formatter from lib/exports.ts and triggers a Blob download.
 */

export function ExportMenu({ result }: { result: FixResponse }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onExport = (id: string) => {
    const def = EXPORT_DEFS.find((d) => d.id === id);
    if (!def) return;
    const text = def.format(result);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = def.filename(result);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="no-drag inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition hover:bg-white/10"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-30 mt-1.5 w-[260px] overflow-hidden rounded-2xl glass-strong border border-white/10 shadow-glass"
          >
            <ul className="py-1">
              {EXPORT_DEFS.map((def) => (
                <li key={def.id}>
                  <button
                    type="button"
                    onClick={() => onExport(def.id)}
                    className={clsx(
                      "no-drag flex w-full items-start gap-3 px-3 py-2 text-left transition hover:bg-white/5"
                    )}
                  >
                    <span className="flex flex-col leading-tight">
                      <span className="text-[12px] font-medium text-white">{def.label}</span>
                      <span className="text-[10px] text-white/50">{def.blurb}</span>
                    </span>
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

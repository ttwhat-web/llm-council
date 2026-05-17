"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Bookmark, Check, Download } from "lucide-react";
import { EXPORT_DEFS } from "@/lib/exports";
import { saveDraft } from "@/lib/drafts";
import type { FixResponse } from "@/lib/types";

/**
 * Tight dropdown next to the prompt's Copy button. Each row offers two
 * actions on the same export format:
 *
 *   - Download   → Blob + trigger file save
 *   - Library    → save into `lib/drafts.ts` so it shows up under
 *                  /library → Drafts (Phase 2)
 */

export function ExportMenu({ result }: { result: FixResponse }) {
  const [open, setOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onDownload = (id: string) => {
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

  const onSaveToLibrary = (id: string) => {
    const def = EXPORT_DEFS.find((d) => d.id === id);
    if (!def) return;
    const content = def.format(result);
    const titleSeed = (result.sections?.task || "").split("\n")[0]?.trim() || "Untitled";
    saveDraft({
      title: `${def.label} · ${titleSeed.slice(0, 60)}`,
      format: def.id,
      content
    });
    setSavedId(id);
    window.setTimeout(() => setSavedId(null), 1200);
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
            className="absolute right-0 z-30 mt-1.5 w-[300px] overflow-hidden rounded-2xl glass-strong border border-white/10 shadow-glass"
          >
            <ul className="py-1">
              {EXPORT_DEFS.map((def) => (
                <li key={def.id}>
                  <div
                    className={clsx(
                      "flex w-full items-start gap-3 px-3 py-2 transition hover:bg-white/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onDownload(def.id)}
                      className="flex flex-1 flex-col items-start gap-0.5 text-left"
                    >
                      <span className="text-[12px] font-medium text-white">{def.label}</span>
                      <span className="text-[10px] text-white/50">{def.blurb}</span>
                    </button>
                    <button
                      type="button"
                      title="Save to Library → Drafts"
                      onClick={() => onSaveToLibrary(def.id)}
                      className={clsx(
                        "shrink-0 rounded-md border p-1 transition",
                        savedId === def.id
                          ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
                          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-accent/30 hover:bg-accent/[0.08] hover:text-accent"
                      )}
                    >
                      {savedId === def.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="border-t border-white/8 px-3 py-1.5 text-[10px] text-white/45">
              Left side downloads · bookmark icon saves to{" "}
              <span className="font-mono text-white/65">/library → Drafts</span>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

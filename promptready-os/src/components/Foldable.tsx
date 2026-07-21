"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";

/**
 * Foldable · UX RESET 04.
 *
 * Lightweight collapse wrapper for Settings cards. The child stays
 * mounted (hidden via the `hidden` attribute) so internal state ·
 * polling effects · pinned UI state · is never lost when the card
 * is closed. The header peek is always visible.
 *
 * Use it to demote low-priority cards from a flat scroll wall into
 * a navigable hierarchy without breaking any existing component.
 */

interface Props {
  /** Visible peek title. */
  title: string;
  /** One-line summary shown next to the title when collapsed. */
  hint?: string;
  /** Optional badge (e.g. counter or status pill). */
  badge?: ReactNode;
  /** Whether to render expanded on first paint. */
  defaultOpen?: boolean;
  /** Persist open/closed under this localStorage key. */
  persistKey?: string;
  children: ReactNode;
}

export function Foldable({
  title,
  hint,
  badge,
  defaultOpen = false,
  persistKey,
  children
}: Props) {
  const [open, setOpen] = useState<boolean>(() => {
    if (!persistKey || typeof window === "undefined") return defaultOpen;
    try {
      const raw = window.localStorage.getItem(`promptready-os.fold.${persistKey}`);
      if (raw === "open") return true;
      if (raw === "closed") return false;
    } catch {
      // ignore
    }
    return defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (persistKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `promptready-os.fold.${persistKey}`,
          next ? "open" : "closed"
        );
      } catch {
        // ignore
      }
    }
  };

  return (
    <section
      className={clsx(
        "rounded-2xl border bg-white/[0.012] transition",
        open ? "border-white/8" : "border-white/8 hover:border-white/14"
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-white/45" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-white/45" />
        )}
        <span className="text-[12.5px] font-semibold text-white">{title}</span>
        {hint && (
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            {hint}
          </span>
        )}
        {badge && <span className="ml-auto">{badge}</span>}
      </button>
      <div hidden={!open} className="border-t border-white/6 p-1">
        {children}
      </div>
    </section>
  );
}

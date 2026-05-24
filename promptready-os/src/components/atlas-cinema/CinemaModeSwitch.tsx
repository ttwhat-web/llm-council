"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export type AtlasCanvasMode =
  | "cinema"
  | "graph"
  | "blueprint"
  | "operations"
  | "live";

const MODES: Array<{ id: AtlasCanvasMode; label: string; key: string }> = [
  { id: "cinema", label: "Cinema", key: "C" },
  { id: "graph", label: "Graph", key: "G" },
  { id: "blueprint", label: "Blueprint", key: "B" },
  { id: "operations", label: "Operations", key: "O" },
  { id: "live", label: "Live", key: "L" }
];

interface Props {
  mode: AtlasCanvasMode;
  onMode(m: AtlasCanvasMode): void;
  presentation?: boolean;
}

export function CinemaModeSwitch({ mode, onMode, presentation }: Props) {
  // Auto-fade after 4s without mousemove inside the scene; full opacity on move.
  const [faded, setFaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (presentation) return; // hidden anyway
    const onMove = () => {
      setFaded(false);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setFaded(true), 4000);
    };
    onMove(); // kick off the timer
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [presentation]);

  if (presentation) return null;

  return (
    <nav
      aria-label="Atlas canvas mode"
      className={clsx(
        "cinema-mode-switch pointer-events-auto absolute bottom-10 left-1/2 z-[30] flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-white/12 bg-[rgba(10,12,18,0.65)] p-0.5 backdrop-blur-md transition-opacity duration-300",
        faded ? "opacity-35 hover:opacity-100" : "opacity-100"
      )}
    >
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onMode(m.id)}
            className={clsx(
              "inline-flex h-7 items-center gap-1 rounded px-2 font-mono text-[10px] uppercase tracking-wider transition",
              active
                ? "bg-accent/[0.12] text-accent shadow-[inset_0_0_0_1px_rgba(124,155,255,0.25)]"
                : "text-white/65 hover:bg-white/[0.06]"
            )}
            title={`${m.label} · press ${m.key}`}
          >
            {m.label}
          </button>
        );
      })}
    </nav>
  );
}

export { MODES as ATLAS_CANVAS_MODES };

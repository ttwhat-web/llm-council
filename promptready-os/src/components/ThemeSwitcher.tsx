"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Palette } from "lucide-react";
import { useThemeStore, THEMES } from "@/store/theme";

/**
 * Theme switcher · Phase 13.
 *
 * Tight popover with five palette swatches. Compact form used in the
 * ShellLayout header; the Settings page uses the same component with
 * `variant="inline"` so the palette grid lays out flat.
 */

interface Props {
  variant?: "compact" | "inline";
}

export function ThemeSwitcher({ variant = "compact" }: Props) {
  const id = useThemeStore((s) => s.id);
  const set = useThemeStore((s) => s.set);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (variant === "inline") {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {THEMES.map((t) => (
          <Swatch key={t.id} t={t} active={t.id === id} onPick={() => set(t.id)} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Theme"
        className="no-drag inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06]"
      >
        <Palette className="h-3 w-3 text-accent" />
        {THEMES.find((t) => t.id === id)?.label ?? "Theme"}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/95 p-2 shadow-glass backdrop-blur">
          <div className="grid grid-cols-1 gap-1">
            {THEMES.map((t) => (
              <Swatch
                key={t.id}
                t={t}
                active={t.id === id}
                onPick={() => {
                  set(t.id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] text-white/40">
            Palette applies instantly · choice persists locally.
          </p>
        </div>
      )}
    </div>
  );
}

function Swatch({
  t,
  active,
  onPick
}: {
  t: (typeof THEMES)[number];
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition",
        active
          ? "border-accent/40 bg-accent/[0.08] shadow-glow"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      )}
    >
      <span
        className="h-4 w-4 shrink-0 rounded-md ring-1 ring-white/15"
        style={{ background: t.swatch }}
      />
      <span className="text-[12px] font-medium text-white">{t.label}</span>
    </button>
  );
}


"use client";

/**
 * Market Lab · shared UI primitives.
 *
 * Small presentational helpers used across the Market Intelligence Center
 * zones. Nothing here fabricates data — these are pure layout / pill /
 * panel atoms that follow the Operator.Center glass + accent token style.
 */

import type { ReactNode } from "react";
import clsx from "clsx";

export type Tone = "ok" | "accent" | "muted" | "bad" | "warn";

const TONE_PILL: Record<Tone, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-300",
  accent: "border-accent/40 bg-accent/[0.08] text-accent",
  muted: "border-white/10 bg-white/[0.03] text-white/45",
  bad: "border-rose-400/30 bg-rose-500/[0.08] text-rose-300",
  warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
};

export function Pill({
  tone = "muted",
  children,
  className
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider",
        TONE_PILL[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  glow,
  title,
  icon,
  right,
  bodyClassName
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        "flex min-w-0 max-w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]",
        glow && "shadow-[0_0_40px_-12px_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {(title || right) && (
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-white/6 px-2.5 py-1.5">
          <span className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[9.5px] uppercase tracking-[0.2em] text-accent">
            {icon}
            {title}
          </span>
          <span className="shrink-0">{right}</span>
        </div>
      )}
      <div className={clsx("flex min-w-0 max-w-full flex-col gap-2 p-2.5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Dot({ live, label }: { live: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/45">
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          live ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.5)]" : "bg-white/20"
        )}
      />
      {label}
    </span>
  );
}

/** A compact key/value row used in sidebars + command panels. */
export function StatRow({
  label,
  value,
  tone
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-[3px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">{label}</span>
      <span
        className={clsx(
          "font-mono text-[10.5px] tabular-nums",
          tone === "ok"
            ? "text-emerald-300/90"
            : tone === "warn"
              ? "text-amber-200/90"
              : tone === "bad"
                ? "text-rose-300/90"
                : tone === "accent"
                  ? "text-accent"
                  : "text-white/85"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Diagonal-hatch background used to mark a zone as intentionally disabled
 * (no live source). Subtle, low-contrast — reads "off", never "broken".
 */
export const HATCH: import("react").CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 7px)"
};

/**
 * Honest "no live source yet" panel body — styled as INTENTIONALLY
 * disabled: compact, muted, low-opacity, hatched. Never shows numbers,
 * never reads as "unfinished / blank".
 */
export function AdapterReady({
  what,
  detail
}: {
  what: string;
  detail?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 rounded border border-white/8 bg-white/[0.008] px-2 py-1.5 opacity-70"
      style={HATCH}
    >
      <Pill tone="muted">offline</Pill>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">{what}</span>
        {detail && <p className="text-[10px] leading-snug text-white/35">{detail}</p>}
      </div>
    </div>
  );
}

/**
 * A single compact adapter-ready instrument/cell row — intentionally
 * disabled look (muted, hatched, low opacity). No numbers.
 */
export function DisabledRow({ label, note = "offline" }: { label: string; note?: string }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-1 py-[3px] opacity-60"
      style={HATCH}
    >
      <span className="font-mono text-[10px] tabular-nums text-white/45">{label}</span>
      <span className="font-mono text-[8.5px] uppercase tracking-wider text-white/30">{note}</span>
    </div>
  );
}

/** Color a 24h % into an honest heat tone (real crypto data only). */
export function changeTone(change: number | null): Tone {
  if (change == null) return "muted";
  if (change >= 1.5) return "ok";
  if (change <= -1.5) return "bad";
  return "muted";
}

export function heatStyle(change: number | null): { background: string; border: string } {
  if (change == null) return { background: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.08)" };
  const c = Math.max(-8, Math.min(8, change));
  const intensity = Math.min(0.32, Math.abs(c) / 8 * 0.32 + 0.05);
  if (c >= 0) {
    return {
      background: `rgba(52,211,153,${intensity})`,
      border: `rgba(52,211,153,${Math.min(0.5, intensity + 0.15)})`
    };
  }
  return {
    background: `rgba(248,113,113,${intensity})`,
    border: `rgba(248,113,113,${Math.min(0.5, intensity + 0.15)})`
  };
}

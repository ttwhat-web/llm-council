"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

/**
 * Reusable terminal panel · dense, monospace-labeled, thin borders.
 * No giant cards, no toy glow.
 */

type Tone = "ok" | "warn" | "bad" | "muted" | "accent";

interface Props {
  title: string;
  sub?: string;
  status?: string;
  tone?: Tone;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  bad: "bg-rose-400",
  muted: "bg-white/30",
  accent: "bg-accent"
};

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-emerald-300/85",
  warn: "text-amber-300/85",
  bad: "text-rose-300/85",
  muted: "text-white/45",
  accent: "text-accent/85"
};

export function TerminalPanel({
  title,
  sub,
  status,
  tone = "muted",
  right,
  children,
  className,
  bodyClassName
}: Props) {
  return (
    <section
      className={clsx(
        "flex min-h-0 flex-col overflow-hidden rounded-md border border-white/10 bg-black/40",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={clsx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[tone])}
          />
          <span className="truncate font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-white/90">
            {title}
          </span>
          {sub && (
            <span className="truncate font-mono text-[9px] uppercase tracking-wider text-white/40">
              · {sub}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {status && (
            <span
              className={clsx(
                "font-mono text-[9px] uppercase tracking-wider tabular-nums",
                TONE_TEXT[tone]
              )}
            >
              {status}
            </span>
          )}
          {right}
        </div>
      </header>
      <div className={clsx("flex min-h-0 flex-1 flex-col p-1.5", bodyClassName)}>{children}</div>
    </section>
  );
}

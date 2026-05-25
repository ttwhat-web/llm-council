"use client";

import clsx from "clsx";

type Tone = "ok" | "warn" | "bad" | "muted";

interface Props {
  label: string;
  tone: Tone;
  title?: string;
}

const TONE_PILL: Record<Tone, string> = {
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  warn: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
  bad: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200",
  muted: "border-white/10 bg-white/[0.03] text-white/55"
};

export function ProviderStateBadge({ label, tone, title }: Props) {
  return (
    <span
      title={title ?? `provider state · ${tone}`}
      className={clsx(
        "rounded border px-1.5 py-px font-mono text-[9px] uppercase tracking-wider",
        TONE_PILL[tone]
      )}
    >
      {label}
    </span>
  );
}

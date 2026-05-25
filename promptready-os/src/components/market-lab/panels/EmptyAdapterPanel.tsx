"use client";

import clsx from "clsx";

interface Props {
  text: string;
  subtext?: string;
  tone?: "muted" | "warn";
  className?: string;
}

const TONE: Record<"muted" | "warn", string> = {
  muted: "border-white/12 bg-white/[0.012] text-white/55",
  warn: "border-amber-400/25 bg-amber-500/[0.04] text-amber-200/80"
};

export function EmptyAdapterPanel({ text, subtext, tone = "muted", className }: Props) {
  return (
    <div
      className={clsx(
        "flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-dashed p-3 text-center",
        TONE[tone],
        className
      )}
    >
      <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]">{text}</span>
      {subtext && (
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">
          {subtext}
        </span>
      )}
    </div>
  );
}

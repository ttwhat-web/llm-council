"use client";

import clsx from "clsx";
import type { ScoreCard } from "@/lib/types";

interface Props {
  score: ScoreCard;
  compact?: boolean;
}

const LABELS: Array<{ key: keyof ScoreCard; label: string; short: string }> = [
  { key: "clarity", label: "Clarity", short: "Clarity" },
  { key: "specificity", label: "Specificity", short: "Spec." },
  { key: "safety", label: "Safety", short: "Safety" },
  { key: "modelFit", label: "Model Fit", short: "Fit" }
];

export function ScoreBadges({ score, compact }: Props) {
  return (
    <div className={clsx("grid grid-cols-4 gap-2", compact && "gap-1.5")}>
      {LABELS.map(({ key, label, short }) => (
        <Badge key={key} label={compact ? short : label} value={score[key]} compact={compact} />
      ))}
    </div>
  );
}

function Badge({ label, value, compact }: { label: string; value: number; compact?: boolean }) {
  const tone = value >= 80 ? "ok" : value >= 60 ? "warn" : value >= 30 ? "low" : "bad";
  const ring = {
    ok: "border-emerald-500/30 bg-emerald-500/10",
    warn: "border-amber-500/30 bg-amber-500/10",
    low: "border-orange-500/30 bg-orange-500/10",
    bad: "border-red-500/30 bg-red-500/10"
  }[tone];
  const text = {
    ok: "text-emerald-200",
    warn: "text-amber-200",
    low: "text-orange-200",
    bad: "text-red-200"
  }[tone];

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-xl border px-2.5 py-1.5 text-[11px]",
        ring,
        compact && "px-2 py-1"
      )}
    >
      <div className={clsx("flex items-center justify-between text-white/70", compact && "text-[10px]")}>
        <span>{label}</span>
        <span className={clsx("font-mono font-semibold", text)}>{value}</span>
      </div>
      <div className={clsx("mt-1 h-1 w-full rounded-full bg-white/5", compact && "mt-0.5")}>
        <div
          className={clsx("h-1 rounded-full", {
            "bg-emerald-400/80": tone === "ok",
            "bg-amber-400/80": tone === "warn",
            "bg-orange-400/80": tone === "low",
            "bg-red-400/80": tone === "bad"
          })}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

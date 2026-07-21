"use client";

import clsx from "clsx";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { SafetyReport } from "@/lib/types";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-200 border-red-500/30",
  high: "bg-orange-500/15 text-orange-200 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  low: "bg-yellow-500/10 text-yellow-200 border-yellow-500/30"
};

export function SafetyBadge({ safety }: { safety: SafetyReport }) {
  if (!safety.findings.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-200">
        <ShieldCheck className="h-3.5 w-3.5" />
        Safety: clean
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={clsx(
          "flex items-center gap-2 rounded-lg border px-2.5 py-1 text-[11px]",
          safety.blocked
            ? "border-red-500/40 bg-red-500/15 text-red-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-200"
        )}
      >
        <ShieldAlert className="h-3.5 w-3.5" />
        {safety.blocked
          ? "Blocked: critical command detected"
          : "Confirmation required before executing"}
      </div>
      <ul className="space-y-1.5">
        {safety.findings.map((f) => (
          <li
            key={f.pattern}
            className={clsx("rounded-lg border px-2.5 py-1.5 text-[11px]", SEVERITY_STYLES[f.severity])}
          >
            <div className="font-medium">[{f.severity.toUpperCase()}] {f.pattern}</div>
            <div className="opacity-80">{f.reason}</div>
            <div className="mt-0.5 opacity-70">→ {f.suggestion}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

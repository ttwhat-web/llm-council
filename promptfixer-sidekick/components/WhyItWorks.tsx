"use client";

import clsx from "clsx";
import { Check, Info, ShieldAlert } from "lucide-react";
import type { Insight, InsightReport } from "@/lib/insights";

interface Props {
  report: InsightReport;
  compact?: boolean;
}

const ICON: Record<Insight["tone"], typeof Check> = {
  ok: Check,
  warn: ShieldAlert,
  info: Info
};

const TONE: Record<Insight["tone"], { ring: string; text: string }> = {
  ok: { ring: "border-emerald-500/30 bg-emerald-500/5", text: "text-emerald-200" },
  warn: { ring: "border-amber-500/30 bg-amber-500/5", text: "text-amber-200" },
  info: { ring: "border-white/10 bg-white/[0.02]", text: "text-white/75" }
};

export function WhyItWorks({ report, compact }: Props) {
  return (
    <div className={clsx("flex flex-col gap-3", compact && "gap-2")}>
      <div className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-[12px] text-white/85">
        <span className="text-accent">Why it works · </span>
        {report.summary}
      </div>

      <ul className="space-y-2">
        {report.changes.map((c) => {
          const Icon = ICON[c.tone];
          const tone = TONE[c.tone];
          return (
            <li key={c.id} className={clsx("rounded-xl border px-3 py-2.5", tone.ring)}>
              <div className="flex items-start gap-2">
                <Icon className={clsx("mt-0.5 h-3.5 w-3.5 shrink-0", tone.text)} />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="text-[12px] font-medium text-white">{c.title}</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3">
                    <Block label="Before" body={c.before} muted />
                    <Block label="After" body={c.after} />
                  </div>
                  {c.note && (
                    <pre className="scrollbar-thin mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 px-2.5 py-1.5 font-mono text-[11px] text-white/70">
                      {c.note}
                    </pre>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Block({ label, body, muted }: { label: string; body: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] uppercase tracking-wider text-white/35">{label}</div>
      <div className={clsx("text-[12px]", muted ? "text-white/55" : "text-white/85")}>{body}</div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { readAuditLog, type AuditEntry } from "@/services/auditLog";

/**
 * Operator Timeline · UX RESET 03.
 *
 * Compact terminal-style strip that sits under the Atlas HUD. Reads
 * directly from the local audit log · zero invented events. Refreshes
 * every 6s · horizontally scrollable on narrow viewports.
 */

const KIND_LABEL: Record<string, string> = {
  "mission.dispatch": "mission dispatched",
  "mission.cancel": "mission cancelled",
  "workflow.run": "workflow ran",
  "workflow.resume": "workflow resumed",
  "workflow.approve": "approval cleared",
  "workflow.reject": "workflow rejected",
  "snapshot.export": "snapshot created",
  "snapshot.restore": "snapshot restored",
  "brain.restore": "brain restored",
  "brain.reset": "brain reset",
  "pack.install": "pack installed",
  "pack.export": "pack exported",
  "repo.attach": "repo attached",
  "repo.detach": "repo detached",
  "policy.toggle": "policy changed",
  "telegram.send": "telegram routed",
  "agent.tick": "agent ticked"
};

const KIND_TONE: Record<string, "ok" | "warn" | "muted"> = {
  "mission.dispatch": "ok",
  "mission.cancel": "warn",
  "workflow.approve": "ok",
  "workflow.reject": "warn",
  "snapshot.export": "ok",
  "snapshot.restore": "ok",
  "repo.attach": "ok",
  "pack.install": "ok",
  "policy.toggle": "muted",
  "telegram.send": "muted",
  "agent.tick": "ok"
};

export function OperatorTimeline() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => readAuditLog());

  useEffect(() => {
    const refresh = () => setEntries(readAuditLog());
    const t = window.setInterval(refresh, 6000);
    return () => window.clearInterval(t);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-white/8 bg-white/[0.012] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/40">
        <span className="text-accent">timeline</span>
        <span>no events yet · dispatch a mission to populate the strip</span>
      </div>
    );
  }

  // Newest first in the audit log · we reverse for chronological left→right
  // chronology · but cap to last 24 entries to keep the strip dense.
  const recent = entries.slice(0, 24).reverse();

  return (
    <div
      role="region"
      aria-label="Operator timeline"
      className="flex items-center gap-3 overflow-x-auto rounded-md border border-white/8 bg-black/30 px-3 py-1.5 font-mono text-[10.5px] scrollbar-thin"
    >
      <span className="shrink-0 uppercase tracking-[0.22em] text-accent">timeline</span>
      <ul className="flex shrink-0 items-center gap-4">
        {recent.map((e) => (
          <li key={e.id} className="flex shrink-0 items-center gap-2">
            <span className="text-white/35">{formatTime(e.at)}</span>
            <Dot tone={KIND_TONE[e.kind] ?? "muted"} />
            <span className={clsx("uppercase tracking-[0.14em]", labelTone(KIND_TONE[e.kind]))}>
              {KIND_LABEL[e.kind] ?? e.kind}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dot({ tone }: { tone: "ok" | "warn" | "muted" }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-400/85"
      : tone === "warn"
        ? "bg-amber-400/85"
        : "bg-white/30";
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} />;
}

function labelTone(tone: "ok" | "warn" | "muted" | undefined): string {
  if (tone === "ok") return "text-emerald-200/85";
  if (tone === "warn") return "text-amber-200/85";
  return "text-white/55";
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

"use client";

import { useEffect, useState } from "react";
import {
  readPresence,
  refreshOllamaProbe,
  tickHeartbeat,
  type PresenceSnapshot
} from "@/services/presence";

/**
 * Presence strip · UX RESET 02.
 *
 * Terminal-aligned row · fixed-width mono labels, one dot per signal.
 * No icons, no chrome · pure operator workstation. Refreshes every 5s ·
 * re-probes Ollama every 60s. Every value is real local state.
 */

type Tone = "ok" | "warn" | "bad" | "muted";

interface Row {
  label: string;
  value: string;
  tone: Tone;
}

export function PresenceStrip() {
  const [p, setP] = useState<PresenceSnapshot>(() => readPresence());

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (cancelled) return;
      setP(readPresence());
      tickHeartbeat();
    };
    refresh();
    const fast = window.setInterval(refresh, 5000);
    const probe = window.setInterval(() => {
      if (cancelled) return;
      void refreshOllamaProbe().then(refresh);
    }, 60_000);
    void refreshOllamaProbe().then(refresh);
    return () => {
      cancelled = true;
      window.clearInterval(fast);
      window.clearInterval(probe);
    };
  }, []);

  const rows: Row[] = [
    { label: "desktop", value: p.desktop, tone: p.desktop === "online" ? "ok" : "bad" },
    {
      label: "ollama",
      value: p.ollama,
      tone:
        p.ollama === "ready"
          ? "ok"
          : p.ollama === "unknown"
            ? "muted"
            : "bad"
    },
    {
      label: "workflow",
      value: p.workflow,
      tone:
        p.workflow === "running" || p.workflow === "idle"
          ? "ok"
          : p.workflow === "waiting-approval"
            ? "warn"
            : "bad"
    },
    {
      label: "agents",
      value: p.agents,
      tone:
        p.agents === "idle" || p.agents === "running"
          ? "ok"
          : p.agents === "approval"
            ? "warn"
            : "bad"
    },
    {
      label: "memory",
      value: p.memory,
      tone:
        p.memory === "healthy"
          ? "ok"
          : p.memory === "stale"
            ? "warn"
            : "bad"
    },
    {
      label: "telegram",
      value: p.telegram,
      tone:
        p.telegram === "live-connected"
          ? "ok"
          : p.telegram === "live-ready"
            ? "warn"
            : p.telegram === "error"
              ? "bad"
              : "muted"
    }
  ];

  return (
    <ul
      role="list"
      className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[10.5px] sm:grid-cols-3 lg:flex lg:flex-wrap"
    >
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2 lg:min-w-[148px]">
          <Dot tone={r.tone} />
          <span className="w-[60px] uppercase tracking-[0.18em] text-white/45">
            {r.label}
          </span>
          <span className={valueClass(r.tone)}>{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Dot({ tone }: { tone: Tone }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-400/85 shadow-[0_0_6px_1px_rgba(52,211,153,0.55)]"
      : tone === "warn"
        ? "bg-amber-400/85 shadow-[0_0_6px_1px_rgba(251,191,36,0.5)]"
        : tone === "bad"
          ? "bg-rose-400/85 shadow-[0_0_6px_1px_rgba(248,113,113,0.45)]"
          : "bg-white/25";
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${cls}`} />;
}

function valueClass(tone: Tone): string {
  switch (tone) {
    case "ok":
      return "text-emerald-200/85";
    case "warn":
      return "text-amber-200/85";
    case "bad":
      return "text-rose-200/85";
    default:
      return "text-white/55";
  }
}

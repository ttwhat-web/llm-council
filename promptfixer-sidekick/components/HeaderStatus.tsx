"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type {
  ClientContext,
  Engine,
  HealthResponse,
  Mode,
  ModelQuality,
  SupervisorReview,
  UsageSnapshot
} from "@/lib/types";

/**
 * Header right-side telemetry strip — a single glance-line that shows the
 * active engine, resolved model, cloud/local light, and daily quota.
 *
 * This complements ModelRadar (the full HUD). Header is the one-line
 * summary; the radar is the deep panel.
 */

interface Props {
  selectedEngine: Engine;
  selectedQuality: ModelQuality;
  selectedMode: Mode;
  clientContext: ClientContext;
  lastSupervisor?: SupervisorReview;
  lastUsage?: UsageSnapshot;
  busy?: boolean;
}

export function HeaderStatus({
  selectedEngine,
  selectedQuality,
  selectedMode,
  clientContext,
  lastSupervisor,
  lastUsage,
  busy
}: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: HealthResponse | null) => {
        if (!cancelled && data) setHealth(data);
      })
      .catch(() => {
        /* keep blank — not worth surfacing here, the radar handles error state */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cloudReady = Boolean(health?.cloud.configured && health.cloud.reachable);
  const ollamaReady = Boolean(health?.ollama.configured && health.ollama.reachable);

  const engineLabel = lastSupervisor?.resolved ?? activeProvider(health) ?? selectedEngine;
  const modelLabel = lastSupervisor?.model ?? activeModel(health) ?? "—";
  const latency = lastSupervisor?.latencyMs;

  let connTone: "ok" | "warn" | "muted" = "muted";
  let connText = "standby";
  if (busy) {
    connTone = "ok";
    connText = "running";
  } else if (lastSupervisor?.resolved.startsWith("cloud")) {
    connTone = "ok";
    connText = "cloud";
  } else if (lastSupervisor?.resolved === "ollama") {
    connTone = "ok";
    connText = "local";
  } else if (lastSupervisor?.resolved === "deterministic") {
    connTone = "warn";
    connText = "rules";
  } else if (cloudReady) {
    connTone = "ok";
    connText = "cloud · ready";
  } else if (ollamaReady) {
    connTone = "ok";
    connText = "local · ready";
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
      <Pill label="engine" value={engineLabel} />
      <Pill label="model" value={truncate(modelLabel, 22)} />
      <Light tone={connTone} text={connText} pulse={busy} />
      {typeof latency === "number" && (
        <Pill label="t" value={`${latency}ms`} />
      )}
      {lastUsage && (
        <Pill
          label="quota"
          value={`${lastUsage.used}/${lastUsage.limit}`}
          tone={lastUsage.remaining === 0 ? "warn" : undefined}
        />
      )}
      <Pill label="ctx" value={clientContext} muted />
      <Pill label="q" value={selectedQuality} muted />
      <Pill label="mode" value={selectedMode} muted />
    </div>
  );
}

function Pill({
  label,
  value,
  tone,
  muted
}: {
  label: string;
  value: string;
  tone?: "warn";
  muted?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-colors",
        tone === "warn"
          ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
          : muted
            ? "border-white/[0.07] bg-white/[0.025] text-white/55"
            : "border-white/[0.10] bg-white/[0.05] text-white/85"
      )}
    >
      <span className="text-white/45">{label}</span>
      <span className="font-mono">{value}</span>
    </span>
  );
}

function Light({
  tone,
  text,
  pulse
}: {
  tone: "ok" | "warn" | "muted";
  text: string;
  pulse?: boolean;
}) {
  const dot = {
    ok: "bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]",
    warn: "bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.45)]",
    muted: "bg-white/30"
  }[tone];
  const text_ = {
    ok: "text-emerald-200",
    warn: "text-amber-200",
    muted: "text-white/55"
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.10] bg-white/[0.05] px-1.5 py-0.5">
      <span className={clsx("relative inline-block h-1.5 w-1.5 rounded-full", dot)}>
        {pulse && <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />}
      </span>
      <span className={clsx("font-mono", text_)}>{text}</span>
    </span>
  );
}

function activeProvider(h: HealthResponse | null): string | null {
  if (!h) return null;
  if (h.cloud.configured && h.cloud.reachable) {
    return h.cloud.vendor === "anthropic" ? "cloud-anthropic" : "cloud-openai";
  }
  if (h.ollama.configured && h.ollama.reachable) return "ollama";
  return "deterministic";
}

function activeModel(h: HealthResponse | null): string | null {
  if (!h) return null;
  if (h.cloud.configured && h.cloud.reachable) return h.cloud.model || null;
  if (h.ollama.configured && h.ollama.reachable) return h.ollama.model || null;
  return "rules-only";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

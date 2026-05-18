"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Bot,
  Cpu,
  Database,
  Send,
  Workflow as WorkflowIcon
} from "lucide-react";
import {
  readPresence,
  refreshOllamaProbe,
  tickHeartbeat,
  type PresenceSnapshot
} from "@/services/presence";

/**
 * Compact presence strip · Atlas HUD.
 *
 * One row, six dots. Reads from real local state only. Refreshes every
 * 5s and re-probes Ollama every 60s.
 */

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
    // initial probe
    void refreshOllamaProbe().then(refresh);
    return () => {
      cancelled = true;
      window.clearInterval(fast);
      window.clearInterval(probe);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
      <Dot
        ok={p.desktop === "online"}
        Icon={Activity}
        label="desktop"
        value={p.desktop}
      />
      <Dot
        ok={p.ollama === "ready"}
        warn={p.ollama === "unknown"}
        Icon={Cpu}
        label="ollama"
        value={p.ollama}
      />
      <Dot
        ok={p.workflow === "running" || p.workflow === "idle"}
        warn={p.workflow === "waiting-approval"}
        bad={p.workflow === "blocked"}
        Icon={WorkflowIcon}
        label="workflow"
        value={p.workflow}
      />
      <Dot
        ok={p.agents === "idle" || p.agents === "running"}
        warn={p.agents === "approval"}
        bad={p.agents === "blocked"}
        Icon={Bot}
        label="agents"
        value={p.agents}
      />
      <Dot
        ok={p.memory === "healthy"}
        warn={p.memory === "stale"}
        bad={p.memory === "empty"}
        Icon={Database}
        label="memory"
        value={p.memory}
      />
      <Dot
        ok={p.telegram === "live-connected"}
        warn={p.telegram === "live-ready"}
        bad={p.telegram === "error"}
        Icon={Send}
        label="telegram"
        value={p.telegram}
      />
    </div>
  );
}

function Dot({
  ok,
  warn,
  bad,
  Icon,
  label,
  value
}: {
  ok?: boolean;
  warn?: boolean;
  bad?: boolean;
  Icon: typeof Activity;
  label: string;
  value: string;
}) {
  const tone = bad
    ? "bg-rose-400/85"
    : warn
      ? "bg-amber-400/85"
      : ok
        ? "bg-emerald-400/85"
        : "bg-white/30";
  return (
    <span
      title={`${label} · ${value}`}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5",
        bad && "border-rose-400/35 bg-rose-500/[0.06]",
        warn && "border-amber-400/35 bg-amber-500/[0.06]"
      )}
    >
      <span className={clsx("inline-block h-1.5 w-1.5 rounded-full", tone)} />
      <Icon className="h-2.5 w-2.5 text-white/65" />
      <span className="text-white/70">{label}</span>
    </span>
  );
}

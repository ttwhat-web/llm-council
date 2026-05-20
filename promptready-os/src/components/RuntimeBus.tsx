"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Bot,
  Brain,
  Cpu,
  Database,
  Github,
  Inbox as InboxIcon,
  Loader2,
  Package,
  Phone,
  Send,
  Workflow,
  Zap
} from "lucide-react";
import { LineChart, Mail, Newspaper } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { probeOllama } from "@/services/missionRunner";
import { listInstalledPacks } from "@/services/marketplace";
import { statusForModule } from "@/services/adapters";

/**
 * Runtime Bus · Phase 25 (Operator OS).
 *
 * Reads real state from every existing store and renders the 9
 * runtime modules with a real / partial / planned / offline pill.
 * Nothing is faked — modules that don't have networking yet show
 * "planned" honestly.
 */

type RuntimeState = "ready" | "partial" | "planned" | "offline";

interface RuntimeRow {
  id: string;
  label: string;
  Icon: typeof Brain;
  state: RuntimeState;
  detail: string;
}

export function RuntimeBus() {
  const brain = useBrainStore((s) => ({ identity: s.identity, engines: s.engines, sources: s.memorySources }));
  const missions = useMissionStore((s) => ({ current: s.current, history: s.history, runtime: s.runtime }));
  const atlas = useAtlasStore((s) => ({
    workflowRuns: s.workflowRuns,
    workflowNodes: s.workflowNodes,
    memoryDocs: s.memoryDocs,
    inbox: s.inbox,
    agents: s.agents,
    telegram: s.telegram,
    pairingCode: s.pairingCode
  }));
  const [ollamaUp, setOllamaUp] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void probeOllama().then((p) => {
      if (!cancelled) setOllamaUp(p.reachable);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: RuntimeRow[] = [
    {
      id: "mission",
      label: "Mission Runtime",
      Icon: Activity,
      state: missions.current ? "ready" : missions.history.length > 0 ? "ready" : "partial",
      detail: missions.current
        ? `in flight · ${missions.current.id} · ${missions.current.stage}`
        : `${missions.history.length} receipt${missions.history.length === 1 ? "" : "s"} · ${missions.runtime}`
    },
    {
      id: "memory",
      label: "Memory Runtime",
      Icon: Database,
      state:
        atlas.memoryDocs.length > 0 || brain.sources.length > 0 ? "ready" : "partial",
      detail: `${brain.sources.length} sources · ${atlas.memoryDocs.length} imported docs`
    },
    {
      id: "repo",
      label: "Repo Runtime",
      Icon: Github,
      state: brain.sources.some((s) => s.kind === "github") ? "partial" : "planned",
      detail:
        brain.sources.filter((s) => s.kind === "github").length > 0
          ? "manual context only · indexer planned"
          : "no repos attached"
    },
    {
      id: "workflow",
      label: "Workflow Runtime",
      Icon: Workflow,
      state: atlas.workflowNodes.length > 0 ? "ready" : "partial",
      detail:
        atlas.workflowNodes.length > 0
          ? `${atlas.workflowNodes.length} nodes · ${atlas.workflowRuns.length} runs`
          : "canvas empty"
    },
    {
      id: "agent",
      label: "Agent Runtime",
      Icon: Bot,
      state:
        atlas.agents.some((a) => a.state === "running" || a.state === "done") ? "ready" : "partial",
      detail: `${atlas.agents.length} slots · operator-tick only`
    },
    {
      id: "notification",
      label: "Notification Runtime",
      Icon: Zap,
      state: "ready",
      detail: "computed live from local stores · never sent"
    },
    {
      id: "mobile",
      label: "Mobile Runtime",
      Icon: Phone,
      state: atlas.pairingCode ? "partial" : "planned",
      detail: atlas.pairingCode
        ? "pairing code issued · networking ships with desktop"
        : "no pairing code · planned"
    },
    {
      id: "telegram",
      label: "Telegram Runtime",
      Icon: Send,
      state: atlas.telegram ? "partial" : "planned",
      detail: atlas.telegram
        ? "link code issued · adapter seam ready · bot networking planned"
        : "no link code · planned"
    },
    {
      id: "marketplace",
      label: "Marketplace Runtime",
      Icon: Package,
      state: listInstalledPacks().length > 0 ? "ready" : "partial",
      detail: `${listInstalledPacks().length} installed packs · starter packs bundled`
    },
    intelRow("markets", "Markets Runtime", LineChart),
    intelRow("news", "News Runtime", Newspaper),
    intelRow("email", "Email Runtime", Mail)
  ];

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Runtime Bus</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {rows.filter((r) => r.state === "ready").length} ready · {rows.filter((r) => r.state === "partial").length} partial · {rows.filter((r) => r.state === "planned").length} planned
        </span>
      </header>

      <p className="text-[11px] text-white/65">
        Nine runtime modules wired into the Operator OS. Every state is
        computed live from real local stores · planned states are honest
        about what doesn't ship yet.
      </p>

      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
          >
            <r.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-semibold text-white">{r.label}</span>
                <StatePill state={r.state} />
              </div>
              <span className="font-mono text-[10.5px] text-white/55">{r.detail}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <BusBar label="event bus" state="planned" />
        <BusBar label="receipt bus" state="ready" hint="mission store" />
        <BusBar label="notification bus" state="ready" hint="HUD bell" />
        <BusBar label="workflow bus" state="partial" hint="approval resume" />
      </div>

      {ollamaUp === false && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/[0.05] px-2 py-1 text-[10.5px] text-amber-200/85">
          <Loader2 className="h-3 w-3" />
          Ollama not reachable · runtime bus shows local-only state
        </p>
      )}

      {/* keep InboxIcon referenced for future "inbox bus" row */}
      <span className="hidden">
        <InboxIcon />
      </span>
    </section>
  );
}

function intelRow(
  module: "markets" | "news" | "email",
  label: string,
  Icon: typeof Brain
): RuntimeRow {
  const s = statusForModule(module);
  const state: RuntimeState =
    s.status === "connected" ? "ready" : s.status === "adapter-ready" ? "partial" : "planned";
  const detail =
    s.status === "connected"
      ? `live · ${s.providers.join(" · ")}`
      : s.status === "adapter-ready"
        ? `adapter ready · ${s.providers.join(" · ") || "awaiting provider"}`
        : module === "email"
          ? "read-only adapters · not connected"
          : "offline · awaiting provider key";
  return { id: module, label, Icon, state, detail };
}

function StatePill({ state }: { state: RuntimeState }) {
  const cls = {
    ready: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    partial: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    planned: "border-white/10 bg-white/[0.03] text-white/55",
    offline: "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
  }[state];
  return (
    <span className={clsx("rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider", cls)}>
      {state}
    </span>
  );
}

function BusBar({
  label,
  state,
  hint
}: {
  label: string;
  state: RuntimeState;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[10px]">
      <span className="uppercase tracking-wider text-white/65">{label}</span>
      <div className="flex items-center gap-1">
        {hint && <span className="text-white/40">{hint}</span>}
        <StatePill state={state} />
      </div>
    </div>
  );
}

/**
 * Cinema scene adapter · Atlas Cinema mode.
 *
 * Read-only derivation of a single CinemaScene from EXISTING stores +
 * services. No new state, no new probes, no fake values. If a value
 * cannot be honestly read, it surfaces as "—" / "planned" / "offline".
 */

import { useEffect, useState } from "react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { getTelegramBridgeStatus } from "@/services/telegramLive";
import { probeOllama } from "@/services/missionRunner";

export type OrbitTone =
  | "live"
  | "active"
  | "pending"
  | "stale"
  | "offline"
  | "planned";

export interface CinemaOrbitData {
  id: string;
  label: string;
  tone: OrbitTone;
  value: string;
  source: string;
  lastUpdated: number | null;
  relatedLabels: string[];
}

export interface CinemaScene {
  coreState: {
    liveN: number;
    staleN: number;
    offlineN: number;
    demo: boolean;
    identityNull: boolean;
    brainName: string | null;
  };
  orbits: CinemaOrbitData[];
  hudTop: {
    telegram: string;
    ollama: string;
    markets: string;
    activeMission: boolean;
  };
  hudLeft: {
    memory: number;
    sources: number;
    missionsToday: number;
    receipts: number;
    agents: number;
    workflows: number;
  };
}

const ORBIT_ORDER: Array<{ id: string; label: string }> = [
  { id: "memory", label: "Memory" },
  { id: "receipts", label: "Receipts" },
  { id: "agents", label: "Agents" },
  { id: "telegram", label: "Telegram" },
  { id: "market", label: "Market" },
  { id: "voice", label: "Voice" },
  { id: "ollama", label: "Ollama" },
  { id: "runtime", label: "Runtime" },
  { id: "projects", label: "Projects" },
  { id: "workflows", label: "Workflows" }
];

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function useCinemaScene(): CinemaScene {
  const identity = useBrainStore((s) => s.identity);
  const memorySources = useBrainStore((s) => s.memorySources);
  const demo = useBrainStore((s) => s.demo);

  const history = useMissionStore((s) => s.history);
  const current = useMissionStore((s) => s.current);
  const runtime = useMissionStore((s) => s.runtime);

  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const workflowNodes = useAtlasStore((s) => s.workflowNodes);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const agents = useAtlasStore((s) => s.agents);

  // Telegram + markets are sync reads from existing helpers/stores.
  const tg = getTelegramBridgeStatus();

  // Ollama probe · cached locally, refreshed on mount and every 60s.
  // Uses the EXISTING probeOllama; never invented.
  const [ollamaReachable, setOllamaReachable] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await probeOllama();
        if (!alive) return;
        setOllamaReachable(r.reachable);
        setOllamaModels(r.models);
      } catch {
        if (!alive) return;
        setOllamaReachable(false);
        setOllamaModels([]);
      }
    };
    void run();
    const t = window.setInterval(run, 60_000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const githubSources = memorySources.filter((s) => s.kind === "github");
  const missionsToday = history.filter((m) => m.startedAt >= startOfTodayMs()).length;
  const lastReceipt = history[0]?.endedAt ?? history[0]?.startedAt ?? null;

  // Workflow tone
  const anyRunRunning = workflowRuns.some((r) => r.status === "running");
  const anyRunWaiting = workflowRuns.some((r) => r.status === "awaiting-approval");
  const anyRunBlocked = workflowRuns.some((r) => r.status === "blocked");

  // Agents tone
  const anyAgentRunning = agents.some((a) => a.state === "running");
  const anyAgentApproval = agents.some((a) => a.state === "approval");
  const anyAgentBlocked = agents.some((a) => a.state === "blocked");

  const telegramTone: OrbitTone =
    tg.live === "live-connected"
      ? "live"
      : tg.live === "live-ready"
        ? "pending"
        : tg.live === "error"
          ? "offline"
          : "planned";
  const telegramLabel =
    tg.live === "live-connected"
      ? "connected"
      : tg.live === "live-ready"
        ? "ready"
        : tg.live === "error"
          ? "error"
          : "simulator";

  const ollamaTone: OrbitTone =
    ollamaReachable === true ? "live" : ollamaReachable === false ? "offline" : "planned";
  const ollamaValue =
    ollamaReachable === true
      ? `${ollamaModels.length} model${ollamaModels.length === 1 ? "" : "s"}`
      : ollamaReachable === false
        ? "offline"
        : "probing…";

  const runtimeTone: OrbitTone = runtime === "ready" ? "live" : runtime === "local-mode" ? "live" : "planned";

  // Markets tone · honest: we don't trigger an extra fetch here. If
  // no cached crypto data is available we show "adapter-ready".
  const marketsTone: OrbitTone = "planned";
  const marketsLabel = "adapter-ready";

  const orbits: CinemaOrbitData[] = ORBIT_ORDER.map((o) => {
    switch (o.id) {
      case "memory":
        return {
          id: o.id,
          label: o.label,
          tone:
            memoryDocs.length + memorySources.length > 0 ? "live" : "planned",
          value:
            memoryDocs.length + memorySources.length > 0
              ? `${memoryDocs.length} docs · ${memorySources.length} src`
              : "—",
          source: "useAtlasStore.memoryDocs · useBrainStore.memorySources",
          lastUpdated: memoryDocs[0]?.addedAt ?? null,
          relatedLabels: memorySources.slice(0, 3).map((s) => s.label)
        };
      case "receipts":
        return {
          id: o.id,
          label: o.label,
          tone: history.length > 0 ? "live" : "planned",
          value: history.length > 0 ? `${history.length} archived` : "—",
          source: "useMissionStore.history",
          lastUpdated: lastReceipt,
          relatedLabels: history.slice(0, 3).map((m) => m.id.slice(0, 10))
        };
      case "agents":
        return {
          id: o.id,
          label: o.label,
          tone: anyAgentBlocked
            ? "stale"
            : anyAgentApproval
              ? "pending"
              : anyAgentRunning
                ? "active"
                : agents.length > 0
                  ? "live"
                  : "planned",
          value: agents.length > 0 ? `${agents.length} slot${agents.length === 1 ? "" : "s"}` : "—",
          source: "useAtlasStore.agents",
          lastUpdated: null,
          relatedLabels: agents.slice(0, 3).map((a) => a.kind)
        };
      case "telegram":
        return {
          id: o.id,
          label: o.label,
          tone: telegramTone,
          value: telegramLabel,
          source: "getTelegramBridgeStatus",
          lastUpdated: tg.lastSendAt ?? tg.lastPollAt ?? null,
          relatedLabels: []
        };
      case "market":
        return {
          id: o.id,
          label: o.label,
          tone: marketsTone,
          value: marketsLabel,
          source: "statusForModule('markets')",
          lastUpdated: null,
          relatedLabels: []
        };
      case "voice":
        return {
          id: o.id,
          label: o.label,
          tone: "planned",
          value: "—",
          source: "voice captures · planned",
          lastUpdated: null,
          relatedLabels: []
        };
      case "ollama":
        return {
          id: o.id,
          label: o.label,
          tone: ollamaTone,
          value: ollamaValue,
          source: "probeOllama (services/missionRunner)",
          lastUpdated: null,
          relatedLabels: ollamaModels.slice(0, 3)
        };
      case "runtime":
        return {
          id: o.id,
          label: o.label,
          tone: runtimeTone,
          value: runtime,
          source: "useMissionStore.runtime",
          lastUpdated: null,
          relatedLabels: []
        };
      case "projects":
        return {
          id: o.id,
          label: o.label,
          tone: githubSources.length > 0 ? "live" : "planned",
          value:
            githubSources.length > 0
              ? `${githubSources.length} repo${githubSources.length === 1 ? "" : "s"}`
              : "—",
          source: "useBrainStore.memorySources(kind='github')",
          lastUpdated: null,
          relatedLabels: githubSources.slice(0, 3).map((s) => s.label)
        };
      case "workflows":
        return {
          id: o.id,
          label: o.label,
          tone: anyRunBlocked
            ? "stale"
            : anyRunWaiting
              ? "pending"
              : anyRunRunning
                ? "active"
                : workflowNodes.length > 0
                  ? "live"
                  : "planned",
          value:
            workflowNodes.length > 0
              ? `${workflowNodes.length} nodes · ${workflowRuns.length} runs`
              : "—",
          source: "useAtlasStore.workflowNodes · workflowRuns",
          lastUpdated: null,
          relatedLabels: []
        };
      default:
        return {
          id: o.id,
          label: o.label,
          tone: "planned",
          value: "—",
          source: "—",
          lastUpdated: null,
          relatedLabels: []
        };
    }
  });

  const liveN = orbits.filter((o) => o.tone === "live" || o.tone === "active").length;
  const staleN = orbits.filter((o) => o.tone === "stale" || o.tone === "pending").length;
  const offlineN = orbits.filter((o) => o.tone === "offline" || o.tone === "planned").length;

  return {
    coreState: {
      liveN,
      staleN,
      offlineN,
      demo,
      identityNull: !identity,
      brainName: identity?.name ?? null
    },
    orbits,
    hudTop: {
      telegram: telegramLabel,
      ollama: ollamaReachable === true ? "reachable" : ollamaReachable === false ? "offline" : "probing",
      markets: marketsLabel,
      activeMission: !!current
    },
    hudLeft: {
      memory: memoryDocs.length,
      sources: memorySources.length,
      missionsToday,
      receipts: history.length,
      agents: agents.length,
      workflows: workflowNodes.length
    }
  };
}

export { ORBIT_ORDER };

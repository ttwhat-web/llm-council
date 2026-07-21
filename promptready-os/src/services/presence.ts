/**
 * Presence · Sprint A
 *
 * One snapshot of the operator's runtime, computed from real local
 * stores + a cached Ollama probe. Read by:
 *   · Atlas HUD compact strip
 *   · Settings Runtime Bus detail
 *   · Telegram `/status` command
 *   · NotificationsBell degraded-state badge
 *
 * Heartbeats: a lightweight setInterval can call `tickHeartbeat()` to
 * write the last-seen timestamp. Without it, presence is still readable
 * — `lastHeartbeat` simply equals the last read time.
 */

import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { probeOllama } from "@/services/missionRunner";
import { getTelegramBridgeStatus, type TelegramLiveStatus } from "@/services/telegramLive";
import { statusForModule, type AdapterStatus } from "@/services/adapters";

export type OnlineState = "online" | "offline";
export type OllamaState = "ready" | "offline" | "unknown";
export type WorkflowState = "idle" | "running" | "waiting-approval" | "blocked";
export type AgentRollup = "idle" | "running" | "blocked" | "approval";
export type MemoryState = "healthy" | "stale" | "empty";

export interface PresenceSnapshot {
  desktop: OnlineState;
  ollama: OllamaState;
  activeMission: boolean;
  activeMissionId: string | null;
  workflow: WorkflowState;
  agents: AgentRollup;
  memory: MemoryState;
  telegram: TelegramLiveStatus;
  /** Sprint B · Operator Intelligence adapter rollups. */
  email: AdapterStatus;
  markets: AdapterStatus;
  news: AdapterStatus;
  lastHeartbeat: number;
  lastReceipt: number | null;
  pendingApprovals: number;
}

const HEARTBEAT_KEY = "promptready-os.presence.heartbeat";
const OLLAMA_CACHE_MS = 60 * 1000;

let ollamaCache: { at: number; ready: boolean } | null = null;

export async function refreshOllamaProbe(): Promise<OllamaState> {
  try {
    const r = await probeOllama();
    ollamaCache = { at: Date.now(), ready: r.reachable };
    return r.reachable ? "ready" : "offline";
  } catch {
    ollamaCache = { at: Date.now(), ready: false };
    return "offline";
  }
}

function cachedOllama(): OllamaState {
  if (!ollamaCache) return "unknown";
  if (Date.now() - ollamaCache.at > OLLAMA_CACHE_MS) return "unknown";
  return ollamaCache.ready ? "ready" : "offline";
}

export function tickHeartbeat() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function readHeartbeat(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = window.localStorage.getItem(HEARTBEAT_KEY);
    return raw ? Number(raw) || Date.now() : Date.now();
  } catch {
    return Date.now();
  }
}

function rollupAgents(): AgentRollup {
  const agents = useAtlasStore.getState().agents;
  if (agents.some((a) => a.state === "approval")) return "approval";
  if (agents.some((a) => a.state === "blocked")) return "blocked";
  if (agents.some((a) => a.state === "running" || a.state === "waiting")) return "running";
  return "idle";
}

function rollupWorkflow(): WorkflowState {
  const runs = useAtlasStore.getState().workflowRuns;
  if (runs.some((r) => r.status === "awaiting-approval")) return "waiting-approval";
  if (runs.some((r) => r.status === "running")) return "running";
  if (runs.some((r) => r.status === "blocked")) return "blocked";
  return "idle";
}

function rollupMemory(): MemoryState {
  const brain = useBrainStore.getState();
  const atlas = useAtlasStore.getState();
  const sources = brain.memorySources.length;
  const docs = atlas.memoryDocs.length;
  const lastActivity = brain.lastActivity ?? 0;
  if (sources === 0 && docs === 0) return "empty";
  const stale = lastActivity > 0 && Date.now() - lastActivity > 14 * 86_400_000;
  return stale ? "stale" : "healthy";
}

/**
 * Synchronous presence read. Uses cached Ollama state · call
 * `refreshOllamaProbe()` periodically to keep that fresh.
 */
export function readPresence(): PresenceSnapshot {
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const tg = getTelegramBridgeStatus();
  const lastReceipt = missions.history[0]?.endedAt ?? missions.history[0]?.startedAt ?? null;
  return {
    desktop: "online",
    ollama: cachedOllama(),
    activeMission: !!missions.current,
    activeMissionId: missions.current?.id ?? null,
    workflow: rollupWorkflow(),
    agents: rollupAgents(),
    memory: rollupMemory(),
    telegram: tg.live,
    email: statusForModule("email").status,
    markets: statusForModule("markets").status,
    news: statusForModule("news").status,
    lastHeartbeat: readHeartbeat(),
    lastReceipt,
    pendingApprovals: atlas.workflowRuns.filter((r) => r.status === "awaiting-approval").length
  };
}

/** Format presence for the Telegram `/status` reply. */
export function formatPresenceForTelegram(p: PresenceSnapshot): string {
  const dot = (s: string): string => {
    switch (s) {
      case "online":
      case "ready":
      case "healthy":
      case "live-connected":
      case "live-ready":
      case "connected":
        return "🟢";
      case "idle":
      case "simulator":
      case "adapter-ready":
        return "⚪";
      case "running":
      case "waiting-approval":
      case "approval":
        return "🟡";
      case "blocked":
      case "stale":
      case "offline":
      case "error":
        return "🔴";
      default:
        return "⚪";
    }
  };
  const lines = [
    `${dot(p.desktop)} desktop`,
    `${dot(p.ollama)} ollama · ${p.ollama}`,
    `${dot(p.workflow)} workflow · ${p.workflow}`,
    `${dot(p.agents)} agents · ${p.agents}`,
    `${dot(p.memory)} memory · ${p.memory}`,
    `${dot(p.telegram)} telegram · ${p.telegram}`,
    `${dot(p.email)} email · ${p.email}`,
    `${dot(p.markets)} markets · ${p.markets}`,
    `${dot(p.news)} news · ${p.news}`,
    p.activeMission ? `🟢 active mission · ${p.activeMissionId}` : `⚪ no active mission`,
    p.pendingApprovals > 0 ? `🟡 pending approvals · ${p.pendingApprovals}` : `⚪ no pending approvals`
  ];
  return lines.join("\n");
}

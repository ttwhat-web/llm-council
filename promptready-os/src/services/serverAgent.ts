/**
 * Server agent · adapter seam · NOT WIRED today.
 *
 * This is the planned SSH bridge that will let Operator.Center monitor
 * remote VPS / servers. Until a real agent ships, every call returns
 * `ok: false` with a stable `agent not wired` reason so the UI can
 * render honest adapter-ready cells.
 *
 * Security contract (enforced at the agent layer, declared here so
 * frontend consumers can rely on it):
 *   - SSH key auth only · no password storage anywhere
 *   - no arbitrary command input from the UI
 *   - command allowlist (see ALLOWED_COMMANDS)
 *   - every action is audit-logged via `serverAudit.append`
 *
 * When the agent ships, only the function bodies in this file need to
 * change · the public contract stays stable.
 */

import type { ServerProfile } from "@/store/servers";

export type AgentStatus = "not-wired" | "ready" | "error";

export interface AgentResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  at: number;
}

export interface ServerStatus {
  online: boolean | null;
  latencyMs: number | null;
  cpuPct: number | null;
  memPct: number | null;
  diskPct: number | null;
  uptimeSec: number | null;
}

export type ServiceKind = "docker" | "pm2" | "systemd";
export type ServiceState = "running" | "stopped" | "errored" | "unknown";

export interface ServerService {
  id: string;
  name: string;
  kind: ServiceKind;
  state: ServiceState;
  detail?: string;
}

/** Strict allowlist · any other command is refused before reaching SSH. */
export const ALLOWED_COMMANDS = ["restart-service"] as const;
export type AllowedCommand = (typeof ALLOWED_COMMANDS)[number];

const NOT_WIRED_REASON = "agent not wired · SSH bridge planned";

function notWired<T>(): AgentResult<T> {
  return { ok: false, data: null, error: NOT_WIRED_REASON, at: Date.now() };
}

export function getAgentStatus(): AgentStatus {
  return "not-wired";
}

export function getAgentReason(): string {
  return NOT_WIRED_REASON;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function probeStatus(profile: ServerProfile): Promise<AgentResult<ServerStatus>> {
  return notWired<ServerStatus>();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listServices(profile: ServerProfile): Promise<AgentResult<ServerService[]>> {
  return notWired<ServerService[]>();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchLogs(
  profile: ServerProfile,
  tail = 200
): Promise<AgentResult<string[]>> {
  void tail;
  return notWired<string[]>();
}

export async function executeAllowed(
  profile: ServerProfile,
  cmd: AllowedCommand,
  args: Record<string, string>
): Promise<AgentResult<{ ok: true }>> {
  if (!(ALLOWED_COMMANDS as readonly string[]).includes(cmd)) {
    return {
      ok: false,
      data: null,
      error: `command '${cmd}' not in allowlist`,
      at: Date.now()
    };
  }
  void profile;
  void args;
  return {
    ok: false,
    data: null,
    error: NOT_WIRED_REASON,
    at: Date.now()
  };
}

/** Alert rules · derived only from real status; never fires on null. */
export interface ServerAlert {
  id: string;
  severity: "warn" | "bad";
  label: string;
  detail: string;
}

export function deriveAlerts(
  status: ServerStatus | null,
  services: ServerService[]
): ServerAlert[] {
  const out: ServerAlert[] = [];
  if (status) {
    if (status.diskPct != null && status.diskPct > 85) {
      out.push({
        id: "disk",
        severity: "warn",
        label: "disk > 85%",
        detail: `${status.diskPct.toFixed(0)}% used`
      });
    }
    if (status.memPct != null && status.memPct > 85) {
      out.push({
        id: "mem",
        severity: "warn",
        label: "memory > 85%",
        detail: `${status.memPct.toFixed(0)}% used`
      });
    }
  }
  for (const s of services) {
    if (s.state === "stopped" || s.state === "errored") {
      out.push({
        id: `svc-${s.id}`,
        severity: "bad",
        label: `${s.name} ${s.state}`,
        detail: `${s.kind} · service down`
      });
    }
  }
  return out;
}

export function formatUptime(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

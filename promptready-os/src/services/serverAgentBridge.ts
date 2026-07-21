/**
 * Server agent bridge · Tauri ↔ frontend.
 *
 * All commands flow through this module · the UI never executes a
 * shell command directly. When running outside Tauri (browser dev,
 * preview deployments) `isBridgeAvailable()` returns false and every
 * call returns `ok: false` with `"agent not available · run in desktop"`,
 * so the UI degrades to its honest adapter-ready cells.
 *
 * The Rust side enforces:
 *   - command id allowlist
 *   - per-profile per-kind name allowlists for restart / logs
 *   - strict argument character set (no shell injection)
 *   - SSH BatchMode=yes · PasswordAuthentication=no
 *
 * This frontend wrapper additionally enforces:
 *   - audit log entries before every invoke (`pending`)
 *   - audit log entries after every invoke (`ok` / `blocked` / `error`)
 */

import { invoke } from "@tauri-apps/api/tauri";
import { isTauri } from "./runtimeBridge";
import { appendAudit, type AuditAction } from "./serverAudit";
import type { ServerProfile } from "@/store/servers";

// ---------------------------------------------------------------------------
// Shared types (mirror Rust)
// ---------------------------------------------------------------------------

export interface AgentResponse<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  command: string;
  started_at_ms: number;
  duration_ms: number;
}

export interface StatusOut {
  online: boolean;
  latency_ms: number | null;
  cpu_pct: number | null;
  mem_pct: number | null;
  disk_pct: number | null;
  uptime_sec: number | null;
  raw_uptime: string | null;
  raw_df: string | null;
  raw_free: string | null;
}

export type ServiceKind = "docker" | "pm2" | "systemd";
export type ServiceState = "running" | "stopped" | "errored" | "unknown";

export interface ServiceOut {
  id: string;
  name: string;
  kind: ServiceKind;
  state: ServiceState;
  detail?: string;
}

export interface LogsOut {
  lines: string[];
}

export interface RestartOut {
  restarted: boolean;
  stdout: string;
  stderr: string;
}

// ---------------------------------------------------------------------------
// Tauri presence + invoke wrapper
// ---------------------------------------------------------------------------

export function isBridgeAvailable(): boolean {
  return isTauri();
}

async function invokeBridge<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isBridgeAvailable()) throw new Error("agent not available · run in desktop app");
  return invoke<T>(cmd, args ?? {});
}

const NOT_AVAILABLE: AgentResponse<unknown> = {
  ok: false,
  data: null,
  error: "agent not available · run in desktop app",
  command: "—",
  started_at_ms: 0,
  duration_ms: 0
};

function notAvailable<T>(command: string): AgentResponse<T> {
  return { ...(NOT_AVAILABLE as AgentResponse<T>), command };
}

// ---------------------------------------------------------------------------
// Auditing wrapper · `before` + `after` per spec
// ---------------------------------------------------------------------------

interface AuditCtx {
  beforeAction: AuditAction;
  detail: string;
  profile: ServerProfile;
}

async function audited<T>(
  ctx: AuditCtx,
  command: string,
  call: () => Promise<AgentResponse<T>>
): Promise<AgentResponse<T>> {
  // BEFORE: record the intent first · always.
  appendAudit({
    action: ctx.beforeAction,
    profileId: ctx.profile.id,
    profileName: ctx.profile.name,
    detail: `before · ${command} · ${ctx.detail}`,
    result: "ok"
  });
  let response: AgentResponse<T>;
  try {
    response = await call();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    response = {
      ok: false,
      data: null,
      error: msg,
      command,
      started_at_ms: 0,
      duration_ms: 0
    };
  }
  // AFTER: record the outcome.
  const blockedKeywords = ["not available", "not wired", "not in allowlist", "invalid host", "invalid ssh user", "invalid port"];
  const result: "ok" | "blocked" | "error" = response.ok
    ? "ok"
    : blockedKeywords.some((k) => (response.error ?? "").toLowerCase().includes(k))
      ? "blocked"
      : "error";
  appendAudit({
    action: ctx.beforeAction,
    profileId: ctx.profile.id,
    profileName: ctx.profile.name,
    detail: `after · ${command} · ${response.error ?? "ok"} · ${response.duration_ms ?? 0}ms`,
    result
  });
  return response;
}

// ---------------------------------------------------------------------------
// Public API · maps directly to Rust `#[tauri::command]` functions
// ---------------------------------------------------------------------------

export async function bridgeAgentStatus(): Promise<{ ok: boolean; status: string; allowed_commands: string[] } | null> {
  if (!isBridgeAvailable()) return null;
  try {
    return await invokeBridge("server_agent_status");
  } catch {
    return null;
  }
}

export async function bridgeProbeStatus(profile: ServerProfile): Promise<AgentResponse<StatusOut>> {
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "probe-attempt", detail: "no bridge", profile },
      "probe-status",
      async () => notAvailable<StatusOut>("probe-status")
    );
  }
  return audited(
    { beforeAction: "probe-attempt", detail: `${profile.host}:${profile.port}`, profile },
    "probe-status",
    () => invokeBridge<AgentResponse<StatusOut>>("server_probe_status", { profile })
  );
}

export async function bridgeListPm2(profile: ServerProfile): Promise<AgentResponse<ServiceOut[]>> {
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "services-attempt", detail: "no bridge · pm2", profile },
      "list-pm2",
      async () => notAvailable<ServiceOut[]>("list-pm2")
    );
  }
  return audited(
    { beforeAction: "services-attempt", detail: `pm2 jlist · ${profile.host}`, profile },
    "list-pm2",
    () => invokeBridge<AgentResponse<ServiceOut[]>>("server_list_pm2", { profile })
  );
}

export async function bridgeListDocker(profile: ServerProfile): Promise<AgentResponse<ServiceOut[]>> {
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "services-attempt", detail: "no bridge · docker", profile },
      "list-docker",
      async () => notAvailable<ServiceOut[]>("list-docker")
    );
  }
  return audited(
    { beforeAction: "services-attempt", detail: `docker ps · ${profile.host}`, profile },
    "list-docker",
    () => invokeBridge<AgentResponse<ServiceOut[]>>("server_list_docker", { profile })
  );
}

export async function bridgeListSystemd(profile: ServerProfile): Promise<AgentResponse<ServiceOut[]>> {
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "services-attempt", detail: "no bridge · systemd", profile },
      "list-systemd",
      async () => notAvailable<ServiceOut[]>("list-systemd")
    );
  }
  return audited(
    { beforeAction: "services-attempt", detail: `systemctl · ${profile.allowedSystemdServices.join(",") || "—"}`, profile },
    "list-systemd",
    () => invokeBridge<AgentResponse<ServiceOut[]>>("server_list_systemd", { profile })
  );
}

export async function bridgeFetchLogs(
  profile: ServerProfile,
  kind: ServiceKind,
  name: string,
  tail = 200
): Promise<AgentResponse<LogsOut>> {
  const detail = `${kind}:${name} tail=${tail}`;
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "logs-attempt", detail: `no bridge · ${detail}`, profile },
      "logs",
      async () => notAvailable<LogsOut>("logs")
    );
  }
  return audited(
    { beforeAction: "logs-attempt", detail, profile },
    "logs",
    () =>
      invokeBridge<AgentResponse<LogsOut>>("server_logs", {
        profile,
        args: { kind, name, tail }
      })
  );
}

export async function bridgeRestart(
  profile: ServerProfile,
  kind: ServiceKind,
  name: string
): Promise<AgentResponse<RestartOut>> {
  const detail = `${kind}:${name}`;
  if (!isBridgeAvailable()) {
    return audited(
      { beforeAction: "restart-confirm", detail: `no bridge · ${detail}`, profile },
      "restart",
      async () => notAvailable<RestartOut>("restart")
    );
  }
  return audited(
    { beforeAction: "restart-confirm", detail, profile },
    "restart",
    () =>
      invokeBridge<AgentResponse<RestartOut>>("server_restart", {
        profile,
        args: { kind, name }
      })
  );
}

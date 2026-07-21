/**
 * Runtime bridge · Sprint H.
 *
 * Thin client over the desktop (Tauri) runtime commands. When running in
 * the Operator Core desktop app, connector calls that can't run safely in
 * a browser (secret-bearing or CORS-blocked) are proxied through Rust —
 * secrets never reach JS. In the browser preview, these return a
 * "not in desktop runtime" result and callers fall back to public APIs.
 *
 * Secrets are never requested or returned here: env status is only a
 * boolean `configured` per key.
 */

import { invoke } from "@tauri-apps/api/tauri";

export type RuntimeLocation = "tauri" | "browser";

export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { __TAURI_IPC__?: unknown }).__TAURI_IPC__ !== "undefined"
  );
}

export function runtimeLocation(): RuntimeLocation {
  return isTauri() ? "tauri" : "browser";
}

export async function runtimePing(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const r = await invoke<{ ok: boolean }>("runtime_ping");
    return !!r?.ok;
  } catch {
    return false;
  }
}

export interface EnvKeyStatus {
  key: string;
  configured: boolean;
}

export async function getEnvStatus(): Promise<EnvKeyStatus[]> {
  if (!isTauri()) return [];
  try {
    return await invoke<EnvKeyStatus[]>("runtime_get_env_status");
  } catch {
    return [];
  }
}

export interface OpResult {
  ok: boolean;
  error?: string;
}

export async function bridgeTelegramSend(text: string): Promise<OpResult> {
  if (!isTauri()) return { ok: false, error: "not in desktop runtime" };
  try {
    return await invoke<OpResult>("runtime_telegram_send", { text });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface PollResult {
  ok: boolean;
  messages: string[];
  error?: string;
}

export async function bridgeTelegramPoll(): Promise<PollResult> {
  if (!isTauri()) return { ok: false, messages: [], error: "not in desktop runtime" };
  try {
    return await invoke<PollResult>("runtime_telegram_poll_once");
  } catch (e) {
    return { ok: false, messages: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export interface BridgeFetchResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

export async function bridgeProviderFetch(
  provider: string,
  query?: string
): Promise<BridgeFetchResult> {
  if (!isTauri()) return { ok: false, status: 0, error: "not in desktop runtime" };
  try {
    return await invoke<BridgeFetchResult>("runtime_provider_fetch", {
      provider,
      query: query ?? null
    });
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Cached env status · so synchronous status readers (e.g. Telegram status)
// can reflect desktop-configured keys without an await on every render.
// ---------------------------------------------------------------------------

let cachedEnv: Record<string, boolean> = {};

export async function refreshEnvStatus(): Promise<Record<string, boolean>> {
  const list = await getEnvStatus();
  const next: Record<string, boolean> = {};
  for (const e of list) next[e.key] = e.configured;
  cachedEnv = next;
  return next;
}

export function envConfiguredCached(key: string): boolean {
  return cachedEnv[key] === true;
}

/**
 * Provider health · Sprint C.
 *
 * Records the real outcome of provider calls so adapter status can be
 * honest: a provider only reads "connected" after a verified successful
 * fetch within the freshness window. Errors are recorded too, so the
 * diagnostics panel can show last-success / last-error per provider.
 *
 * Module memory + localStorage mirror. Never fabricated — only the
 * provider fetchers call recordSuccess / recordError.
 */

export interface ProviderHealth {
  lastSuccess: number | null;
  lastError: number | null;
  lastErrorMsg: string | null;
}

export type HealthState = "connected" | "error" | "none";

const KEY = "promptready-os.provider-health";
const FRESH_MS = 5 * 60 * 1000;

type Store = Record<string, ProviderHealth>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export function getHealth(id: string): ProviderHealth {
  return read()[id] ?? { lastSuccess: null, lastError: null, lastErrorMsg: null };
}

export function recordSuccess(id: string): void {
  const s = read();
  const cur = s[id] ?? { lastSuccess: null, lastError: null, lastErrorMsg: null };
  s[id] = { ...cur, lastSuccess: Date.now() };
  write(s);
}

export function recordError(id: string, msg: string): void {
  const s = read();
  const cur = s[id] ?? { lastSuccess: null, lastError: null, lastErrorMsg: null };
  s[id] = { ...cur, lastError: Date.now(), lastErrorMsg: msg.slice(0, 200) };
  write(s);
}

export function isFresh(id: string, windowMs = FRESH_MS): boolean {
  const h = getHealth(id);
  return !!h.lastSuccess && Date.now() - h.lastSuccess < windowMs;
}

/** Honest rollup: connected (fresh success) · error (error newer than any
 *  fresh success) · none. */
export function healthState(id: string, windowMs = FRESH_MS): HealthState {
  const h = getHealth(id);
  const fresh = !!h.lastSuccess && Date.now() - (h.lastSuccess ?? 0) < windowMs;
  if (fresh) return "connected";
  if (h.lastError && (!h.lastSuccess || h.lastError > h.lastSuccess)) return "error";
  return "none";
}

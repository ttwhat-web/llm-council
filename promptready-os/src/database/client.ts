/**
 * SQLite client — thin wrapper around the Tauri `sqlite` plugin.
 *
 * This file is intentionally small: it owns the connection lifecycle and
 * a parameterised query helper. Domain queries live next to their store
 * (e.g. store/prompts.ts) so concerns stay co-located.
 *
 * Wiring (deferred until the Tauri side is set up):
 *   - tauri-plugin-sqlite-api (or sqlx via a custom command) loads schema.sql
 *     on first launch and runs forward-only migrations from
 *     src/database/migrations/{NNNN}_*.sql.
 *   - All JSON columns are encoded/decoded at this boundary so the rest of
 *     the codebase sees typed objects, not strings.
 */

// TODO(phase-1): replace stub with real Tauri sqlite plugin client.
// import Database from "@tauri-apps/plugin-sql";

export interface DBClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
  transaction<T>(fn: (tx: DBClient) => Promise<T>): Promise<T>;
}

export async function open(): Promise<DBClient> {
  // const db = await Database.load("sqlite:promptready.db");
  // await migrate(db);
  // return wrap(db);
  return stub();
}

function stub(): DBClient {
  return {
    async query() {
      console.warn("[promptready-os] DB client is stubbed — Phase-1 task.");
      return [];
    },
    async execute() {
      return { rowsAffected: 0 };
    },
    async transaction(fn) {
      return fn(stub());
    }
  };
}

// JSON helpers used by every store.
export function encodeJson(value: unknown): string {
  return value == null ? "" : JSON.stringify(value);
}
export function decodeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function nowMs(): number {
  return Date.now();
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

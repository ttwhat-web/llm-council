/**
 * Mission Alert inbox · per-user durable record of every triggered alert.
 *
 * Design mirrors lib/telegram-links.ts:
 *   - typed surface (createAlertRecord / list / markRead / delete)
 *   - in-memory Map<userEmail, AlertRecord[]> for fast reads
 *   - atomic JSON file persistence at `.data/mission-alerts.json` (path
 *     overridable via MISSION_INBOX_FILE)
 *   - silent fallback to in-memory when the fs is read-only (serverless)
 *   - lazy hydrate on first access
 *   - cap MAX_PER_USER per user — newest wins
 *
 * Records are intentionally PII-light:
 *   - the bot token is never recorded
 *   - mission text is truncated to MAX_MISSION_LEN before write
 *   - chat ids are NOT stored — the record only carries `sentTo` ∈
 *     {user, admin, none}
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AlertSeverity, AlertType } from "./mission-alerts";

// ---------- Types ---------------------------------------------------------

export type AlertSentTo = "user" | "admin" | "none";

export interface AlertRecord {
  id: string;
  userEmail: string;
  type: AlertType;
  severity: AlertSeverity;
  mission: string;
  summary: string;
  reason?: string;
  sentTo: AlertSentTo;
  telegramSent: boolean;
  read: boolean;
  /** ISO 8601. */
  createdAt: string;
}

export interface CreateAlertRecordInput {
  userEmail: string;
  type: AlertType;
  severity: AlertSeverity;
  mission: string;
  summary: string;
  reason?: string;
  sentTo: AlertSentTo;
  telegramSent: boolean;
}

interface InboxFile {
  v: 1;
  users: Record<string, AlertRecord[]>;
  savedAt: number;
}

// ---------- Constants -----------------------------------------------------

const MAX_PER_USER = 100;
const MAX_MISSION_LEN = 1000;
const MAX_SUMMARY_LEN = 600;
const MAX_REASON_LEN = 240;

const INBOX_FILE = (() => {
  const explicit = process.env.MISSION_INBOX_FILE;
  if (explicit && explicit.trim()) return explicit.trim();
  return path.join(process.cwd(), ".data", "mission-alerts.json");
})();

// ---------- In-memory state ----------------------------------------------

const byUser = new Map<string, AlertRecord[]>();
let hydrated = false;
let hydrating: Promise<void> | null = null;

// ---------- Lifecycle ----------------------------------------------------

export async function hydrateAlertInbox(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const raw = await fs.readFile(INBOX_FILE, "utf8");
      const snap = JSON.parse(raw) as InboxFile;
      if (snap?.v === 1 && snap.users && typeof snap.users === "object") {
        for (const [email, rows] of Object.entries(snap.users)) {
          if (!Array.isArray(rows)) continue;
          // Trust but verify: drop malformed rows quietly.
          const valid = rows.filter(isAlertRecord);
          if (valid.length > 0) byUser.set(email, valid.slice(0, MAX_PER_USER));
        }
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.warn(`[alert-inbox] hydrate failed: ${(err as Error).message}`);
      }
    } finally {
      hydrated = true;
    }
  })();
  return hydrating;
}

async function persist(): Promise<void> {
  const snap: InboxFile = {
    v: 1,
    users: Object.fromEntries(byUser.entries()),
    savedAt: Date.now()
  };
  try {
    await fs.mkdir(path.dirname(INBOX_FILE), { recursive: true });
    const tmp = `${INBOX_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snap), "utf8");
    await fs.rename(tmp, INBOX_FILE);
  } catch (err) {
    // Read-only fs (serverless) — keep in-memory only.
    console.warn(`[alert-inbox] persist skipped: ${(err as Error).message}`);
  }
}

// ---------- Public surface ------------------------------------------------

export async function createAlertRecord(
  input: CreateAlertRecordInput
): Promise<AlertRecord | null> {
  const userEmail = (input.userEmail || "").trim();
  if (!userEmail) return null;

  await hydrateAlertInbox();

  const record: AlertRecord = {
    id: makeId(),
    userEmail,
    type: input.type,
    severity: input.severity,
    mission: truncate(input.mission, MAX_MISSION_LEN),
    summary: truncate(input.summary, MAX_SUMMARY_LEN),
    reason: input.reason ? truncate(input.reason, MAX_REASON_LEN) : undefined,
    sentTo: input.sentTo,
    telegramSent: Boolean(input.telegramSent),
    read: false,
    createdAt: new Date().toISOString()
  };

  const list = byUser.get(userEmail) ?? [];
  // Newest first; cap.
  const next = [record, ...list].slice(0, MAX_PER_USER);
  byUser.set(userEmail, next);

  // Persistence is best-effort and never blocks the caller's promise on
  // a re-throw — its own catch logs and swallows.
  await persist();
  return record;
}

export async function listAlertRecords(
  userEmail: string,
  limit = 50
): Promise<AlertRecord[]> {
  const id = (userEmail || "").trim();
  if (!id) return [];
  await hydrateAlertInbox();
  const rows = byUser.get(id) ?? [];
  return rows.slice(0, Math.max(0, Math.min(MAX_PER_USER, limit)));
}

export async function unreadAlertCount(userEmail: string): Promise<number> {
  const rows = await listAlertRecords(userEmail, MAX_PER_USER);
  return rows.reduce((acc, r) => acc + (r.read ? 0 : 1), 0);
}

export async function markAlertRead(
  userEmail: string,
  alertId: string,
  read = true
): Promise<boolean> {
  const id = (userEmail || "").trim();
  if (!id || !alertId) return false;
  await hydrateAlertInbox();
  const rows = byUser.get(id);
  if (!rows) return false;
  const idx = rows.findIndex((r) => r.id === alertId);
  if (idx === -1) return false;
  if (rows[idx].read === read) return true; // no-op write
  rows[idx] = { ...rows[idx], read };
  byUser.set(id, rows);
  await persist();
  return true;
}

export async function deleteAlertRecord(
  userEmail: string,
  alertId: string
): Promise<boolean> {
  const id = (userEmail || "").trim();
  if (!id || !alertId) return false;
  await hydrateAlertInbox();
  const rows = byUser.get(id);
  if (!rows) return false;
  const next = rows.filter((r) => r.id !== alertId);
  if (next.length === rows.length) return false;
  if (next.length === 0) byUser.delete(id);
  else byUser.set(id, next);
  await persist();
  return true;
}

// ---------- Test helpers --------------------------------------------------

/** Test only — clears in-memory state and forces re-hydrate next read. */
export function _resetAlertInbox(): void {
  byUser.clear();
  hydrated = false;
  hydrating = null;
}

// ---------- Helpers -------------------------------------------------------

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function truncate(value: string, max: number): string {
  const s = typeof value === "string" ? value : "";
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function isAlertRecord(value: unknown): value is AlertRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.userEmail === "string" &&
    typeof v.type === "string" &&
    typeof v.severity === "string" &&
    typeof v.mission === "string" &&
    typeof v.summary === "string" &&
    typeof v.sentTo === "string" &&
    typeof v.read === "boolean" &&
    typeof v.createdAt === "string"
  );
}

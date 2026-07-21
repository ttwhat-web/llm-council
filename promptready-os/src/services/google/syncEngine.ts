/**
 * Sync engine · UNVERIFIED against live Google APIs from this sandbox.
 *
 * Pulls last 14 days of Gmail messages, next 14 days of Calendar
 * events, and the user's full Contacts list. Caches the WorkspaceSnapshot
 * in localStorage so the briefing can render instantly on next launch
 * without waiting on the network. Re-syncs every 5 minutes while the
 * page is open.
 */

import { fetchUserEmail, syncRecentMail } from "./gmailClient";
import { listEvents } from "./calendarClient";
import { listContacts } from "./contactsClient";
import type { WorkspaceSnapshot } from "./types";

const STORAGE_SNAPSHOT = "operator.google.snapshot.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export const MAIL_WINDOW_DAYS = 14;
export const CALENDAR_WINDOW_DAYS = 14;

export interface SyncResult {
  snapshot: WorkspaceSnapshot;
  errors: string[];
}

export function readSnapshot(): WorkspaceSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_SNAPSHOT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (typeof parsed?.syncedAt !== "number") return null;
    // Coerce every list to an array so a malformed older snapshot
    // can't crash the engine.
    return {
      syncedAt: parsed.syncedAt,
      selfEmail: typeof parsed.selfEmail === "string" ? parsed.selfEmail : "",
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      threads: Array.isArray(parsed.threads) ? parsed.threads : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
    };
  } catch {
    return null;
  }
}

export function writeSnapshot(snap: WorkspaceSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_SNAPSHOT, JSON.stringify(snap));
  } catch {
    // quota exceeded — silently drop the cache; next sync will retry
  }
}

export function clearSnapshot(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_SNAPSHOT);
}

/**
 * Run a full sync. Partial success is allowed: if Calendar fails but
 * Gmail succeeds, the snapshot still ships with Gmail data and the
 * Calendar error in `errors`. The UI surfaces partial state honestly.
 */
export async function runFullSync(): Promise<SyncResult> {
  const errors: string[] = [];

  // 1 · Find self email first (cheap, required by other clients).
  let selfEmail = "";
  try {
    selfEmail = await fetchUserEmail();
  } catch (e) {
    errors.push(`Gmail profile: ${(e as Error).message}`);
  }

  // 2 · Mail
  let messages: WorkspaceSnapshot["messages"] = [];
  let threads: WorkspaceSnapshot["threads"] = [];
  try {
    if (selfEmail) {
      const m = await syncRecentMail(MAIL_WINDOW_DAYS, selfEmail);
      messages = m.messages;
      threads = m.threads;
    }
  } catch (e) {
    errors.push(`Gmail sync: ${(e as Error).message}`);
  }

  // 3 · Calendar
  let events: WorkspaceSnapshot["events"] = [];
  try {
    const now = Date.now();
    events = await listEvents({
      startMs: now - 1 * DAY_MS,
      endMs: now + CALENDAR_WINDOW_DAYS * DAY_MS,
      selfEmail: selfEmail || ""
    });
  } catch (e) {
    errors.push(`Calendar sync: ${(e as Error).message}`);
  }

  // 4 · Contacts
  let contacts: WorkspaceSnapshot["contacts"] = [];
  try {
    contacts = await listContacts();
  } catch (e) {
    errors.push(`Contacts sync: ${(e as Error).message}`);
  }

  const snapshot: WorkspaceSnapshot = {
    syncedAt: Date.now(),
    selfEmail,
    messages,
    threads,
    events,
    contacts
  };
  writeSnapshot(snapshot);
  return { snapshot, errors };
}

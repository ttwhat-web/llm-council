/**
 * Server action audit log · local-only, capped at 200 entries.
 *
 * Every action attempted from the Server Command Center — create /
 * edit / delete profile, restart-service confirm, deploy blocked,
 * probe / list / logs call — is recorded here so the operator has a
 * paper trail. The audit log is read-only from the UI's perspective;
 * the only mutating function is `append`. Clearing the log is its own
 * audited action.
 */

const KEY = "promptready-os.servers.audit.v1";
const MAX = 200;

export type AuditAction =
  | "profile-add"
  | "profile-edit"
  | "profile-delete"
  | "profile-activate"
  | "probe-attempt"
  | "services-attempt"
  | "logs-attempt"
  | "restart-confirm"
  | "restart-cancel"
  | "deploy-blocked"
  | "log-cleared";

export interface AuditEntry {
  at: number;
  action: AuditAction;
  profileId?: string;
  profileName?: string;
  detail: string;
  result: "ok" | "blocked" | "error";
}

function read(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(entries: AuditEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {
    // ignore
  }
}

export function listAudit(): AuditEntry[] {
  return read();
}

export function appendAudit(entry: Omit<AuditEntry, "at">): AuditEntry[] {
  const full: AuditEntry = { ...entry, at: Date.now() };
  const next = [full, ...read()].slice(0, MAX);
  write(next);
  return next;
}

export function clearAudit(): AuditEntry[] {
  const last = read();
  const cleared: AuditEntry = {
    at: Date.now(),
    action: "log-cleared",
    detail: `cleared ${last.length} entries`,
    result: "ok"
  };
  write([cleared]);
  return [cleared];
}

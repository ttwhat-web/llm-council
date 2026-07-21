/**
 * Audit log · Phase 24.
 *
 * Local-only ledger of operator actions. Persists to localStorage so
 * compliance / migration / debug can replay the timeline. Nothing
 * leaves the machine.
 *
 * Callers `auditLog("mission.dispatch", { … })` — kind is namespaced
 * so consumers can filter without parsing free text.
 */

export type AuditKind =
  | "mission.dispatch"
  | "mission.cancel"
  | "workflow.run"
  | "workflow.resume"
  | "workflow.approve"
  | "workflow.reject"
  | "snapshot.export"
  | "snapshot.restore"
  | "brain.restore"
  | "brain.reset"
  | "pack.install"
  | "pack.export"
  | "repo.attach"
  | "repo.detach"
  | "policy.toggle"
  | "telegram.send"
  | "agent.tick";

export interface AuditEntry {
  id: string;
  at: number;
  kind: AuditKind;
  detail: Record<string, unknown>;
}

const STORAGE_KEY = "promptready-os.audit-log";
const MAX_ENTRIES = 500;

function rid() {
  return `a-${Math.random().toString(36).slice(2, 8)}`;
}

export function auditLog(kind: AuditKind, detail: Record<string, unknown> = {}): AuditEntry {
  const entry: AuditEntry = { id: rid(), at: Date.now(), kind, detail };
  if (typeof window === "undefined") return entry;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: AuditEntry[] = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    list.unshift(entry);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore — log is best-effort
  }
  return entry;
}

export function readAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AuditEntry[];
  } catch {
    return [];
  }
}

export function clearAuditLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function exportAuditLogMarkdown(): string {
  const entries = readAuditLog();
  const lines: string[] = [];
  lines.push(`# Operator Center · Operations Archive · Audit log`);
  lines.push("");
  lines.push(`*Generated ${new Date().toISOString()} · ${entries.length} entries · local only*`);
  lines.push("");
  for (const e of entries) {
    lines.push(`- \`${new Date(e.at).toISOString()}\` · **${e.kind}** · ${JSON.stringify(e.detail)}`);
  }
  return lines.join("\n");
}

export function downloadAuditLog(): string {
  if (typeof window === "undefined") return "";
  const md = exportAuditLogMarkdown();
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  const filename = `audit-${stamp}.md`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

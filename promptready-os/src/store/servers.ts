/**
 * Server profiles · local-only storage.
 *
 * Profiles describe how to reach a server. They never store passwords.
 * The actual SSH connection is not made here — it's deferred to the
 * future server agent (see `services/serverAgent.ts`). Until that
 * agent is wired up, profiles are inert configuration objects.
 */

const KEY = "promptready-os.servers.profiles.v1";
const ACTIVE_KEY = "promptready-os.servers.activeId";

export interface ServerProfile {
  id: string;
  name: string;
  host: string;
  sshUser: string;
  port: number;
  tags: string[];
  notes?: string;
  /**
   * Optional path to a private SSH key on the local machine running
   * the Tauri agent (NOT stored on a remote, NOT a key body). When
   * empty, the agent uses the default SSH lookup (e.g. ~/.ssh/config,
   * ssh-agent). The key file itself is never read by the frontend.
   */
  sshKeyPath?: string;
  /** Per-kind allowlists · only names in these arrays can be acted on. */
  allowedPm2Apps: string[];
  allowedDockerContainers: string[];
  allowedSystemdServices: string[];
  createdAt: number;
}

function read(): ServerProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProfile);
  } catch {
    return [];
  }
}

function write(profiles: ServerProfile[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profiles));
  } catch {
    // ignore
  }
}

function isProfile(p: unknown): p is ServerProfile {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.host !== "string" ||
    typeof o.sshUser !== "string" ||
    typeof o.port !== "number" ||
    !Array.isArray(o.tags) ||
    typeof o.createdAt !== "number"
  ) {
    return false;
  }
  // Migrate older saved profiles missing the per-kind allowlists.
  if (!Array.isArray(o.allowedPm2Apps)) o.allowedPm2Apps = [];
  if (!Array.isArray(o.allowedDockerContainers)) o.allowedDockerContainers = [];
  if (!Array.isArray(o.allowedSystemdServices)) o.allowedSystemdServices = [];
  return true;
}

export function newProfileId(): string {
  return `srv-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function listProfiles(): ServerProfile[] {
  return read();
}

export function upsertProfile(p: ServerProfile): ServerProfile[] {
  const list = read();
  const next = list.some((x) => x.id === p.id)
    ? list.map((x) => (x.id === p.id ? p : x))
    : [...list, p];
  write(next);
  return next;
}

export function removeProfile(id: string): ServerProfile[] {
  const next = read().filter((x) => x.id !== id);
  write(next);
  return next;
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id == null) window.localStorage.removeItem(ACTIVE_KEY);
    else window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

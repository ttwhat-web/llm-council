/**
 * Workspace personalization · Sprint FINAL-UX.
 *
 * Customer-configurable workspace: which nav items show in the rail,
 * what the default home + startup mode are, and a compact/comfortable
 * density preference. Persisted locally. Routes are NEVER removed —
 * hiding a nav item only hides it from the rail; the route still works
 * via the command palette / direct URL.
 */

import { useEffect, useState } from "react";

export type NavId =
  | "atlas"
  | "mission-control"
  | "market-lab"
  | "terminal"
  | "voice"
  | "memory"
  | "library"
  | "brain"
  | "agents"
  | "workflows"
  | "marketplace"
  | "server"
  | "settings";

export const NAV_ITEMS: Array<{ id: NavId; label: string }> = [
  { id: "atlas", label: "Atlas" },
  { id: "mission-control", label: "Mission Control" },
  { id: "market-lab", label: "Market Lab" },
  { id: "terminal", label: "Intelligence Terminal" },
  { id: "voice", label: "Voice · Jarvis" },
  { id: "memory", label: "Memory" },
  { id: "library", label: "Library" },
  { id: "brain", label: "Brain" },
  { id: "agents", label: "Agents" },
  { id: "workflows", label: "Workflows" },
  { id: "marketplace", label: "Marketplace" },
  { id: "server", label: "Server" },
  { id: "settings", label: "Settings" }
];

export type DefaultHome = "atlas" | "market-lab" | "voice" | "terminal";
export type StartupMode = "operator" | "market" | "voice" | "focus";
export type Density = "compact" | "comfortable";

interface WorkspaceState {
  hiddenNav: NavId[];
  defaultHome: DefaultHome;
  startupMode: StartupMode;
  density: Density;
}

const KEY = "promptready-os.ui.workspace";

const DEFAULTS: WorkspaceState = {
  hiddenNav: [],
  defaultHome: "atlas",
  startupMode: "operator",
  density: "comfortable"
};

function read(): WorkspaceState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function write(s: WorkspaceState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// In-module cache + cross-component subscribers so the rail and the
// Settings card stay in sync without dragging in zustand for one panel.
let cached: WorkspaceState = read();
const subs = new Set<() => void>();
function notify() {
  cached = read();
  subs.forEach((cb) => cb());
}

export function getWorkspace(): WorkspaceState {
  return cached;
}

export function updateWorkspace(patch: Partial<WorkspaceState>): void {
  const next = { ...cached, ...patch };
  cached = next;
  write(next);
  subs.forEach((cb) => cb());
}

export function toggleNavHidden(id: NavId): void {
  const hidden = cached.hiddenNav.includes(id)
    ? cached.hiddenNav.filter((x) => x !== id)
    : [...cached.hiddenNav, id];
  updateWorkspace({ hiddenNav: hidden });
}

export function isNavHidden(id: NavId): boolean {
  return cached.hiddenNav.includes(id);
}

export function useWorkspace(): WorkspaceState {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  }, []);
  // Re-sync from storage on mount so a fresh tab/window picks up changes.
  useEffect(() => {
    notify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return cached;
}

export const DEFAULT_HOME_PATHS: Record<DefaultHome, string> = {
  atlas: "/",
  "market-lab": "/market-lab",
  voice: "/voice",
  terminal: "/terminal"
};

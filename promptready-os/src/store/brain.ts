/**
 * Brain store · Phase 12.
 *
 * The "Build your own AI Brain" surface needs a single source of truth
 * for the user's brain identity, connected sources, engines, vault and
 * mission counters, and the bootstrap flag.
 *
 * Persistence: localStorage (key `promptready-os.brain`). Wired this way
 * so the preview works without Tauri. When the desktop runtime ships,
 * the same shape moves into a Tauri-managed file.
 */

import { create } from "zustand";

export type BrainMode =
  | "creator"
  | "researcher"
  | "builder"
  | "trader"
  | "custom";

export type MemorySourceKind =
  | "brain-notes"
  | "obsidian"
  | "github"
  | "drive"
  | "local-folder";

export type EngineKind = "deterministic" | "ollama" | "cloud";

export type ConnectorState =
  | "active"
  | "manual"
  | "configured"
  | "not-connected";

export interface MemorySource {
  id: string;
  kind: MemorySourceKind;
  label: string;
  state: ConnectorState;
}

export interface Engine {
  id: string;
  kind: EngineKind;
  label: string;
  state: ConnectorState;
}

export interface BrainIdentity {
  name: string;
  mode: BrainMode;
  createdAt: number;
}

export interface BrainState {
  bootstrapped: boolean;
  demo: boolean;
  identity: BrainIdentity | null;
  memorySources: MemorySource[];
  engines: Engine[];
  vaultCount: number;
  missionCount: number;
  knowledgePacks: number;
  lastActivity: number | null;

  // actions
  bootstrap(config: {
    name: string;
    mode: BrainMode;
    sources: MemorySourceKind[];
    engines: EngineKind[];
  }): void;
  enableDemo(): void;
  addMemorySource(s: Omit<MemorySource, "id">): void;
  removeMemorySource(id: string): void;
  enableEngine(kind: EngineKind): void;
  bumpMission(): void;
  reset(): void;
  hydrate(): void;
}

const STORAGE_KEY = "promptready-os.brain";

const SOURCE_LABEL: Record<MemorySourceKind, string> = {
  "brain-notes": "Brain Notes",
  obsidian: "Obsidian vault",
  github: "GitHub repos",
  drive: "Google Drive",
  "local-folder": "Local folder"
};

const ENGINE_LABEL: Record<EngineKind, string> = {
  deterministic: "Deterministic rules engine",
  ollama: "Ollama · local models",
  cloud: "Cloud · BYOK providers"
};

function loadFromStorage(): Partial<BrainState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<BrainState>;
  } catch {
    return null;
  }
}

function saveToStorage(state: BrainState) {
  if (typeof window === "undefined") return;
  try {
    const persisted = {
      bootstrapped: state.bootstrapped,
      demo: state.demo,
      identity: state.identity,
      memorySources: state.memorySources,
      engines: state.engines,
      vaultCount: state.vaultCount,
      missionCount: state.missionCount,
      knowledgePacks: state.knowledgePacks,
      lastActivity: state.lastActivity
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // localStorage might be unavailable (private mode, quota). Ignore.
  }
}

const EMPTY: Omit<
  BrainState,
  | "bootstrap"
  | "enableDemo"
  | "addMemorySource"
  | "removeMemorySource"
  | "enableEngine"
  | "bumpMission"
  | "reset"
  | "hydrate"
> = {
  bootstrapped: false,
  demo: false,
  identity: null,
  memorySources: [],
  engines: [],
  vaultCount: 0,
  missionCount: 0,
  knowledgePacks: 0,
  lastActivity: null
};

const DEMO_BRAIN: typeof EMPTY = {
  bootstrapped: true,
  demo: true,
  identity: { name: "Atlas", mode: "builder", createdAt: Date.now() },
  memorySources: [
    { id: "demo-1", kind: "brain-notes", label: SOURCE_LABEL["brain-notes"], state: "manual" },
    { id: "demo-2", kind: "obsidian", label: SOURCE_LABEL.obsidian, state: "configured" }
  ],
  engines: [
    { id: "demo-e1", kind: "deterministic", label: ENGINE_LABEL.deterministic, state: "active" }
  ],
  vaultCount: 1,
  missionCount: 23,
  knowledgePacks: 2,
  lastActivity: Date.now() - 1000 * 60 * 17
};

export const useBrainStore = create<BrainState>((set, get) => ({
  ...EMPTY,

  bootstrap(config) {
    const identity: BrainIdentity = {
      name: config.name.trim() || "Brain",
      mode: config.mode,
      createdAt: Date.now()
    };
    const memorySources: MemorySource[] = config.sources.map((kind) => ({
      id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      label: SOURCE_LABEL[kind],
      state: kind === "brain-notes" ? "manual" : "configured"
    }));
    const engines: Engine[] = config.engines.map((kind) => ({
      id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      label: ENGINE_LABEL[kind],
      state: kind === "deterministic" ? "active" : "configured"
    }));
    const next: BrainState = {
      ...get(),
      bootstrapped: true,
      demo: false,
      identity,
      memorySources,
      engines,
      vaultCount: 0,
      missionCount: 0,
      knowledgePacks: 0,
      lastActivity: Date.now()
    };
    set(next);
    saveToStorage(next);
  },

  enableDemo() {
    const next = { ...get(), ...DEMO_BRAIN };
    set(next);
    saveToStorage(next);
  },

  addMemorySource(s) {
    const memorySources = [
      ...get().memorySources,
      { ...s, id: `${s.kind}-${Math.random().toString(36).slice(2, 8)}` }
    ];
    const next = { ...get(), memorySources };
    set(next);
    saveToStorage(next);
  },

  removeMemorySource(id) {
    const memorySources = get().memorySources.filter((s) => s.id !== id);
    const next = { ...get(), memorySources };
    set(next);
    saveToStorage(next);
  },

  enableEngine(kind) {
    if (get().engines.some((e) => e.kind === kind)) return;
    const engines = [
      ...get().engines,
      {
        id: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        label: ENGINE_LABEL[kind],
        state: kind === "deterministic" ? ("active" as ConnectorState) : ("configured" as ConnectorState)
      }
    ];
    const next = { ...get(), engines };
    set(next);
    saveToStorage(next);
  },

  bumpMission() {
    const next = {
      ...get(),
      missionCount: get().missionCount + 1,
      lastActivity: Date.now()
    };
    set(next);
    saveToStorage(next);
  },

  reset() {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    set({ ...EMPTY });
  },

  hydrate() {
    const loaded = loadFromStorage();
    if (!loaded) return;
    set({ ...EMPTY, ...loaded });
  }
}));

export const BRAIN_NAMES = ["Atlas", "Nova", "Vega"] as const;

export const BRAIN_MODE_OPTIONS: Array<{
  value: BrainMode;
  label: string;
  blurb: string;
}> = [
  { value: "creator", label: "Creator", blurb: "Writing, drafting, visual work, storytelling." },
  { value: "researcher", label: "Researcher", blurb: "Literature, summaries, citations, evidence." },
  { value: "builder", label: "Builder", blurb: "Code, architecture, shipping software." },
  { value: "trader", label: "Trader", blurb: "Markets, monitoring, signals, journaling." },
  { value: "custom", label: "Custom", blurb: "Roll your own taxonomy later." }
];

export const MEMORY_OPTIONS: Array<{
  value: MemorySourceKind;
  label: string;
  blurb: string;
  state: "manual" | "configured";
}> = [
  {
    value: "brain-notes",
    label: "Brain Notes",
    blurb: "Hand-typed notes captured on the Memory page.",
    state: "manual"
  },
  {
    value: "obsidian",
    label: "Obsidian vault",
    blurb: "Index a folder of markdown notes (configured · not yet syncing).",
    state: "configured"
  },
  {
    value: "github",
    label: "GitHub",
    blurb: "Issues · PRs · READMEs (configured · sync lands with desktop runtime).",
    state: "configured"
  },
  {
    value: "drive",
    label: "Google Drive",
    blurb: "Docs and sheets in a chosen folder (configured · pending OAuth).",
    state: "configured"
  },
  {
    value: "local-folder",
    label: "Local folder",
    blurb: "Any directory of text · md · pdf · code (configured).",
    state: "configured"
  }
];

export const ENGINE_OPTIONS: Array<{
  value: EngineKind;
  label: string;
  blurb: string;
}> = [
  {
    value: "deterministic",
    label: "Deterministic",
    blurb: "Rules engine · always-on · runs without any model."
  },
  {
    value: "ollama",
    label: "Ollama",
    blurb: "Local models on your machine. Probed on first dispatch."
  },
  {
    value: "cloud",
    label: "Cloud",
    blurb: "BYOK · Anthropic · OpenAI · Google. Optional accelerator."
  }
];

export { SOURCE_LABEL, ENGINE_LABEL };

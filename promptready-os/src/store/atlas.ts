/**
 * Atlas store · Phase 15.
 *
 * Owns the persistent state that lives only inside Mission Atlas:
 *
 *   homeMode      · which Atlas view the user last left open
 *                   ("blueprint" | "operations" | "live")
 *   files         · metadata for files the operator dropped into the
 *                   Memory Vault. We do NOT store file content in
 *                   localStorage (would blow the quota). When the
 *                   desktop runtime lands, content moves to disk.
 *   workflowNodes · n8n-style canvas nodes (kind · label · x · y).
 *   workflowEdges · directed edges between node ids.
 *   pinnedDeliverables · ids the operator pinned in the Delivery
 *                   Center.
 *   pairingCode   · 8-char code for the planned mobile companion. Real
 *                   in that it's stable on this machine; "planned"
 *                   because no networking is wired.
 */

import { create } from "zustand";

export type AtlasHomeMode = "blueprint" | "operations" | "live";

export type WorkflowNodeKind =
  | "mission"
  | "repo"
  | "memory"
  | "agent"
  | "export"
  | "approval";

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  label: string;
  x: number;
  y: number;
}

export interface WorkflowRunStep {
  at: number;
  nodeId: string;
  kind: WorkflowNodeKind;
  state: "ok" | "blocked" | "skipped" | "approval-required";
  message: string;
}

export interface WorkflowRun {
  id: string;
  startedAt: number;
  endedAt?: number;
  steps: WorkflowRunStep[];
  status: "running" | "completed" | "blocked" | "awaiting-approval";
}

// ---------- Brain Inbox ----------
export type InboxKind = "text" | "url" | "file" | "repo" | "voice" | "image";
export type InboxState = "new" | "attached" | "used" | "archived";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  body: string;
  meta?: string;
  addedAt: number;
  state: InboxState;
}

// ---------- Imported memory docs ----------
export interface MemoryDoc {
  id: string;
  name: string;
  path?: string;
  ext: string;
  size: number;
  body: string;
  addedAt: number;
}

// ---------- Snapshots ----------
export interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: number;
  size: number;
}

// In-memory payloads for Time Machine restore. Capped to last 5 to
// stay inside localStorage budget.
export interface SnapshotPayload {
  id: string;
  payload: unknown;
}

// ---------- Recovery checkpoint ----------
// A snapshot of "what was running" persisted on every state change so
// boot can offer "Resume?" when a session ended mid-flight.
export interface RecoveryCheckpoint {
  savedAt: number;
  hadInFlightMission: boolean;
  inFlightMissionId?: string;
  inFlightStage?: string;
  pausedWorkflowId?: string;
}

// ---------- Agent queue ----------
export type AgentKind =
  | "research"
  | "builder"
  | "memory"
  | "repo"
  | "marketing";
export type AgentState =
  | "idle"
  | "running"
  | "blocked"
  | "waiting"
  | "approval";

export interface AgentSlot {
  kind: AgentKind;
  state: AgentState;
  assignedMissionId?: string;
}

// ---------- Telegram pairing ----------
export interface TelegramLink {
  code: string;
  createdAt: number;
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface AtlasFile {
  id: string;
  name: string;
  size: number;
  type: string;
  addedAt: number;
  state: "queued" | "indexed" | "not-processed";
}

interface AtlasState {
  homeMode: AtlasHomeMode;
  files: AtlasFile[];
  workflowNodes: WorkflowNode[];
  workflowEdges: WorkflowEdge[];
  workflowRuns: WorkflowRun[];
  pinnedDeliverables: string[];
  pairingCode: string | null;
  telegram: TelegramLink | null;
  inbox: InboxItem[];
  memoryDocs: MemoryDoc[];
  snapshots: SnapshotMeta[];
  recentSnapshotPayloads: SnapshotPayload[];
  agents: AgentSlot[];
  recovery: RecoveryCheckpoint | null;

  setHomeMode(m: AtlasHomeMode): void;
  addFiles(files: Array<Omit<AtlasFile, "id" | "addedAt" | "state">>): void;
  removeFile(id: string): void;
  addWorkflowNode(n: Omit<WorkflowNode, "id">): void;
  moveWorkflowNode(id: string, x: number, y: number): void;
  renameWorkflowNode(id: string, label: string): void;
  removeWorkflowNode(id: string): void;
  toggleEdge(from: string, to: string): void;
  clearWorkflow(): void;
  recordWorkflowRun(r: WorkflowRun): void;
  clearWorkflowRuns(): void;
  togglePin(deliverableId: string): void;
  generatePairingCode(): string;
  clearPairing(): void;
  generateTelegramLink(): string;
  clearTelegramLink(): void;
  addInbox(item: Omit<InboxItem, "id" | "addedAt" | "state">): InboxItem;
  setInboxState(id: string, state: InboxState): void;
  removeInbox(id: string): void;
  addMemoryDocs(docs: Array<Omit<MemoryDoc, "id" | "addedAt">>): MemoryDoc[];
  removeMemoryDoc(id: string): void;
  recordSnapshot(m: Omit<SnapshotMeta, "id" | "createdAt">, payload?: unknown): void;
  removeSnapshot(id: string): void;
  restoreFromRecent(id: string): boolean;
  setAgentState(kind: AgentKind, state: AgentState, missionId?: string): void;
  setRecovery(c: RecoveryCheckpoint | null): void;
  clearRecovery(): void;
  hydrate(): void;
  exportAll(): unknown;
  importAll(payload: unknown): boolean;
}

const STORAGE_KEY = "promptready-os.atlas";

const DEFAULT_AGENTS: AgentSlot[] = [
  { kind: "research", state: "idle" },
  { kind: "builder", state: "idle" },
  { kind: "memory", state: "idle" },
  { kind: "repo", state: "idle" },
  { kind: "marketing", state: "idle" }
];

const DEFAULT = {
  homeMode: "blueprint" as AtlasHomeMode,
  files: [] as AtlasFile[],
  workflowNodes: [] as WorkflowNode[],
  workflowEdges: [] as WorkflowEdge[],
  workflowRuns: [] as WorkflowRun[],
  pinnedDeliverables: [] as string[],
  pairingCode: null as string | null,
  telegram: null as TelegramLink | null,
  inbox: [] as InboxItem[],
  memoryDocs: [] as MemoryDoc[],
  snapshots: [] as SnapshotMeta[],
  recentSnapshotPayloads: [] as SnapshotPayload[],
  agents: DEFAULT_AGENTS,
  recovery: null as RecoveryCheckpoint | null
};

const RECENT_PAYLOAD_LIMIT = 5;
const RECENT_PAYLOAD_MAX_BYTES = 600_000; // skip in-memory keep for big snapshots

function save(state: AtlasState) {
  if (typeof window === "undefined") return;
  try {
    const persisted = {
      homeMode: state.homeMode,
      files: state.files,
      workflowNodes: state.workflowNodes,
      workflowEdges: state.workflowEdges,
      workflowRuns: state.workflowRuns.slice(0, 20),
      pinnedDeliverables: state.pinnedDeliverables,
      pairingCode: state.pairingCode,
      telegram: state.telegram,
      inbox: state.inbox,
      memoryDocs: state.memoryDocs,
      snapshots: state.snapshots,
      recentSnapshotPayloads: state.recentSnapshotPayloads,
      agents: state.agents,
      recovery: state.recovery
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // ignore — storage might be full; future saves will retry
  }
}

function rid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function makePairingCode() {
  // 8 chars · 4-4 grouped · uppercase. Stable per device until cleared.
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export const useAtlasStore = create<AtlasState>((set, get) => ({
  ...DEFAULT,

  setHomeMode(m) {
    const next = { ...get(), homeMode: m };
    set(next);
    save(next);
  },

  addFiles(files) {
    const now = Date.now();
    const incoming: AtlasFile[] = files.map((f) => ({
      ...f,
      id: rid("file"),
      addedAt: now,
      state: "queued"
    }));
    const next = { ...get(), files: [...incoming, ...get().files].slice(0, 200) };
    set(next);
    save(next);
  },

  removeFile(id) {
    const next = { ...get(), files: get().files.filter((f) => f.id !== id) };
    set(next);
    save(next);
  },

  addWorkflowNode(n) {
    const node: WorkflowNode = { ...n, id: rid("n") };
    const next = { ...get(), workflowNodes: [...get().workflowNodes, node] };
    set(next);
    save(next);
  },

  moveWorkflowNode(id, x, y) {
    const next = {
      ...get(),
      workflowNodes: get().workflowNodes.map((n) =>
        n.id === id ? { ...n, x, y } : n
      )
    };
    set(next);
    save(next);
  },

  renameWorkflowNode(id, label) {
    const next = {
      ...get(),
      workflowNodes: get().workflowNodes.map((n) =>
        n.id === id ? { ...n, label } : n
      )
    };
    set(next);
    save(next);
  },

  removeWorkflowNode(id) {
    const next = {
      ...get(),
      workflowNodes: get().workflowNodes.filter((n) => n.id !== id),
      workflowEdges: get().workflowEdges.filter(
        (e) => e.from !== id && e.to !== id
      )
    };
    set(next);
    save(next);
  },

  toggleEdge(from, to) {
    if (from === to) return;
    const edges = get().workflowEdges;
    const exists = edges.some((e) => e.from === from && e.to === to);
    const nextEdges = exists
      ? edges.filter((e) => !(e.from === from && e.to === to))
      : [...edges, { from, to }];
    const next = { ...get(), workflowEdges: nextEdges };
    set(next);
    save(next);
  },

  clearWorkflow() {
    const next = { ...get(), workflowNodes: [], workflowEdges: [] };
    set(next);
    save(next);
  },

  togglePin(id) {
    const pinned = get().pinnedDeliverables;
    const nextPinned = pinned.includes(id)
      ? pinned.filter((x) => x !== id)
      : [...pinned, id].slice(0, 50);
    const next = { ...get(), pinnedDeliverables: nextPinned };
    set(next);
    save(next);
  },

  generatePairingCode() {
    const code = makePairingCode();
    const next = { ...get(), pairingCode: code };
    set(next);
    save(next);
    return code;
  },

  clearPairing() {
    const next = { ...get(), pairingCode: null };
    set(next);
    save(next);
  },

  recordWorkflowRun(r) {
    const next = {
      ...get(),
      workflowRuns: [r, ...get().workflowRuns].slice(0, 20)
    };
    set(next);
    save(next);
  },

  clearWorkflowRuns() {
    const next = { ...get(), workflowRuns: [] };
    set(next);
    save(next);
  },

  generateTelegramLink() {
    const code = makePairingCode();
    const next = {
      ...get(),
      telegram: { code, createdAt: Date.now() }
    };
    set(next);
    save(next);
    return code;
  },

  clearTelegramLink() {
    const next = { ...get(), telegram: null };
    set(next);
    save(next);
  },

  addInbox(item) {
    const created: InboxItem = {
      ...item,
      id: rid("ix"),
      addedAt: Date.now(),
      state: "new"
    };
    const next = { ...get(), inbox: [created, ...get().inbox].slice(0, 200) };
    set(next);
    save(next);
    return created;
  },

  setInboxState(id, state) {
    const next = {
      ...get(),
      inbox: get().inbox.map((i) => (i.id === id ? { ...i, state } : i))
    };
    set(next);
    save(next);
  },

  removeInbox(id) {
    const next = { ...get(), inbox: get().inbox.filter((i) => i.id !== id) };
    set(next);
    save(next);
  },

  addMemoryDocs(docs) {
    const now = Date.now();
    const created: MemoryDoc[] = docs.map((d) => ({
      ...d,
      id: rid("doc"),
      addedAt: now
    }));
    const next = {
      ...get(),
      memoryDocs: [...created, ...get().memoryDocs].slice(0, 500)
    };
    set(next);
    save(next);
    return created;
  },

  removeMemoryDoc(id) {
    const next = {
      ...get(),
      memoryDocs: get().memoryDocs.filter((d) => d.id !== id)
    };
    set(next);
    save(next);
  },

  recordSnapshot(m, payload) {
    const id = rid("snap");
    const created: SnapshotMeta = {
      ...m,
      id,
      createdAt: Date.now()
    };
    // Keep the payload in memory for the Time Machine, but only if it
    // fits the budget. Older payloads are dropped first.
    let recentSnapshotPayloads = get().recentSnapshotPayloads;
    if (payload !== undefined) {
      let serialized = "";
      try {
        serialized = JSON.stringify(payload);
      } catch {
        serialized = "";
      }
      if (serialized && serialized.length <= RECENT_PAYLOAD_MAX_BYTES) {
        recentSnapshotPayloads = [{ id, payload }, ...recentSnapshotPayloads].slice(
          0,
          RECENT_PAYLOAD_LIMIT
        );
      }
    }
    const next = {
      ...get(),
      snapshots: [created, ...get().snapshots].slice(0, 25),
      recentSnapshotPayloads
    };
    set(next);
    save(next);
  },

  removeSnapshot(id) {
    const next = {
      ...get(),
      snapshots: get().snapshots.filter((s) => s.id !== id),
      recentSnapshotPayloads: get().recentSnapshotPayloads.filter((p) => p.id !== id)
    };
    set(next);
    save(next);
  },

  restoreFromRecent(id) {
    const found = get().recentSnapshotPayloads.find((p) => p.id === id);
    if (!found) return false;
    return get().importAll(
      (found.payload as { payload?: unknown })?.payload ?? found.payload
    );
  },

  setAgentState(kind, state, missionId) {
    const next = {
      ...get(),
      agents: get().agents.map((a) =>
        a.kind === kind ? { ...a, state, assignedMissionId: missionId } : a
      )
    };
    set(next);
    save(next);
  },

  setRecovery(c) {
    const next = { ...get(), recovery: c };
    set(next);
    save(next);
  },

  clearRecovery() {
    const next = { ...get(), recovery: null };
    set(next);
    save(next);
  },

  exportAll() {
    const s = get();
    return {
      homeMode: s.homeMode,
      files: s.files,
      workflowNodes: s.workflowNodes,
      workflowEdges: s.workflowEdges,
      workflowRuns: s.workflowRuns,
      pinnedDeliverables: s.pinnedDeliverables,
      pairingCode: s.pairingCode,
      telegram: s.telegram,
      inbox: s.inbox,
      memoryDocs: s.memoryDocs,
      snapshots: s.snapshots,
      agents: s.agents
    };
  },

  importAll(payload) {
    if (!payload || typeof payload !== "object") return false;
    const p = payload as Partial<AtlasState>;
    const next = { ...get(), ...DEFAULT, ...p };
    set(next);
    save(next);
    return true;
  },

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AtlasState>;
      // Ensure default agents seeded even on older saves.
      const merged = {
        ...DEFAULT,
        ...parsed,
        agents:
          parsed.agents && parsed.agents.length > 0
            ? parsed.agents
            : DEFAULT_AGENTS
      };
      set(merged);
    } catch {
      // ignore
    }
  }
}));

export const WORKFLOW_NODE_META: Record<
  WorkflowNodeKind,
  { label: string; blurb: string }
> = {
  mission: { label: "Mission", blurb: "Dispatch a brief through the engine." },
  repo: { label: "Repo", blurb: "Attach a GitHub repo as context." },
  memory: { label: "Memory", blurb: "Brain notes + connector context." },
  agent: { label: "Agent", blurb: "Long-running operator (planned)." },
  export: { label: "Export", blurb: "Save deliverables externally." },
  approval: { label: "Approval", blurb: "Human / phone-side gate." }
};

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
  pinnedDeliverables: string[];
  pairingCode: string | null;

  setHomeMode(m: AtlasHomeMode): void;
  addFiles(files: Array<Omit<AtlasFile, "id" | "addedAt" | "state">>): void;
  removeFile(id: string): void;
  addWorkflowNode(n: Omit<WorkflowNode, "id">): void;
  moveWorkflowNode(id: string, x: number, y: number): void;
  renameWorkflowNode(id: string, label: string): void;
  removeWorkflowNode(id: string): void;
  toggleEdge(from: string, to: string): void;
  clearWorkflow(): void;
  togglePin(deliverableId: string): void;
  generatePairingCode(): string;
  clearPairing(): void;
  hydrate(): void;
}

const STORAGE_KEY = "promptready-os.atlas";

const DEFAULT: Omit<AtlasState,
  | "setHomeMode"
  | "addFiles"
  | "removeFile"
  | "addWorkflowNode"
  | "moveWorkflowNode"
  | "renameWorkflowNode"
  | "removeWorkflowNode"
  | "toggleEdge"
  | "clearWorkflow"
  | "togglePin"
  | "generatePairingCode"
  | "clearPairing"
  | "hydrate"> = {
  homeMode: "blueprint",
  files: [],
  workflowNodes: [],
  workflowEdges: [],
  pinnedDeliverables: [],
  pairingCode: null
};

function save(state: AtlasState) {
  if (typeof window === "undefined") return;
  try {
    const persisted = {
      homeMode: state.homeMode,
      files: state.files,
      workflowNodes: state.workflowNodes,
      workflowEdges: state.workflowEdges,
      pinnedDeliverables: state.pinnedDeliverables,
      pairingCode: state.pairingCode
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // ignore
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

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AtlasState>;
      set({ ...DEFAULT, ...parsed });
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

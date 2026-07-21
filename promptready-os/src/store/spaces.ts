/**
 * Brain Spaces · Phase 21.
 *
 * Multiple brain workspaces in one local install. Each space holds:
 *
 *   · identity / mode / sources / engines (mirrors brain store)
 *   · receipts, workflows, inbox, memory docs (mirrors mission +
 *     atlas slices)
 *
 * For now the active space is the live brain + atlas + mission state;
 * "switching" packs the current state into the previous space and
 * unpacks the target into the live stores. Tauri keychain integration
 * later moves each space to a dedicated on-disk folder.
 *
 * Roles are a label-only concept today (Owner / Operator / Viewer /
 * Approver / Guest). Enforcement lands with the team runtime.
 */

import { create } from "zustand";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

export type SpaceKind = "personal" | "startup" | "client" | "research" | "lab";

export type Role = "owner" | "operator" | "viewer" | "approver" | "guest";

export interface SpaceMember {
  id: string;
  email?: string;
  label: string;
  role: Role;
  inviteCode?: string;
  joinedAt?: number;
  status: "active" | "invited";
}

export interface BrainSpace {
  id: string;
  name: string;
  kind: SpaceKind;
  createdAt: number;
  /** Packed brain + mission + atlas state for inactive spaces. */
  payload?: unknown;
  members: SpaceMember[];
}

interface SpacesState {
  spaces: BrainSpace[];
  activeId: string | null;
  hydrate(): void;
  createSpace(name: string, kind: SpaceKind): BrainSpace;
  switchTo(id: string): boolean;
  renameSpace(id: string, name: string): void;
  removeSpace(id: string): void;
  cloneSpace(id: string, name: string): BrainSpace | null;
  archiveSpace(id: string): void;
  addMember(spaceId: string, label: string, role: Role): SpaceMember | null;
  removeMember(spaceId: string, memberId: string): void;
}

const STORAGE_KEY = "promptready-os.spaces";

function rid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function packCurrent(): unknown {
  return {
    brain: useBrainStore.getState(),
    mission: { history: useMissionStore.getState().history },
    atlas: useAtlasStore.getState().exportAll()
  };
}

function unpackInto(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as {
    brain?: Partial<ReturnType<typeof useBrainStore.getState>>;
    mission?: { history?: ReturnType<typeof useMissionStore.getState>["history"] };
    atlas?: unknown;
  };
  if (p.brain) {
    useBrainStore.setState((cur) => ({ ...cur, ...p.brain }));
  } else {
    useBrainStore.getState().reset();
  }
  if (p.mission?.history) {
    useMissionStore.getState().setHistory(p.mission.history);
  } else {
    useMissionStore.getState().setHistory([]);
  }
  if (p.atlas) {
    useAtlasStore.getState().importAll(p.atlas);
  }
  return true;
}

function save(state: SpacesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ spaces: state.spaces, activeId: state.activeId })
    );
  } catch {
    // ignore
  }
}

function makeInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

export const useSpacesStore = create<SpacesState>((set, get) => ({
  spaces: [],
  activeId: null,

  hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SpacesState>;
      set({
        spaces: parsed.spaces ?? [],
        activeId: parsed.activeId ?? null
      });
    } catch {
      // ignore
    }
  },

  createSpace(name, kind) {
    const id = rid("space");
    const space: BrainSpace = {
      id,
      name,
      kind,
      createdAt: Date.now(),
      members: [
        {
          id: rid("mem"),
          label: "you",
          role: "owner",
          status: "active",
          joinedAt: Date.now()
        }
      ]
    };
    const next = { ...get(), spaces: [...get().spaces, space] };
    set(next);
    save(next as SpacesState);
    return space;
  },

  switchTo(id) {
    const target = get().spaces.find((s) => s.id === id);
    if (!target) return false;
    const activeId = get().activeId;
    const updated = [...get().spaces];

    // Pack current live state into the previously active space.
    if (activeId) {
      const idx = updated.findIndex((s) => s.id === activeId);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], payload: packCurrent() };
      }
    }

    // Unpack target payload into the live stores.
    if (target.payload) {
      unpackInto(target.payload);
    } else {
      // Fresh space — clear live state.
      useBrainStore.getState().reset();
      useMissionStore.getState().setHistory([]);
      useAtlasStore.setState({
        files: [],
        workflowNodes: [],
        workflowEdges: [],
        workflowRuns: [],
        pinnedDeliverables: [],
        inbox: [],
        memoryDocs: [],
        snapshots: [],
        recentSnapshotPayloads: [],
        recovery: null,
        bridgeMessages: []
      });
    }

    const next = { ...get(), spaces: updated, activeId: id };
    set(next);
    save(next as SpacesState);
    return true;
  },

  renameSpace(id, name) {
    const next = {
      ...get(),
      spaces: get().spaces.map((s) => (s.id === id ? { ...s, name } : s))
    };
    set(next);
    save(next as SpacesState);
  },

  removeSpace(id) {
    if (get().activeId === id) return; // can't remove the active space
    const next = {
      ...get(),
      spaces: get().spaces.filter((s) => s.id !== id)
    };
    set(next);
    save(next as SpacesState);
  },

  cloneSpace(id, name) {
    const src = get().spaces.find((s) => s.id === id);
    if (!src) return null;
    const payload = id === get().activeId ? packCurrent() : src.payload;
    const cloned: BrainSpace = {
      ...src,
      id: rid("space"),
      name,
      createdAt: Date.now(),
      payload,
      members: src.members.map((m) => ({ ...m, id: rid("mem") }))
    };
    const next = { ...get(), spaces: [...get().spaces, cloned] };
    set(next);
    save(next as SpacesState);
    return cloned;
  },

  archiveSpace(id) {
    // Archive = nothing more than removing it from the active set;
    // because removal is gated by activeId, archive simply renames
    // with an [archived] prefix to make it visible.
    const next = {
      ...get(),
      spaces: get().spaces.map((s) =>
        s.id === id && !s.name.startsWith("[archived]")
          ? { ...s, name: `[archived] ${s.name}` }
          : s
      )
    };
    set(next);
    save(next as SpacesState);
  },

  addMember(spaceId, label, role) {
    const space = get().spaces.find((s) => s.id === spaceId);
    if (!space) return null;
    const member: SpaceMember = {
      id: rid("mem"),
      label,
      role,
      inviteCode: makeInviteCode(),
      status: "invited"
    };
    const updated = {
      ...space,
      members: [...space.members, member]
    };
    const next = {
      ...get(),
      spaces: get().spaces.map((s) => (s.id === spaceId ? updated : s))
    };
    set(next);
    save(next as SpacesState);
    return member;
  },

  removeMember(spaceId, memberId) {
    const next = {
      ...get(),
      spaces: get().spaces.map((s) =>
        s.id === spaceId
          ? { ...s, members: s.members.filter((m) => m.id !== memberId) }
          : s
      )
    };
    set(next);
    save(next as SpacesState);
  }
}));

export const SPACE_KIND_LABEL: Record<SpaceKind, string> = {
  personal: "Personal Brain",
  startup: "Startup Brain",
  client: "Client Brain",
  research: "Research Brain",
  lab: "Private Lab"
};

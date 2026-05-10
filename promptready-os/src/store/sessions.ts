/**
 * Sessions store · Session Continuity state.
 *
 * Owned data:
 *   - sessions  (history of completed / failed / recovered runs)
 *   - drafts    (autosave for in-flight composition)
 *   - snapshots (timeline of stages within a single session)
 *
 * Behaviour:
 *   - autosave drafts on a debounce window from useSettingsStore.autosaveMs
 *   - on app open, surface drafts in `recoverable` and let the UI prompt
 *     the user to restore, dismiss, or archive
 *   - sessions are append-only from the user's perspective
 */

import { create } from "zustand";
import type { Draft, ID, Session, SessionStatus, Snapshot } from "@/types";

interface SessionsState {
  sessions: Session[];
  drafts: Draft[];
  snapshots: Snapshot[];
  recoverable: Draft[];  // drafts that survived a crash / restart
  loaded: boolean;

  load(): Promise<void>;

  // sessions
  startSession(raw_input: string): Promise<Session>;
  updateSession(id: ID, patch: Partial<Omit<Session, "id" | "created_at">>): Promise<void>;
  setStatus(id: ID, status: SessionStatus, reason?: string): Promise<void>;
  appendSnapshot(session_id: ID, snap: Omit<Snapshot, "id" | "session_id" | "created_at">): Promise<void>;

  // drafts
  saveDraft(body: string, context?: Record<string, unknown>, scope?: Draft["scope"]): Promise<void>;
  clearDraft(id: ID): Promise<void>;
  recoverDraft(id: ID): Promise<Draft | null>;
  dismissRecoverable(id: ID): void;
}

export const useSessionsStore = create<SessionsState>((set, _get) => ({
  sessions: [],
  drafts: [],
  snapshots: [],
  recoverable: [],
  loaded: false,

  async load() {
    // TODO(phase-3): hydrate from SQLite, populate `recoverable` with any
    // drafts whose updated_at < (now - settings.autosaveMs * 2).
    set({ loaded: true });
  },

  async startSession(_raw) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async updateSession(_id, _patch) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async setStatus(_id, _status, _reason) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async appendSnapshot(_session, _snap) {
    throw new Error("not implemented yet — wired in Phase 3");
  },

  async saveDraft(_body, _context, _scope) {
    throw new Error("not implemented yet — wired in Phase 3");
  },
  async clearDraft(_id) {
    throw new Error("not implemented yet — wired in Phase 3");
  },
  async recoverDraft(_id) {
    throw new Error("not implemented yet — wired in Phase 3");
  },
  dismissRecoverable(id) {
    set((s) => ({ recoverable: s.recoverable.filter((d) => d.id !== id) }));
  }
}));

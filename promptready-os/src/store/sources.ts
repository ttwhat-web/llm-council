"use client";

/**
 * Sources store · the connection state of Operator's read-only inputs.
 *
 * Currently the only source is Google Workspace (Gmail + Calendar +
 * Contacts), behind a user-provided OAuth client. This store is the
 * single place the UI asks "are we connected, when was the last sync,
 * what did the last sync see, what went wrong?". The Home page reads
 * from it to decide whether to render the real briefing or the empty
 * state.
 *
 * The store NEVER touches Google's APIs directly — that's the job of
 * services/google/*. The store orchestrates and exposes status.
 */

import { create } from "zustand";
import {
  clearCredentials,
  clearTokens,
  disconnect as oauthDisconnect,
  hasCalendarWriteScope,
  readCredentials,
  readTokens,
  writeCredentials
} from "@/services/google/oauthClient";
import {
  clearSnapshot,
  readSnapshot,
  runFullSync,
  type SyncResult
} from "@/services/google/syncEngine";
import { buildBriefing, buildPanels, type WorkspacePanels } from "@/services/briefing/engine";
import type { BriefingItem } from "@/services/briefing/types";
import type { WorkspaceSnapshot } from "@/services/google/types";

export type GoogleConnectionState =
  | "disconnected"      // no credentials at all
  | "needs-auth"        // credentials present, no tokens
  | "connected"         // credentials + tokens
  | "syncing"           // a sync is in flight
  | "error";            // last sync failed

export interface SourcesState {
  google: {
    state: GoogleConnectionState;
    selfEmail: string | null;
    lastSyncMs: number | null;
    lastErrors: string[];
    /** True only when Google's token grant actually includes the
     *  Calendar write scope — read live from tokens, never assumed. */
    calendarWriteGranted: boolean;
  };
  snapshot: WorkspaceSnapshot | null;
  briefing: BriefingItem[];
  panels: WorkspacePanels | null;

  /** Persist user-supplied OAuth client id/secret (does NOT start the OAuth flow). */
  saveGoogleCredentials(clientId: string, clientSecret: string): void;
  /** Clear OAuth credentials + tokens + snapshot. */
  disconnectGoogle(): void;
  /** Re-evaluate connection state from storage (after token exchange). */
  refreshGoogleState(): void;
  /** Run a sync and rebuild briefing + panels from the result. */
  syncGoogle(): Promise<SyncResult>;
  /** Recompute briefing + panels from the current snapshot (no network). */
  recomputeFromSnapshot(): void;
}

function evalGoogleState(): {
  state: GoogleConnectionState;
  email: string | null;
  calendarWriteGranted: boolean;
} {
  const creds = readCredentials();
  const tokens = readTokens();
  if (!creds) return { state: "disconnected", email: null, calendarWriteGranted: false };
  if (!tokens) return { state: "needs-auth", email: null, calendarWriteGranted: false };
  return { state: "connected", email: tokens.email ?? null, calendarWriteGranted: hasCalendarWriteScope() };
}

export const useSourcesStore = create<SourcesState>((set, get) => {
  // Hydrate from localStorage on first import (renderer side only).
  const initialSnapshot = readSnapshot();
  const initialEval = evalGoogleState();
  const initialBriefing = initialSnapshot ? buildBriefing(initialSnapshot) : [];
  const initialPanels = initialSnapshot ? buildPanels(initialSnapshot) : null;

  return {
    google: {
      state: initialEval.state,
      selfEmail: initialEval.email ?? initialSnapshot?.selfEmail ?? null,
      lastSyncMs: initialSnapshot?.syncedAt ?? null,
      lastErrors: [],
      calendarWriteGranted: initialEval.calendarWriteGranted
    },
    snapshot: initialSnapshot,
    briefing: initialBriefing,
    panels: initialPanels,

    saveGoogleCredentials(clientId, clientSecret) {
      writeCredentials({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
      get().refreshGoogleState();
    },

    disconnectGoogle() {
      oauthDisconnect();
      clearCredentials();
      clearTokens();
      clearSnapshot();
      set({
        google: {
          state: "disconnected",
          selfEmail: null,
          lastSyncMs: null,
          lastErrors: [],
          calendarWriteGranted: false
        },
        snapshot: null,
        briefing: [],
        panels: null
      });
    },

    refreshGoogleState() {
      const e = evalGoogleState();
      set((s) => ({
        google: {
          ...s.google,
          state: e.state,
          selfEmail: e.email ?? s.google.selfEmail,
          calendarWriteGranted: e.calendarWriteGranted
        }
      }));
    },

    async syncGoogle() {
      set((s) => ({ google: { ...s.google, state: "syncing", lastErrors: [] } }));
      try {
        const result = await runFullSync();
        const briefing = buildBriefing(result.snapshot);
        const panels = buildPanels(result.snapshot);
        set({
          google: {
            state: result.errors.length > 0 ? "error" : "connected",
            selfEmail: result.snapshot.selfEmail || null,
            lastSyncMs: result.snapshot.syncedAt,
            lastErrors: result.errors,
            calendarWriteGranted: hasCalendarWriteScope()
          },
          snapshot: result.snapshot,
          briefing,
          panels
        });
        return result;
      } catch (e) {
        set((s) => ({
          google: {
            ...s.google,
            state: "error",
            lastErrors: [(e as Error).message]
          }
        }));
        throw e;
      }
    },

    recomputeFromSnapshot() {
      const snap = get().snapshot;
      if (!snap) return;
      set({ briefing: buildBriefing(snap), panels: buildPanels(snap) });
    }
  };
});

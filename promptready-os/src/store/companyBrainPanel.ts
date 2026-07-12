"use client";

/**
 * Company Brain panel · which query (if any) is currently being shown.
 *
 * Deliberately tiny — the panel itself recomputes the actual brief
 * reactively from the real stores whenever it's open, the same way
 * MemoryDistillationCard derives its suggestions. This store only
 * tracks "open, for this query" vs "closed".
 */

import { create } from "zustand";

interface CompanyBrainPanelState {
  query: string | null;
  open(query: string): void;
  close(): void;
}

export const useCompanyBrainPanelStore = create<CompanyBrainPanelState>((set) => ({
  query: null,
  open(query) {
    set({ query });
  },
  close() {
    set({ query: null });
  }
}));

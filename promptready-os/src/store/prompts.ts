/**
 * Prompts store · Prompt Vault state.
 *
 * Owned data:
 *   - prompts (the user's library, denormalised with tag_ids inline)
 *   - folders (tree)
 *   - tags
 *   - search query + filters
 *
 * Persistence: SQLite via @/database/client. Every action flushes writes
 * before resolving so the UI never observes a torn state.
 */

import { create } from "zustand";
import type { Folder, Prompt, Tag, ID } from "@/types";

interface Filter {
  query: string;
  folder_id: ID | null;
  tag_ids: ID[];
  pinned_only: boolean;
}

interface PromptsState {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  filter: Filter;
  selected: ID | null;
  loaded: boolean;

  // queries
  visible(): Prompt[];

  // actions
  load(): Promise<void>;
  create(input: Omit<Prompt, "id" | "created_at" | "updated_at">): Promise<Prompt>;
  update(id: ID, patch: Partial<Omit<Prompt, "id" | "created_at">>): Promise<void>;
  remove(id: ID): Promise<void>;
  togglePinned(id: ID): Promise<void>;
  toggleFavorite(id: ID): Promise<void>;

  // folders
  createFolder(name: string, parent_id?: ID | null): Promise<Folder>;
  renameFolder(id: ID, name: string): Promise<void>;
  removeFolder(id: ID): Promise<void>;

  // search / selection
  setQuery(q: string): void;
  setFolder(id: ID | null): void;
  toggleTag(id: ID): void;
  setPinnedOnly(v: boolean): void;
  select(id: ID | null): void;
}

export const usePromptsStore = create<PromptsState>((set, get) => ({
  prompts: [],
  folders: [],
  tags: [],
  filter: { query: "", folder_id: null, tag_ids: [], pinned_only: false },
  selected: null,
  loaded: false,

  visible() {
    const { prompts, filter } = get();
    const q = filter.query.trim().toLowerCase();
    return prompts.filter((p) => {
      if (filter.pinned_only && !p.pinned) return false;
      if (filter.folder_id && p.folder_id !== filter.folder_id) return false;
      if (filter.tag_ids.length && !filter.tag_ids.every((t) => p.tag_ids.includes(t))) {
        return false;
      }
      if (q) {
        const hay = `${p.title}\n${p.body}\n${p.raw_input || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  },

  async load() {
    // TODO(phase-1): db.query("SELECT … FROM prompts …")
    set({ loaded: true });
  },
  async create(_input) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async update(_id, _patch) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async remove(_id) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async togglePinned(_id) {
    throw new Error("not implemented yet — wired in Phase 1");
  },
  async toggleFavorite(_id) {
    throw new Error("not implemented yet — wired in Phase 1");
  },

  async createFolder(_name, _parent) {
    throw new Error("not implemented yet — wired in Phase 4");
  },
  async renameFolder(_id, _name) {
    throw new Error("not implemented yet — wired in Phase 4");
  },
  async removeFolder(_id) {
    throw new Error("not implemented yet — wired in Phase 4");
  },

  setQuery(query) {
    set((s) => ({ filter: { ...s.filter, query } }));
  },
  setFolder(folder_id) {
    set((s) => ({ filter: { ...s.filter, folder_id } }));
  },
  toggleTag(id) {
    set((s) => {
      const has = s.filter.tag_ids.includes(id);
      return {
        filter: {
          ...s.filter,
          tag_ids: has ? s.filter.tag_ids.filter((t) => t !== id) : [...s.filter.tag_ids, id]
        }
      };
    });
  },
  setPinnedOnly(pinned_only) {
    set((s) => ({ filter: { ...s.filter, pinned_only } }));
  },
  select(selected) {
    set({ selected });
  }
}));

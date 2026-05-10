/**
 * Memory — durable per-user storage for context, preferences, and
 * reusable prompt blocks.
 *
 * The interface is intentionally minimal: a namespaced KV store with
 * list / get / put / del. Vector search lives behind the same surface
 * once the embedding pipeline is decided (see PROMPTOS.md §Memory).
 *
 * v1 ships:
 *   - LocalStorageBackend (client-side; powers the existing Mission
 *     Archive and Settings already used by the app)
 *   - JsonFileBackend (server-side; the dispatcher's link + inbox
 *     stores already follow this shape)
 *
 * Future:
 *   - SQLiteBackend (durable + queryable)
 *   - VectorBackend (pgvector / Turbopuffer / sqlite-vss)
 */

export type Namespace =
  /** Per-user reusable context blocks. */
  | "project"
  /** User preferences (theme, default mode, etc.). */
  | "preferences"
  /** Saved prompt chains the user can replay. */
  | "stacks"
  /** Skill-specific memory; namespace key is the skill id. */
  | `skill:${string}`;

export interface MemoryEntry<T = unknown> {
  id: string;
  user: string;
  ns: Namespace;
  /** Free-form key inside the namespace. */
  key: string;
  value: T;
  /** Optional tags for filtering. */
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryQuery {
  user: string;
  ns: Namespace;
  /** Substring search across `key` + JSON.stringify(value). */
  query?: string;
  /** AND across tags. */
  tags?: string[];
  limit?: number;
}

export interface MemoryBackend {
  get<T = unknown>(user: string, ns: Namespace, key: string): Promise<MemoryEntry<T> | null>;
  put<T = unknown>(
    user: string,
    ns: Namespace,
    key: string,
    value: T,
    tags?: string[]
  ): Promise<MemoryEntry<T>>;
  del(user: string, ns: Namespace, key: string): Promise<boolean>;
  list<T = unknown>(query: MemoryQuery): Promise<MemoryEntry<T>[]>;
}

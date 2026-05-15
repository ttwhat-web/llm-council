'use client';

import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  type ExternalProductConnector,
  mockExternalConnector,
  productKey,
} from './connectors/externalProductConnector';
import { seedProducts } from './seed';
import type { Product, ProductCategory } from './types';

/**
 * Result of a sync round — surfaced in admin UI so the user sees what
 * happened (added vs skipped vs touched).
 */
export interface SyncResult {
  fetched: number;
  added: number;
  skipped: number;
  refreshed: number;
  sourceName: string;
  finishedAt: string;
}

/**
 * Single source of truth for catalog products.
 *
 * Frontend reads from `useProducts()` (a selector hook) — admin writes via
 * `addProduct()` / `updateProduct()` / `removeProduct()`. Zustand fans out
 * the change to every subscribed component, so adding a product in the
 * admin panel makes it appear on Home / Şişe / Split / Dekant *in the same
 * paint frame*. No refresh, no polling.
 *
 * Persistence: localStorage (`derinsplit:catalog:v1`). Survives reload.
 *
 * To swap in a real backend later:
 *   - replace `addProduct`/etc. with API calls (POST /api/products)
 *   - add a `hydrate()` method that fetches the list on mount
 *   - keep the selectors below identical so pages don't change
 */
interface CatalogState {
  products: Product[];
  /** ISO timestamp of the most recent external sync, null if never run. */
  lastSyncAt: string | null;
  /** Result of the most recent sync, surfaced in admin. */
  lastSyncResult: SyncResult | null;
  syncInFlight: boolean;

  addProduct: (input: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  reset: () => void;

  /**
   * Pull the external catalog and merge into the local store. `mode`:
   *   - `new`     : only insert items whose batch+brand+name fingerprint
   *                 doesn't already exist locally.
   *   - `refresh` : `new` + update fields on every previously-synced row
   *                 (price / stock / remainingMl / variant / image …).
   */
  syncExternal: (
    mode: 'new' | 'refresh',
    connector?: ExternalProductConnector,
  ) => Promise<SyncResult>;

  /** Drop all rows that arrived via external sync (manual ones survive). */
  clearExternal: () => number;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      lastSyncAt: null,
      lastSyncResult: null,
      syncInFlight: false,
      addProduct: (input) => {
        const newP: Product = {
          source: 'manual',
          ...input,
          id: `p_${nanoid(10)}`,
          createdAt: new Date().toISOString(),
        };
        set({ products: [newP, ...get().products] });
        return newP;
      },
      updateProduct: (id, patch) => {
        set({
          products: get().products.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        });
      },
      removeProduct: (id) => {
        set({ products: get().products.filter((p) => p.id !== id) });
      },
      reset: () =>
        set({
          products: seedProducts,
          lastSyncAt: null,
          lastSyncResult: null,
        }),

      syncExternal: async (mode, connector = mockExternalConnector) => {
        set({ syncInFlight: true });
        try {
          const raw = await connector.fetchExternalProducts();
          const finishedAt = new Date().toISOString();

          const current = get().products;
          // Build duplicate index on local rows.
          const keyIndex = new Map<string, Product>();
          for (const p of current) keyIndex.set(productKey(p), p);

          const next: Product[] = [...current];
          let added = 0;
          let skipped = 0;
          let refreshed = 0;

          for (const ext of raw) {
            const mapped = connector.mapExternalProductToProduct(ext);
            if (!mapped) {
              skipped++;
              continue;
            }
            const key = productKey(mapped);
            const existing = keyIndex.get(key);

            if (existing) {
              if (mode === 'refresh') {
                // Mutate in-place so order is preserved.
                const idx = next.findIndex((p) => p.id === existing.id);
                if (idx !== -1) {
                  next[idx] = {
                    ...existing,
                    ...mapped,
                    id: existing.id,
                    createdAt: existing.createdAt,
                    // Preserve manual overrides on these fields:
                    featured: existing.featured ?? mapped.featured,
                    lastSyncedAt: finishedAt,
                  };
                  refreshed++;
                }
              } else {
                skipped++;
              }
              continue;
            }

            const inserted: Product = {
              ...mapped,
              id: `p_${nanoid(10)}`,
              createdAt: finishedAt,
              lastSyncedAt: finishedAt,
            };
            next.unshift(inserted);
            keyIndex.set(key, inserted);
            added++;
          }

          const result: SyncResult = {
            fetched: raw.length,
            added,
            skipped,
            refreshed,
            sourceName: connector.sourceName,
            finishedAt,
          };

          set({
            products: next,
            lastSyncAt: finishedAt,
            lastSyncResult: result,
            syncInFlight: false,
          });
          return result;
        } catch (e) {
          set({ syncInFlight: false });
          throw e;
        }
      },

      clearExternal: () => {
        const before = get().products.length;
        set({
          products: get().products.filter((p) => p.source !== 'external'),
        });
        return before - get().products.length;
      },
    }),
    {
      name: 'derinsplit:catalog:v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist products; ignore methods.
      partialize: (s) => ({
        products: s.products,
        lastSyncAt: s.lastSyncAt,
        lastSyncResult: s.lastSyncResult,
      }),
      // If the persisted snapshot is empty (first visit), keep the seed.
      merge: (persisted, current) => {
        const persistedState = persisted as
          | {
              products?: Product[];
              lastSyncAt?: string | null;
              lastSyncResult?: SyncResult | null;
            }
          | undefined;
        if (!persistedState?.products?.length) return current;
        return {
          ...current,
          products: persistedState.products,
          lastSyncAt: persistedState.lastSyncAt ?? null,
          lastSyncResult: persistedState.lastSyncResult ?? null,
        };
      },
    },
  ),
);

// ── selectors ──────────────────────────────────────────────────────────────

export function useProducts(category?: ProductCategory): Product[] {
  return useCatalogStore((s) =>
    category ? s.products.filter((p) => p.category === category) : s.products,
  );
}

export function useProduct(id: string): Product | undefined {
  return useCatalogStore((s) => s.products.find((p) => p.id === id));
}

/** Returns every group of products that share a brand+name+batch key. */
export function findDuplicateGroups(products: Product[]): Product[][] {
  const buckets = new Map<string, Product[]>();
  for (const p of products) {
    const k = productKey(p);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(p);
  }
  return Array.from(buckets.values()).filter((g) => g.length > 1);
}

// ── helpers ────────────────────────────────────────────────────────────────

export function formatTl(value: number, decimals = 0): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

'use client';

import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { seedProducts } from './seed';
import type { Product, ProductCategory } from './types';

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
  addProduct: (input: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  reset: () => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      products: seedProducts,
      addProduct: (input) => {
        const newP: Product = {
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
      reset: () => set({ products: seedProducts }),
    }),
    {
      name: 'derinsplit:catalog:v1',
      storage: createJSONStorage(() => localStorage),
      // Only persist products; ignore methods.
      partialize: (s) => ({ products: s.products }),
      // If the persisted snapshot is empty (first visit), keep the seed.
      merge: (persisted, current) => {
        const persistedState = persisted as { products?: Product[] } | undefined;
        if (!persistedState?.products?.length) return current;
        return { ...current, products: persistedState.products };
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

// ── helpers ────────────────────────────────────────────────────────────────

export function formatTl(value: number, decimals = 0): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

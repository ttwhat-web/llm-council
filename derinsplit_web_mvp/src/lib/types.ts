/**
 * Core product type — shared by Şişe / Split / Dekant catalogs and admin.
 *
 * This shape is the contract every page reads/writes through the Zustand
 * store. When the real backend lands, swap the store's `seed`/persistence
 * layer for fetch calls — the components don't change.
 */
export type ProductCategory = 'sise' | 'split' | 'dekant';

export type StockStatus = 'in_stock' | 'pre_order' | 'sold_out';

/** Where a product entered the DerinSplit catalog. */
export type ProductSource = 'manual' | 'external';

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  price: number;            // for sise = total bottle price; for split = ₺/ml; for dekant = price of default size
  sizeMl: number;           // total bottle volume
  remainingMl: number;      // ml left (for split = filled tracking)
  city: string;
  batchCode: string;
  imageUrl?: string;        // optional: real photo URL
  description: string;
  status: StockStatus;
  createdAt: string;        // ISO timestamp
  variantLabel?: string;    // 'TESTER' | 'BOXED' | 'TRAVEL' (optional)
  /** Admin can toggle this to surface a product in "Öne Çıkanlar". */
  featured?: boolean;
  // ── split-only ────────────────────────────────────────────────
  pricePerMl?: number;      // explicit ₺/ml for split products
  participants?: number;
  // ── dekant-only ───────────────────────────────────────────────
  /** Available decant sizes + their prices, e.g. [{ml:3, price:450}, …]. */
  dekantSizes?: { ml: number; price: number }[];
  // ── provenance (set by sync layer) ────────────────────────────
  /** `manual` for admin-added, `external` for products synced via connector. */
  source?: ProductSource;
  /** Provider id for the synced product. Stable across re-syncs. */
  externalId?: string;
  /** Human-readable provider name shown in admin ("Şişeci Boutique" vb). */
  externalSourceName?: string;
  /** ISO timestamp of the last sync that touched this row. */
  lastSyncedAt?: string;
}

/**
 * Shape returned by an external connector before mapping. We keep it
 * intentionally different from Product so the mapper has something to do
 * (and the contract becomes obvious when a real API is plugged in).
 */
export interface ExternalProduct {
  id: string;
  sku: string;
  brand: { name: string };
  title: string;
  category_slug: 'perfume' | 'split' | 'dekant';
  pricing: { currency: 'TRY'; amount: number; per_ml?: number };
  volume_ml: number;
  remaining_ml?: number;
  in_stock: boolean;
  image_url?: string;
  body?: string;
  batch?: string;
  city?: string;
  variant?: string;
  featured?: boolean;
  updated_at: string;
}

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  sise: 'ŞİŞE',
  split: 'SPLİT',
  dekant: 'DEKANT',
};

export const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: 'STOKTA',
  pre_order: 'STOKTA YOK (SİPARİŞ ÜSÜLÜ 7-10 GÜN)',
  sold_out: 'TÜKENDİ',
};

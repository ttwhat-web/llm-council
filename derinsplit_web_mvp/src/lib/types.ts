/**
 * Core product type — shared by Şişe / Split / Dekant catalogs and admin.
 *
 * This shape is the contract every page reads/writes through the Zustand
 * store. When the real backend lands, swap the store's `seed`/persistence
 * layer for fetch calls — the components don't change.
 */
export type ProductCategory = 'sise' | 'split' | 'dekant';

export type StockStatus = 'in_stock' | 'pre_order' | 'sold_out';

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  price: number;            // for sise = total bottle price; for split = ₺/ml
  sizeMl: number;           // total bottle volume
  remainingMl: number;      // ml left (for split = filled tracking)
  city: string;
  batchCode: string;
  imageUrl?: string;        // optional: real photo URL
  description: string;
  status: StockStatus;
  createdAt: string;        // ISO timestamp
  variantLabel?: string;    // 'TESTER' | 'BOXED' | 'TRAVEL' (optional)
  // ── split-only ────────────────────────────────────────────────
  pricePerMl?: number;      // explicit ₺/ml for split products
  participants?: number;
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

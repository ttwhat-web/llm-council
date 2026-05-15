import type {
  ExternalProduct,
  Product,
  ProductCategory,
  StockStatus,
} from '../types';
import {
  EXTERNAL_SOURCE_NAME,
  externalProducts,
} from './externalProducts';

/**
 * The contract every external connector must satisfy.
 *
 * Today only a mock implementation exists; the day a real API or scraper
 * is plugged in, swap `fetchExternalProducts` for the real network call —
 * everything downstream (`mapExternalProductToProduct`, store sync, admin
 * UI) stays identical.
 */
export interface ExternalProductConnector {
  /** Human-readable name displayed on synced product rows in admin. */
  sourceName: string;

  /**
   * Pull the raw catalog from the external source. Real impl would hit
   * an HTTP endpoint or scrape pages and normalise into `ExternalProduct`.
   */
  fetchExternalProducts(): Promise<ExternalProduct[]>;

  /**
   * Convert a single external item into our internal `Product` shape.
   * Returning `null` lets the connector drop unsupported rows silently.
   */
  mapExternalProductToProduct(
    ext: ExternalProduct,
  ): Omit<Product, 'id' | 'createdAt'> | null;
}

// ── default mock connector ─────────────────────────────────────────────────

export const mockExternalConnector: ExternalProductConnector = {
  sourceName: EXTERNAL_SOURCE_NAME,

  async fetchExternalProducts() {
    // Simulate a real network hop so admin "Senkronize Et" feels live.
    await new Promise((r) => setTimeout(r, 600));
    return externalProducts;
  },

  mapExternalProductToProduct(ext) {
    const category = mapCategory(ext.category_slug);
    if (!category) return null;

    const status: StockStatus = ext.in_stock ? 'in_stock' : 'pre_order';
    const remaining = ext.remaining_ml ?? ext.volume_ml;

    const base: Omit<Product, 'id' | 'createdAt'> = {
      brand: ext.brand.name,
      name: ext.title,
      category,
      price: ext.pricing.amount,
      sizeMl: ext.volume_ml,
      remainingMl: remaining,
      city: ext.city ?? 'İstanbul',
      batchCode: (ext.batch ?? ext.sku).trim(),
      imageUrl: ext.image_url || undefined,
      description: ext.body ?? '',
      status,
      variantLabel: ext.variant,
      featured: ext.featured ?? false,
      source: 'external',
      externalId: ext.id,
      externalSourceName: EXTERNAL_SOURCE_NAME,
      lastSyncedAt: new Date().toISOString(),
    };

    if (category === 'split') {
      base.pricePerMl = ext.pricing.per_ml ?? ext.pricing.amount;
    }

    return base;
  },
};

function mapCategory(
  slug: ExternalProduct['category_slug'],
): ProductCategory | null {
  switch (slug) {
    case 'perfume':
      return 'sise';
    case 'split':
      return 'split';
    case 'dekant':
      return 'dekant';
    default:
      return null;
  }
}

// ── duplicate detection ────────────────────────────────────────────────────

/**
 * Two products are considered duplicates when their *normalised*
 * brand + name + batchCode triplet matches (case-insensitive, whitespace-
 * collapsed). batchCode is the strongest signal but name/brand catch the
 * cases where the external feed lacks a batch code.
 */
export function productKey(p: {
  brand: string;
  name: string;
  batchCode: string;
}): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${norm(p.brand)}|${norm(p.name)}|${norm(p.batchCode)}`;
}

import type { Product } from './types';

/**
 * Seed catalog used on first paint when the persisted Zustand store is
 * empty. Once the real backend is wired in `lib/store.ts`, swap this for
 * a fetch call.
 */
export const seedProducts: Product[] = [
  {
    id: 'p_clive_hedonistic',
    brand: 'Clive Christian',
    name: 'Hedonistic',
    category: 'sise',
    price: 14900,
    sizeMl: 50,
    remainingMl: 50,
    city: 'İstanbul',
    batchCode: 'CC24A11',
    description:
      'Tester. Resmi bayiden temin edildi, kapalı kutu kontrolü yapılmıştır. ' +
      'Sipariş üzerine 7-10 iş günü içinde temin edilir.',
    status: 'pre_order',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    variantLabel: 'TESTER',
  },
  {
    id: 'p_xerjoff_alex2',
    brand: 'Xerjoff',
    name: 'Alexandria 2',
    category: 'sise',
    price: 12900,
    sizeMl: 100,
    remainingMl: 100,
    city: 'İstanbul',
    batchCode: 'XJ24C04',
    description:
      'Tester, kapalı orijinal şişe. Stoktan günü gününe kargolanır. ' +
      'Yetkili Xerjoff bayisinden faturalı temin.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    variantLabel: 'TESTER',
    featured: true,
  },
  {
    id: 'p_nishane_hacivat',
    brand: 'Nishane',
    name: 'Hacivat',
    category: 'sise',
    price: 7500,
    sizeMl: 100,
    remainingMl: 100,
    city: 'İstanbul',
    batchCode: 'NS24B12',
    description:
      'Tester, açılmamış. Niche markamızın bestseller eksperdir. Kapalı şişe.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    variantLabel: 'TESTER',
  },
  {
    id: 'p_roja_elysium',
    brand: 'Roja Parfums',
    name: 'Elysium Pour Homme',
    category: 'sise',
    price: 18500,
    sizeMl: 100,
    remainingMl: 100,
    city: 'İstanbul',
    batchCode: 'RJ25A001',
    description: 'Boxed, kutulu orijinal şişe. Stoktan günü gününe kargolanır.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    variantLabel: 'BOXED',
    featured: true,
  },
  // ── dekant ────────────────────────────────────────────────────────────
  {
    id: 'p_dekant_naxos',
    brand: 'Xerjoff',
    name: 'Naxos · Dekant',
    category: 'dekant',
    price: 450,                    // = dekantSizes[0].price (3ml)
    sizeMl: 15,                    // largest available size for catalog display
    remainingMl: 15,
    city: 'İstanbul',
    batchCode: 'XJ24N03-D',
    description:
      'Xerjoff Naxos dekantı. Orijinal şişeden kontrollü ortamda ' +
      '3 / 5 / 10 / 15 ml seçenekleri ile hazırlanır.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    dekantSizes: [
      { ml: 3,  price: 450 },
      { ml: 5,  price: 700 },
      { ml: 10, price: 1300 },
      { ml: 15, price: 1800 },
    ],
  },
  {
    id: 'p_dekant_lv_ombre',
    brand: 'Louis Vuitton',
    name: 'Ombre Nomade · Dekant',
    category: 'dekant',
    price: 500,
    sizeMl: 15,
    remainingMl: 15,
    city: 'İstanbul',
    batchCode: 'LV23B044-D',
    description:
      'Louis Vuitton Ombre Nomade dekantı. Sınırlı stok — küratör seçimi.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    dekantSizes: [
      { ml: 3,  price: 500 },
      { ml: 5,  price: 800 },
      { ml: 10, price: 1500 },
      { ml: 15, price: 2100 },
    ],
    featured: true,
  },
  {
    id: 'p_dekant_clive',
    brand: 'Clive Christian',
    name: 'Hedonistic · Dekant',
    category: 'dekant',
    price: 680,
    sizeMl: 10,
    remainingMl: 10,
    city: 'İstanbul',
    batchCode: 'CC24A11-D',
    description:
      'Clive Christian Hedonistic dekantı. Yoğun parfüm — küçük ml yeterlidir.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    dekantSizes: [
      { ml: 3,  price: 680 },
      { ml: 5,  price: 1050 },
      { ml: 10, price: 1950 },
    ],
  },
  // ── splits ────────────────────────────────────────────────────────────
  {
    id: 'p_split_xerjoff_naxos',
    brand: 'Xerjoff',
    name: 'Naxos',
    category: 'split',
    price: 180,                     // for catalog display
    pricePerMl: 180,
    sizeMl: 100,
    remainingMl: 68,                // 32 ml filled
    city: 'İstanbul',
    batchCode: 'XJ24N03',
    description:
      'Splite katılarak ml bazında ayırtın. Toplam 100 ml; küratör süzgecinden ' +
      'geçmiş, batch doğrulamalı.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    participants: 4,
  },
  {
    id: 'p_split_lv_ombre',
    brand: 'Louis Vuitton',
    name: 'Ombre Nomade',
    category: 'split',
    price: 160,
    pricePerMl: 160,
    sizeMl: 100,
    remainingMl: 50,
    city: 'İstanbul',
    batchCode: 'LV23B044',
    description: 'LV İstinyePark - faturalı. Şişeli kalan da talep edilebilir.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    participants: 3,
  },
  {
    id: 'p_split_roja_elysium',
    brand: 'Roja Parfums',
    name: 'Elysium Parfum',
    category: 'split',
    price: 220,
    pricePerMl: 220,
    sizeMl: 100,
    remainingMl: 78,
    city: 'İstanbul',
    batchCode: 'RJ25E002',
    description: 'Küratör seçimi. 22 ml dolu, kalan ml ayırtılabilir.',
    status: 'in_stock',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    participants: 5,
  },
];

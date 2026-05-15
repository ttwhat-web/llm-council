import type { ExternalProduct } from '../types';

/**
 * Mock catalog from the "other site" Kuzey loads products into. The shape
 * intentionally differs from our internal Product so the mapping layer has
 * something to do — the day a real API is plugged in, only this file +
 * `externalProductConnector.ts` need to change.
 *
 * Replace with `fetch(EXTERNAL_API_URL).then(r => r.json())` later.
 */
export const externalProducts: ExternalProduct[] = [
  {
    id: 'ext-001',
    sku: 'TF-OUDWOOD-50',
    brand: { name: 'Tom Ford' },
    title: 'Oud Wood',
    category_slug: 'perfume',
    pricing: { currency: 'TRY', amount: 8400 },
    volume_ml: 50,
    remaining_ml: 50,
    in_stock: true,
    image_url: '',
    body:
      'Tom Ford Private Blend Oud Wood. Faturalı, yetkili bayiden temin. ' +
      'Kapalı orijinal şişe.',
    batch: 'TF24OW50',
    city: 'İstanbul',
    variant: 'BOXED',
    featured: true,
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-002',
    sku: 'CR-AVENTUS-100',
    brand: { name: 'Creed' },
    title: 'Aventus 2024',
    category_slug: 'perfume',
    pricing: { currency: 'TRY', amount: 12500 },
    volume_ml: 100,
    remaining_ml: 100,
    in_stock: true,
    body: 'Creed Aventus 2024 batch. Kutulu, açılmamış.',
    batch: 'CR24C15A',
    city: 'İstanbul',
    variant: 'BOXED',
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-003',
    sku: 'INIT-SE-90-SPLIT',
    brand: { name: 'Initio' },
    title: 'Side Effect',
    category_slug: 'split',
    pricing: { currency: 'TRY', amount: 200, per_ml: 200 },
    volume_ml: 90,
    remaining_ml: 78,
    in_stock: true,
    body:
      'Initio Side Effect splitine ml bazında katılın. Küratör onaylı, ' +
      'batch doğrulamalı.',
    batch: 'IN24C32',
    city: 'İzmir',
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-004',
    sku: 'PDM-PEGASUS-125',
    brand: { name: 'Parfums de Marly' },
    title: 'Pegasus',
    category_slug: 'perfume',
    pricing: { currency: 'TRY', amount: 11200 },
    volume_ml: 125,
    remaining_ml: 125,
    in_stock: true,
    body: 'PDM Pegasus 125 ml, kutulu.',
    batch: 'PDM23P125',
    city: 'Ankara',
    variant: 'BOXED',
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-005',
    sku: 'XER-NAXOS-DEC-5',
    brand: { name: 'Xerjoff' },
    title: 'Naxos · Dekant 5ml',
    category_slug: 'dekant',
    pricing: { currency: 'TRY', amount: 700 },
    volume_ml: 5,
    in_stock: true,
    body: 'Xerjoff Naxos dekantı, 5 ml.',
    batch: 'XJ24N03-D5',
    city: 'İstanbul',
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-006',
    sku: 'AM-INTERLUDE-100-NEW',
    brand: { name: 'Amouage' },
    title: 'Interlude Man',
    category_slug: 'perfume',
    pricing: { currency: 'TRY', amount: 9800 },
    volume_ml: 100,
    remaining_ml: 100,
    in_stock: false,
    body: 'Amouage Interlude Man, sipariş üzerine 7-10 iş günü.',
    batch: 'AM24INTM',
    city: 'Bursa',
    variant: 'TESTER',
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-007',
    sku: 'MEMO-MARFA-75',
    brand: { name: 'Memo Paris' },
    title: 'Marfa',
    category_slug: 'perfume',
    pricing: { currency: 'TRY', amount: 6900 },
    volume_ml: 75,
    remaining_ml: 75,
    in_stock: true,
    body: 'Memo Paris Marfa, 75 ml, açılmamış.',
    batch: 'MM24M75',
    city: 'İstanbul',
    variant: 'BOXED',
    featured: true,
    updated_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ext-008',
    sku: 'XER-NAXOS-100-SPLIT',
    brand: { name: 'Xerjoff' },
    title: 'Naxos',
    category_slug: 'split',
    pricing: { currency: 'TRY', amount: 180, per_ml: 180 },
    volume_ml: 100,
    remaining_ml: 100,
    in_stock: true,
    body: 'Xerjoff Naxos splitine ml bazında katılım — küratör onaylı.',
    batch: 'XJ24N03', // ← matches an existing seed batch on purpose (duplicate test)
    city: 'İstanbul',
    updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * The name shown in admin against synced products. Will be replaced with
 * a value coming from the connector handshake.
 */
export const EXTERNAL_SOURCE_NAME = 'Şişeci Boutique';

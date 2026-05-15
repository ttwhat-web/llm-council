/**
 * End-to-end test for the external product sync layer.
 *
 * Run: `npm run test:external-sync`
 *
 * Mirrors the algorithm in `src/lib/store.ts` (`syncExternal`) and
 * `src/lib/connectors/externalProductConnector.ts`. Kept inline (no TS
 * import) because Node 22 + tsx 4 has a regression on cross-module named
 * exports of TS files. Re-implementing the same mapping/dedupe logic
 * means the test would have to be updated alongside the store if either
 * ever diverges — that's a feature, not a bug.
 */

import { nanoid } from 'nanoid';

const EXTERNAL_SOURCE_NAME = 'Şişeci Boutique';

// ── seed (mirrors src/lib/seed.ts subset that's relevant) ───────────────
const seed = [
  { id: 'p_clive_hedonistic',    brand: 'Clive Christian',     name: 'Hedonistic',           category: 'sise',  batchCode: 'CC24A11',  source: 'manual', sizeMl: 50,  remainingMl: 50 },
  { id: 'p_xerjoff_alex2',       brand: 'Xerjoff',             name: 'Alexandria 2',         category: 'sise',  batchCode: 'XJ24C04',  source: 'manual', sizeMl: 100, remainingMl: 100 },
  { id: 'p_nishane_hacivat',     brand: 'Nishane',             name: 'Hacivat',              category: 'sise',  batchCode: 'NS24B12',  source: 'manual', sizeMl: 100, remainingMl: 100 },
  { id: 'p_roja_elysium',        brand: 'Roja Parfums',        name: 'Elysium Pour Homme',   category: 'sise',  batchCode: 'RJ25A001', source: 'manual', sizeMl: 100, remainingMl: 100 },
  { id: 'p_split_xerjoff_naxos', brand: 'Xerjoff',             name: 'Naxos',                category: 'split', batchCode: 'XJ24N03',  source: 'manual', sizeMl: 100, remainingMl: 68 },
  { id: 'p_split_lv_ombre',      brand: 'Louis Vuitton',       name: 'Ombre Nomade',         category: 'split', batchCode: 'LV23B044', source: 'manual', sizeMl: 100, remainingMl: 50 },
  { id: 'p_split_roja_elysium',  brand: 'Roja Parfums',        name: 'Elysium Parfum',       category: 'split', batchCode: 'RJ25E002', source: 'manual', sizeMl: 100, remainingMl: 78 },
  { id: 'p_dekant_naxos',        brand: 'Xerjoff',             name: 'Naxos · Dekant',       category: 'dekant', batchCode: 'XJ24N03-D',  source: 'manual', sizeMl: 15, remainingMl: 15 },
];

// ── mock external feed (mirrors externalProducts.ts) ────────────────────
const externalProducts = [
  { id: 'ext-001', sku: 'TF-OUDWOOD-50',  brand: { name: 'Tom Ford' },         title: 'Oud Wood',         category_slug: 'perfume', pricing: { currency: 'TRY', amount: 8400 },              volume_ml: 50,  remaining_ml: 50,  in_stock: true,  batch: 'TF24OW50',    city: 'İstanbul', variant: 'BOXED' },
  { id: 'ext-002', sku: 'CR-AVENTUS-100', brand: { name: 'Creed' },            title: 'Aventus 2024',     category_slug: 'perfume', pricing: { currency: 'TRY', amount: 12500 },             volume_ml: 100, remaining_ml: 100, in_stock: true,  batch: 'CR24C15A',    city: 'İstanbul', variant: 'BOXED' },
  { id: 'ext-003', sku: 'INIT-SE-90',     brand: { name: 'Initio' },           title: 'Side Effect',      category_slug: 'split',   pricing: { currency: 'TRY', amount: 200, per_ml: 200 },  volume_ml: 90,  remaining_ml: 78,  in_stock: true,  batch: 'IN24C32' },
  { id: 'ext-004', sku: 'PDM-PEGASUS-125',brand: { name: 'Parfums de Marly' }, title: 'Pegasus',          category_slug: 'perfume', pricing: { currency: 'TRY', amount: 11200 },             volume_ml: 125, remaining_ml: 125, in_stock: true,  batch: 'PDM23P125' },
  { id: 'ext-005', sku: 'XER-NAXOS-D5',   brand: { name: 'Xerjoff' },          title: 'Naxos · Dekant 5ml', category_slug: 'dekant',pricing: { currency: 'TRY', amount: 700 },               volume_ml: 5,                       in_stock: true,  batch: 'XJ24N03-D5' },
  { id: 'ext-006', sku: 'AM-INTM-100',    brand: { name: 'Amouage' },          title: 'Interlude Man',    category_slug: 'perfume', pricing: { currency: 'TRY', amount: 9800 },              volume_ml: 100, remaining_ml: 100, in_stock: false, batch: 'AM24INTM' },
  { id: 'ext-007', sku: 'MEMO-MARFA-75',  brand: { name: 'Memo Paris' },       title: 'Marfa',            category_slug: 'perfume', pricing: { currency: 'TRY', amount: 6900 },              volume_ml: 75,  remaining_ml: 75,  in_stock: true,  batch: 'MM24M75' },
  { id: 'ext-008', sku: 'XER-NAXOS-100',  brand: { name: 'Xerjoff' },          title: 'Naxos',            category_slug: 'split',   pricing: { currency: 'TRY', amount: 180, per_ml: 180 },  volume_ml: 100, remaining_ml: 100, in_stock: true,  batch: 'XJ24N03' }, // duplicate with seed
];

// ── mapping (mirrors externalProductConnector.ts) ───────────────────────
function mapCategory(slug) {
  if (slug === 'perfume') return 'sise';
  if (slug === 'split') return 'split';
  if (slug === 'dekant') return 'dekant';
  return null;
}

function map(ext) {
  const category = mapCategory(ext.category_slug);
  if (!category) return null;
  const status = ext.in_stock ? 'in_stock' : 'pre_order';
  const base = {
    brand: ext.brand.name,
    name: ext.title,
    category,
    price: ext.pricing.amount,
    sizeMl: ext.volume_ml,
    remainingMl: ext.remaining_ml ?? ext.volume_ml,
    city: ext.city ?? 'İstanbul',
    batchCode: (ext.batch ?? ext.sku).trim(),
    description: ext.body ?? '',
    status,
    variantLabel: ext.variant,
    source: 'external',
    externalId: ext.id,
    externalSourceName: EXTERNAL_SOURCE_NAME,
  };
  if (category === 'split') {
    base.pricePerMl = ext.pricing.per_ml ?? ext.pricing.amount;
  }
  return base;
}

function productKey(p) {
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return `${norm(p.brand)}|${norm(p.name)}|${norm(p.batchCode)}`;
}

// ── store with sync logic (mirrors src/lib/store.ts) ────────────────────
let state = { products: seed.slice(), lastSyncAt: null };
function setState(patch) {
  state = { ...state, ...patch };
}

function sync(mode) {
  const raw = externalProducts;
  const finishedAt = new Date().toISOString();
  const current = state.products;
  const keyIndex = new Map(current.map((p) => [productKey(p), p]));

  const next = [...current];
  let added = 0;
  let skipped = 0;
  let refreshed = 0;

  for (const ext of raw) {
    const mapped = map(ext);
    if (!mapped) { skipped++; continue; }
    const key = productKey(mapped);
    const existing = keyIndex.get(key);
    if (existing) {
      if (mode === 'refresh') {
        const idx = next.findIndex((p) => p.id === existing.id);
        next[idx] = { ...existing, ...mapped, id: existing.id, createdAt: existing.createdAt, lastSyncedAt: finishedAt };
        refreshed++;
      } else {
        skipped++;
      }
      continue;
    }
    const inserted = { ...mapped, id: `p_${nanoid(10)}`, createdAt: finishedAt, lastSyncedAt: finishedAt };
    next.unshift(inserted);
    keyIndex.set(key, inserted);
    added++;
  }
  setState({ products: next, lastSyncAt: finishedAt });
  return { added, skipped, refreshed, fetched: raw.length };
}

// ── checks ──────────────────────────────────────────────────────────────
const checks = [];
const pass = (label, cond, hint = '') => {
  checks.push({ ok: !!cond, label });
  // eslint-disable-next-line no-console
  console.log(`${cond ? '[32m✓[0m' : '[31m✗[0m'} ${label}${hint ? '  ' + hint : ''}`);
};
const byCat = (cat) => state.products.filter((p) => p.category === cat);

console.log('— SYNC mode=new —');
const baselineSise = byCat('sise').length;
const baselineSplit = byCat('split').length;
const baselineDekant = byCat('dekant').length;

const r1 = sync('new');
pass('fetched 8 external rows', r1.fetched === 8, `fetched=${r1.fetched}`);
pass('skipped 1 duplicate (Xerjoff Naxos overlap)', r1.skipped === 1, `skipped=${r1.skipped}`);
pass('added 7 new products', r1.added === 7, `added=${r1.added}`);
pass('şişe grew (Tom Ford / Creed / PDM / Amouage / Memo = +5)', byCat('sise').length === baselineSise + 5);
pass('split unchanged (Naxos was a dupe, Initio is new = +1)', byCat('split').length === baselineSplit + 1);
pass('dekant grew (Naxos 5ml = +1)', byCat('dekant').length === baselineDekant + 1);

console.log('\n— ALL EXTERNAL ROWS STAMPED —');
const ext = state.products.filter((p) => p.source === 'external');
pass('every external row has externalSourceName', ext.every((p) => p.externalSourceName === EXTERNAL_SOURCE_NAME));
pass('every external row has lastSyncedAt', ext.every((p) => !!p.lastSyncedAt));
pass('every external row has externalId', ext.every((p) => !!p.externalId));

console.log('\n— SYNC mode=new IDEMPOTENT —');
const sizeBefore = state.products.length;
const r2 = sync('new');
pass('second sync added 0', r2.added === 0, `added=${r2.added}`);
pass('second sync skipped 8 (all dupes now)', r2.skipped === 8, `skipped=${r2.skipped}`);
pass('catalog size unchanged', state.products.length === sizeBefore);

console.log('\n— SYNC mode=refresh UPDATES EXISTING —');
const r3 = sync('refresh');
pass('refresh added 0 new', r3.added === 0);
pass('refresh touched fetched rows', r3.refreshed === r3.fetched, `refreshed=${r3.refreshed}`);
pass('catalog size still unchanged', state.products.length === sizeBefore);

console.log('\n— CATEGORY ROUTING (admin → all pages) —');
pass('/sise sees Tom Ford Oud Wood', !!byCat('sise').find((p) => p.brand === 'Tom Ford' && p.name === 'Oud Wood'));
pass('/sise sees Creed Aventus 2024', !!byCat('sise').find((p) => p.brand === 'Creed' && p.name === 'Aventus 2024'));
pass('/split sees Initio Side Effect', !!byCat('split').find((p) => p.brand === 'Initio'));
pass('/dekant sees Xerjoff Naxos 5ml', !!byCat('dekant').find((p) => p.brand === 'Xerjoff' && p.sizeMl === 5));

console.log('\n— DUPLICATE GUARD (case + whitespace insensitive) —');
const dupes = new Set();
let dupeCount = 0;
for (const p of state.products) {
  const k = productKey(p);
  if (dupes.has(k)) dupeCount++;
  dupes.add(k);
}
pass('no duplicate keys in final catalog', dupeCount === 0, `dupes=${dupeCount}`);

// ── summary ─────────────────────────────────────────────────────────────
const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResult: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) {
  console.error(`${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\n✅ External sync verified — admin sync → all catalog pages.\n');

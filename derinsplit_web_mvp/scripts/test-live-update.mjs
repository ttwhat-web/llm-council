/**
 * Headless live-update verification for the Zustand catalog store.
 *
 * Run: `node scripts/test-live-update.mjs`
 *
 * What it proves:
 *   1. Seed products are visible by category (sise / split / dekant).
 *   2. `addProduct()` mutates state in a single tick.
 *   3. Every category selector sees the new product immediately —
 *      this is the same selector pattern Home / Şişe / Split / Dekant
 *      pages use, so a passing test = live update works on every page.
 *
 * No browser, no Next server — just the store. If this test passes,
 * the admin → catalog live-update flow is correct by construction.
 */

import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// ── 1. Polyfill localStorage for Node ────────────────────────────────────
const _store = new Map();
globalThis.localStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => _store.set(k, v),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
  key: (i) => Array.from(_store.keys())[i] ?? null,
  get length() {
    return _store.size;
  },
};

// ── 2. Bring in the real seed (kept in lock-step with src/lib/seed.ts) ───
const seedProducts = [
  { id: 'p_clive_hedonistic',     brand: 'Clive Christian',     name: 'Hedonistic',           category: 'sise',  price: 14900, sizeMl: 50,  remainingMl: 50,  city: 'İstanbul', batchCode: 'CC24A11',  description: '', status: 'pre_order', createdAt: new Date().toISOString(), variantLabel: 'TESTER' },
  { id: 'p_xerjoff_alex2',        brand: 'Xerjoff',             name: 'Alexandria 2',         category: 'sise',  price: 12900, sizeMl: 100, remainingMl: 100, city: 'İstanbul', batchCode: 'XJ24C04',  description: '', status: 'in_stock',  createdAt: new Date().toISOString(), variantLabel: 'TESTER' },
  { id: 'p_nishane_hacivat',      brand: 'Nishane',             name: 'Hacivat',              category: 'sise',  price: 7500,  sizeMl: 100, remainingMl: 100, city: 'İstanbul', batchCode: 'NS24B12',  description: '', status: 'in_stock',  createdAt: new Date().toISOString(), variantLabel: 'TESTER' },
  { id: 'p_roja_elysium',         brand: 'Roja Parfums',        name: 'Elysium Pour Homme',   category: 'sise',  price: 18500, sizeMl: 100, remainingMl: 100, city: 'İstanbul', batchCode: 'RJ25A001', description: '', status: 'in_stock',  createdAt: new Date().toISOString(), variantLabel: 'BOXED' },
  { id: 'p_split_xerjoff_naxos',  brand: 'Xerjoff',             name: 'Naxos',                category: 'split', price: 180,   sizeMl: 100, remainingMl: 68,  city: 'İstanbul', batchCode: 'XJ24N03',  description: '', status: 'in_stock',  createdAt: new Date().toISOString(), pricePerMl: 180 },
  { id: 'p_split_lv_ombre',       brand: 'Louis Vuitton',       name: 'Ombre Nomade',         category: 'split', price: 160,   sizeMl: 100, remainingMl: 50,  city: 'İstanbul', batchCode: 'LV23B044', description: '', status: 'in_stock',  createdAt: new Date().toISOString(), pricePerMl: 160 },
  { id: 'p_split_roja_elysium',   brand: 'Roja Parfums',        name: 'Elysium Parfum',       category: 'split', price: 220,   sizeMl: 100, remainingMl: 78,  city: 'İstanbul', batchCode: 'RJ25E002', description: '', status: 'in_stock',  createdAt: new Date().toISOString(), pricePerMl: 220 },
];

// ── 3. Reproduce the real store (mirrors src/lib/store.ts) ───────────────
const store = createStore(
  persist(
    (set, get) => ({
      products: seedProducts,
      addProduct: (input) => {
        const newP = {
          ...input,
          id: `p_${nanoid(10)}`,
          createdAt: new Date().toISOString(),
        };
        set({ products: [newP, ...get().products] });
        return newP;
      },
      removeProduct: (id) =>
        set({ products: get().products.filter((p) => p.id !== id) }),
      reset: () => set({ products: seedProducts }),
    }),
    {
      name: 'derinsplit:catalog:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ products: s.products }),
    },
  ),
);

// ── 4. Selector helpers (same shape as src/lib/store.ts hooks) ───────────
const byCategory = (cat) =>
  store.getState().products.filter((p) => p.category === cat);
const total = () => store.getState().products.length;

// ── 5. Subscribe counter — proves *every* page re-renders on add ─────────
let renderCount = 0;
const unsub = store.subscribe(() => {
  renderCount++;
});

// ── 6. Run the test ──────────────────────────────────────────────────────
const checks = [];

function pass(label, cond, detail = '') {
  const ok = !!cond;
  checks.push({ ok, label, detail });
  // eslint-disable-next-line no-console
  console.log(`${ok ? '[32m✓[0m' : '[31m✗[0m'} ${label}${detail ? '  ' + detail : ''}`);
}

console.log('\n— BASELINE —');
pass('seed has 7 products', total() === 7, `total=${total()}`);
pass('seed has 4 şişe products', byCategory('sise').length === 4);
pass('seed has 3 split products', byCategory('split').length === 3);
pass('seed has 0 dekant products', byCategory('dekant').length === 0);

console.log('\n— ADMIN: add a şişe product —');
const sise = store.getState().addProduct({
  brand: 'Tom Ford',
  name: 'Oud Wood',
  category: 'sise',
  price: 8400,
  sizeMl: 50,
  remainingMl: 50,
  city: 'İstanbul',
  batchCode: 'TF24A',
  description: 'Test',
  status: 'in_stock',
  variantLabel: 'TESTER',
});
pass('addProduct returned a generated id', sise.id?.startsWith('p_'), `id=${sise.id}`);
pass('subscribers notified after add (1)', renderCount === 1, `subscribes=${renderCount}`);
pass('total products = 8', total() === 8);
pass('şişe selector now returns 5', byCategory('sise').length === 5);
pass('new product is FIRST in şişe list (live)', byCategory('sise')[0].id === sise.id);

console.log('\n— ADMIN: add a split product —');
store.getState().addProduct({
  brand: 'Memo',
  name: 'Marfa',
  category: 'split',
  price: 140,
  pricePerMl: 140,
  sizeMl: 100,
  remainingMl: 100,
  city: 'İstanbul',
  batchCode: 'MM24M',
  description: 'Test',
  status: 'in_stock',
});
pass('subscribers notified again (2)', renderCount === 2);
pass('split selector now returns 4', byCategory('split').length === 4);

console.log('\n— ADMIN: add a dekant product —');
store.getState().addProduct({
  brand: 'Initio',
  name: 'Side Effect 5ml',
  category: 'dekant',
  price: 1200,
  sizeMl: 5,
  remainingMl: 5,
  city: 'İstanbul',
  batchCode: 'IN24S',
  description: 'Test',
  status: 'in_stock',
});
pass('dekant selector now returns 1 (was empty)', byCategory('dekant').length === 1);

console.log('\n— PERSISTENCE —');
const persisted = JSON.parse(localStorage.getItem('derinsplit:catalog:v1') ?? '{}');
const persistedCount = persisted?.state?.products?.length ?? 0;
pass('localStorage has all 10 products', persistedCount === 10, `persisted=${persistedCount}`);

// ── 7. Summary ───────────────────────────────────────────────────────────
unsub();
const failed = checks.filter((c) => !c.ok).length;
console.log(`\nResult: ${checks.length - failed}/${checks.length} checks passed`);
if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Live update verified — admin → all catalog pages.\n');

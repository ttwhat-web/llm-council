# DERİN SPLIT — Web MVP (Next.js)

Light luxury perfume marketplace + admin panel. Pure UI/UX layer — no
backend yet, all data comes from a Zustand store with localStorage
persist. Adding a product in the admin panel makes it appear on every
catalog page in the same paint frame.

## Run locally

```bash
cd derinsplit_web_mvp
npm install
npm run dev
# open http://localhost:3000
```

## Build for production

```bash
npm run build
npm start                 # http://localhost:3000
# or deploy `.next/` to Vercel / `out/` to Netlify after `next export`
```

## Pages

| Path                           | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `/`                            | Landing — hero + 3 category cards + featured |
| `/sise`                        | Şişe ilanları catalog                         |
| `/split`                       | Aktif splitler catalog                        |
| `/dekant`                      | Dekant catalog (yakında / boş state)          |
| `/urun/[id]`                   | Product detail with talep / sepete butonu     |
| `/hesabim`                     | Kullanıcı dashboard                           |
| `/admin`                       | Katalog yönetimi (silme / sıfırlama)          |
| `/admin/products/new`          | Yeni ürün formu                               |

## Live update flow

1. Admin opens `/admin/products/new`
2. Fills the form, hits "ÜRÜNÜ KATALOĞA EKLE"
3. `useCatalogStore.addProduct()` mutates the Zustand store + persists to
   localStorage under `derinsplit:catalog:v1`
4. Every page that uses `useProducts()` (Home, Şişe, Split, Dekant, Hesabım)
   re-renders within the same React commit — the new product is on screen
   immediately, no refresh.

## Data shape

```ts
interface Product {
  id: string;
  brand: string;
  name: string;
  category: 'sise' | 'split' | 'dekant';
  price: number;        // sise = total ₺; split = ₺/ml
  sizeMl: number;
  remainingMl: number;
  city: string;
  batchCode: string;
  imageUrl?: string;    // optional — falls back to a luxury bottle placeholder
  description: string;
  status: 'in_stock' | 'pre_order' | 'sold_out';
  createdAt: string;    // ISO
  variantLabel?: string; // TESTER / BOXED / TRAVEL
  pricePerMl?: number;
  participants?: number;
}
```

## Backend swap path

When the real API arrives:

- replace `useCatalogStore.addProduct` body with a `POST /api/products` call
- add a `hydrate()` action that runs once on mount and calls
  `GET /api/products` to populate the store
- the selector hooks (`useProducts`, `useProduct`) and every page stay
  identical, no other diff needed

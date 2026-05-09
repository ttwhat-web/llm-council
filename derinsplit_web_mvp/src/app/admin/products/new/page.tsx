'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCatalogStore } from '@/lib/store';
import type {
  Product,
  ProductCategory,
  StockStatus,
} from '@/lib/types';

export default function NewProductPage() {
  const router = useRouter();
  const add = useCatalogStore((s) => s.addProduct);

  const [form, setForm] = useState<Omit<Product, 'id' | 'createdAt'>>({
    brand: '',
    name: '',
    category: 'sise',
    price: 0,
    sizeMl: 100,
    remainingMl: 100,
    city: 'İstanbul',
    batchCode: '',
    imageUrl: '',
    description: '',
    status: 'in_stock',
    variantLabel: '',
  });
  const [submitted, setSubmitted] = useState<Product | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brand.trim() || !form.name.trim()) {
      alert('Marka ve ürün adı zorunlu.');
      return;
    }
    const cleaned: Omit<Product, 'id' | 'createdAt'> = {
      ...form,
      brand: form.brand.trim(),
      name: form.name.trim(),
      batchCode: form.batchCode.trim() || 'AUTO',
      city: form.city.trim() || 'İstanbul',
      imageUrl: form.imageUrl?.trim() || undefined,
      variantLabel: form.variantLabel?.trim() || undefined,
      pricePerMl:
        form.category === 'split' ? Number(form.price) || undefined : undefined,
    };
    const created = add(cleaned);
    setSubmitted(created);
  }

  if (submitted) {
    return (
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div
          className="surface"
          style={{
            padding: '40px 44px',
            borderRadius: 24,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background:
                'linear-gradient(135deg, #E8C879, #C8A24A)',
              margin: '0 auto 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              color: 'var(--ink)',
              fontWeight: 800,
            }}
          >
            ✓
          </div>
          <div className="eyebrow" style={{ color: 'var(--gold-dark)' }}>
            ÜRÜN EKLENDİ
          </div>
          <h1
            className="serif"
            style={{
              margin: '8px 0 6px',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {submitted.brand} {submitted.name}
          </h1>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: 0 }}>
            Ürün anında <strong>/{categoryToPath(submitted.category)}</strong>{' '}
            sayfasında ve ana sayfada listeleniyor.
          </p>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={`/${categoryToPath(submitted.category)}`}
              className="btn btn-dark"
            >
              {categoryToPath(submitted.category).toUpperCase()} SAYFASINI AÇ
            </Link>
            <Link
              href={`/urun/${submitted.id}`}
              className="btn btn-outline"
            >
              ÜRÜN DETAYINI GÖR
            </Link>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setSubmitted(null);
                setForm({
                  brand: '',
                  name: '',
                  category: 'sise',
                  price: 0,
                  sizeMl: 100,
                  remainingMl: 100,
                  city: 'İstanbul',
                  batchCode: '',
                  imageUrl: '',
                  description: '',
                  status: 'in_stock',
                  variantLabel: '',
                });
              }}
            >
              + BİR ÜRÜN DAHA EKLE
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.push('/admin')}
            >
              KATALOĞA DÖN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div
        className="surface"
        style={{ padding: '36px 40px', borderRadius: 24 }}
      >
        <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
          ADMIN · YENİ ÜRÜN
        </div>
        <h1
          className="serif"
          style={{
            margin: '6px 0 4px',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.4px',
          }}
        >
          Kataloga ürün ekle
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
          Form gönderildiği anda Ana Sayfa, Şişe, Split, Dekant listeleri
          güncellenir. Veriler localStorage'da saklanır.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
          className="ds-form-grid"
        >
          <Input
            label="MARKA *"
            value={form.brand}
            onChange={(v) => update('brand', v)}
            placeholder="Xerjoff"
          />
          <Input
            label="ÜRÜN ADI *"
            value={form.name}
            onChange={(v) => update('name', v)}
            placeholder="Naxos"
          />

          <Select
            label="KATEGORİ"
            value={form.category}
            onChange={(v) => update('category', v as ProductCategory)}
            options={[
              { value: 'sise', label: 'ŞİŞE' },
              { value: 'split', label: 'SPLIT' },
              { value: 'dekant', label: 'DEKANT' },
            ]}
          />
          <Select
            label="STOK"
            value={form.status}
            onChange={(v) => update('status', v as StockStatus)}
            options={[
              { value: 'in_stock', label: 'STOKTA' },
              { value: 'pre_order', label: 'STOKTA YOK (SİPARİŞ ÜSÜLÜ 7-10 GÜN)' },
              { value: 'sold_out', label: 'TÜKENDİ' },
            ]}
          />

          <Input
            label={form.category === 'split' ? 'BİRİM FİYAT (₺/ML)' : 'FİYAT (₺)'}
            type="number"
            value={String(form.price)}
            onChange={(v) => update('price', Number(v) || 0)}
            placeholder="14900"
          />
          <Input
            label="VARYANT (opsiyonel)"
            value={form.variantLabel ?? ''}
            onChange={(v) => update('variantLabel', v)}
            placeholder="TESTER · BOXED · TRAVEL"
          />

          <Input
            label="ŞİŞE BOYUTU (ML)"
            type="number"
            value={String(form.sizeMl)}
            onChange={(v) => update('sizeMl', Number(v) || 0)}
            placeholder="100"
          />
          <Input
            label="KALAN (ML)"
            type="number"
            value={String(form.remainingMl)}
            onChange={(v) => update('remainingMl', Number(v) || 0)}
            placeholder="100"
          />

          <Input
            label="ŞEHİR"
            value={form.city}
            onChange={(v) => update('city', v)}
            placeholder="İstanbul"
          />
          <Input
            label="BATCH KODU"
            value={form.batchCode}
            onChange={(v) => update('batchCode', v)}
            placeholder="XJ24N03"
          />

          <Input
            label="GÖRSEL URL (opsiyonel — boşsa luxury placeholder kullanılır)"
            value={form.imageUrl ?? ''}
            onChange={(v) => update('imageUrl', v)}
            placeholder="https://..."
            full
          />

          <Textarea
            label="AÇIKLAMA"
            value={form.description}
            onChange={(v) => update('description', v)}
            placeholder="Bu ürünün ne olduğunu, durumunu, kaynağını, küratör notunu yaz..."
          />

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <Link href="/admin" className="btn btn-outline">
              VAZGEÇ
            </Link>
            <button type="submit" className="btn btn-gold">
              ÜRÜNÜ KATALOĞA EKLE
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function categoryToPath(c: ProductCategory): string {
  return c === 'sise' ? 'sise' : c === 'split' ? 'split' : 'dekant';
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  full = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  return (
    <label style={{ display: 'block', gridColumn: full ? '1 / -1' : 'auto' }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: 1.6,
          fontWeight: 800,
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: 1.6,
          fontWeight: 800,
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', gridColumn: '1 / -1' }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: 1.6,
          fontWeight: 800,
          color: 'var(--ink-3)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
      />
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 14,
  color: 'var(--ink)',
  outline: 'none',
};

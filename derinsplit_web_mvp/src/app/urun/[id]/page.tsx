'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import PerfumePlaceholder, {
  moodFor,
  shapeFor,
} from '@/components/PerfumePlaceholder';
import ProductRow from '@/components/ProductRow';
import { formatTl, useProduct, useProducts } from '@/lib/store';
import { CATEGORY_LABEL, STOCK_LABEL } from '@/lib/types';

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const product = useProduct(params.id);
  const all = useProducts();
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'detay' | 'kargo' | 'iade'>('detay');

  const related = useMemo(() => {
    if (!product) return [];
    return all
      .filter((p) => p.id !== product.id)
      .sort((a, b) => {
        // Same brand bubble up, then same category
        const score = (p: typeof a) =>
          (p.brand === product.brand ? 2 : 0) +
          (p.category === product.category ? 1 : 0);
        return score(b) - score(a);
      })
      .slice(0, 4);
  }, [all, product]);

  if (!product) {
    return (
      <div
        className="container"
        style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}
      >
        <h1 className="serif" style={{ fontSize: 32 }}>
          Ürün bulunamadı
        </h1>
        <p style={{ color: 'var(--ink-3)' }}>
          Aradığınız ürün kaldırılmış veya ID hatalı.
        </p>
        <Link
          href="/sise"
          className="btn btn-dark"
          style={{ marginTop: 16 }}
        >
          ŞİŞE İLANLARINA DÖN
        </Link>
      </div>
    );
  }

  const isSplit = product.category === 'split';
  const inStock = product.status === 'in_stock';
  const fillRatio = Math.min(
    1,
    Math.max(0, product.remainingMl / product.sizeMl),
  );

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      {/* Breadcrumb */}
      <nav
        style={{
          fontSize: 11,
          letterSpacing: 1.6,
          color: 'var(--ink-3)',
          fontWeight: 700,
          marginBottom: 24,
          textTransform: 'uppercase',
        }}
      >
        <Link href="/" style={{ color: 'var(--ink-3)' }}>
          Ana Sayfa
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <Link
          href={`/${categoryPath(product.category)}`}
          style={{ color: 'var(--ink-3)' }}
        >
          {CATEGORY_LABEL[product.category]}
        </Link>
        <span style={{ margin: '0 8px' }}>/</span>
        <span style={{ color: 'var(--ink)' }}>{product.brand}</span>
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 48,
          alignItems: 'flex-start',
        }}
        className="ds-product-grid"
      >
        {/* Gallery — main + thumbnail strip */}
        <div>
          <div
            style={{
              borderRadius: 22,
              overflow: 'hidden',
              border: '1px solid var(--line)',
              boxShadow: '0 18px 40px rgba(20,20,15,0.10)',
              background: '#0A0805',
            }}
          >
            <PerfumePlaceholder
              mood={moodFor(product.brand)}
              shape={shapeFor(product.brand)}
              imageUrl={product.imageUrl}
              aspect="1 / 1"
            />
          </div>
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            {(['amber', 'oud', 'ivory', 'smoke'] as const).map((m, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  border:
                    i === 0
                      ? '1.5px solid var(--ink)'
                      : '1px solid var(--line)',
                  cursor: 'pointer',
                  opacity: i === 0 ? 1 : 0.7,
                  background: '#0A0805',
                }}
              >
                <PerfumePlaceholder
                  mood={m}
                  shape={shapeFor(product.brand)}
                  aspect="1 / 1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <span className="chip chip-gold">
              {CATEGORY_LABEL[product.category]}
            </span>
            {product.variantLabel && (
              <span
                className="chip"
                style={{
                  background: 'var(--bg-soft)',
                  color: 'var(--ink-2)',
                }}
              >
                {product.variantLabel}
              </span>
            )}
            <span
              className={`chip ${inStock ? 'chip-success' : 'chip-warn'}`}
            >
              {STOCK_LABEL[product.status]}
            </span>
          </div>

          <div
            style={{
              color: 'var(--ink-3)',
              fontSize: 11.5,
              letterSpacing: 2,
              fontWeight: 800,
              textTransform: 'uppercase',
            }}
          >
            {product.brand}
          </div>
          <h1
            className="serif"
            style={{
              margin: '4px 0 14px',
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: '-0.6px',
              lineHeight: 1.05,
            }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div
              className="serif"
              style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}
            >
              {isSplit
                ? `${formatTl(product.pricePerMl ?? product.price)}/ml`
                : formatTl(product.price)}
            </div>
            <span
              style={{
                fontSize: 13,
                color: 'var(--ink-3)',
                paddingBottom: 6,
              }}
            >
              KDV dahil
            </span>
          </div>

          {/* Capacity */}
          <div
            className="surface"
            style={{ padding: '16px 20px', marginBottom: 20 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: 800,
                color: 'var(--ink-3)',
              }}
            >
              <span>{isSplit ? 'KALAN ML' : 'ŞİŞE BOYUTU'}</span>
              <span>{product.city.toUpperCase()}</span>
            </div>
            <div
              style={{
                marginTop: 8,
                height: 8,
                borderRadius: 8,
                background: 'rgba(20,20,15,0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${fillRatio * 100}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, #E8C879, #C8A24A, #8E6F2C)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: 'var(--ink-2)',
                fontWeight: 700,
              }}
            >
              {product.remainingMl} / {product.sizeMl} ml ·{' '}
              <span style={{ color: 'var(--ink-3)' }}>
                Batch {product.batchCode}
              </span>
            </div>
          </div>

          {/* Qty + CTAs */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 26,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid var(--line)',
                borderRadius: 999,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <QtyBtn label="−" onClick={() => setQty((q) => Math.max(1, q - 1))} />
              <span
                style={{
                  padding: '12px 18px',
                  fontWeight: 800,
                  fontSize: 14,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {qty}
              </span>
              <QtyBtn label="+" onClick={() => setQty((q) => q + 1)} />
            </div>

            <button
              type="button"
              className="btn btn-dark"
              style={{ padding: '14px 22px' }}
              onClick={() =>
                alert(`Sepete ${qty} adet eklendi (demo).`)
              }
            >
              SEPETE EKLE
            </button>
            <button
              type="button"
              className="btn btn-gold"
              style={{ padding: '14px 22px' }}
              onClick={() =>
                alert(`${qty} adet için talep gönderildi (demo).`)
              }
            >
              HEMEN AL →
            </button>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'inline-flex',
              gap: 16,
              borderBottom: '1px solid var(--line)',
              marginBottom: 18,
            }}
          >
            {(
              [
                ['detay', 'DETAYLAR'],
                ['kargo', 'KARGO'],
                ['iade', 'İADE'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                style={{
                  padding: '10px 4px',
                  background: 'transparent',
                  border: 0,
                  borderBottom:
                    tab === key
                      ? '2px solid var(--ink)'
                      : '2px solid transparent',
                  color: tab === key ? 'var(--ink)' : 'var(--ink-3)',
                  fontSize: 11.5,
                  letterSpacing: 2,
                  fontWeight: 800,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.75 }}>
            {tab === 'detay' && product.description}
            {tab === 'kargo' && (
              <>
                Aynı gün gönderim için 14:00'a kadar verilen siparişler
                geçerlidir. Sigortalı kargo ile 1-3 iş günü içinde teslim
                edilir. 5.000 ₺ ve üzeri siparişlerde kargo ücretsizdir.
              </>
            )}
            {tab === 'iade' && (
              <>
                Açılmamış ürünlerde 14 gün koşulsuz iade hakkı. İade
                süreci kargo etiketi ile başlar; ürün ulaştıktan sonra 5
                iş günü içinde geri ödeme yapılır.
              </>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <ProductRow
          eyebrow="BENZER ÜRÜNLER"
          title={`Daha fazla ${product.brand}`}
          products={related}
          ctaHref={`/${categoryPath(product.category)}`}
          ctaLabel="KATEGORİYE DÖN"
          cols={4}
        />
      )}

      <style>{`
        @media (max-width: 880px) {
          .ds-product-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function QtyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        background: 'transparent',
        border: 0,
        fontSize: 18,
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function categoryPath(c: string) {
  return c === 'sise' ? 'sise' : c === 'split' ? 'split' : 'dekant';
}

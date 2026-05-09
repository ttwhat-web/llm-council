'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';

import PerfumePlaceholder, {
  moodFor,
  shapeFor,
} from '@/components/PerfumePlaceholder';
import { formatTl, useProduct } from '@/lib/store';
import { CATEGORY_LABEL, STOCK_LABEL } from '@/lib/types';

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const product = useProduct(params.id);

  if (!product) {
    return (
      <div
        className="container"
        style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}
      >
        <h1 className="serif" style={{ fontSize: 32 }}>Ürün bulunamadı</h1>
        <p style={{ color: 'var(--ink-3)' }}>
          Aradığınız ürün kaldırılmış veya ID hatalı.
        </p>
        <Link href="/sise" className="btn btn-dark" style={{ marginTop: 16 }}>
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 40,
          alignItems: 'start',
        }}
        className="ds-product-grid"
      >
        {/* Photo */}
        <div
          style={{
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid var(--line)',
            boxShadow: '0 18px 40px rgba(20,20,15,0.10)',
          }}
        >
          <PerfumePlaceholder
            mood={moodFor(product.brand)}
            shape={shapeFor(product.brand)}
            imageUrl={product.imageUrl}
            aspect="1 / 1"
          />
        </div>

        {/* Body */}
        <div>
          <span className="chip chip-gold">{CATEGORY_LABEL[product.category]}</span>
          <div
            className="eyebrow"
            style={{ marginTop: 14, color: 'var(--ink-3)' }}
          >
            {product.brand}
          </div>
          <h1
            className="serif"
            style={{
              margin: '4px 0 16px',
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-0.6px',
              lineHeight: 1.05,
            }}
          >
            {product.name}
          </h1>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: 20,
            }}
          >
            <span
              className={`chip ${inStock ? 'chip-success' : 'chip-warn'}`}
            >
              {STOCK_LABEL[product.status]}
            </span>
            {product.variantLabel && (
              <span className="chip" style={{ background: 'var(--bg-soft)', color: 'var(--ink-2)' }}>
                {product.variantLabel}
              </span>
            )}
            <span
              className="chip"
              style={{ background: 'var(--bg-soft)', color: 'var(--ink-2)' }}
            >
              {product.city}
            </span>
          </div>

          {/* Price block */}
          <div
            className="surface"
            style={{ padding: '22px 24px', marginBottom: 20 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
                  {isSplit ? 'BİRİM FİYAT' : 'TUTAR'}
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.0 }}
                >
                  {isSplit
                    ? `${formatTl(product.pricePerMl ?? product.price)}/ml`
                    : formatTl(product.price)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
                  KAPASİTE
                </div>
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      height: 6,
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
                      color: 'var(--ink-3)',
                      fontWeight: 700,
                    }}
                  >
                    {product.remainingMl} / {product.sizeMl} ml
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => alert('Talep gönderildi (demo).')}
                disabled={!inStock && product.status !== 'pre_order'}
              >
                {isSplit ? 'SPLİTE KATIL' : 'SATIN ALMA TALEBİ'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => alert('Sepete eklendi (demo).')}
              >
                + SEPETE EKLE
              </button>
            </div>
          </div>

          {/* Detail rows */}
          <DetailRow label="BATCH" value={product.batchCode} mono />
          <DetailRow label="ŞEHİR" value={product.city} />
          <DetailRow label="KATEGORİ" value={CATEGORY_LABEL[product.category]} />
          {isSplit && product.participants !== undefined && (
            <DetailRow
              label="KATILIMCI"
              value={`${product.participants} kişi`}
            />
          )}

          <p
            style={{
              marginTop: 22,
              color: 'var(--ink-2)',
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {product.description}
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-product-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          width: 110,
          color: 'var(--ink-3)',
          fontSize: 10.5,
          letterSpacing: 1.6,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
        }}
      >
        {value}
      </div>
    </div>
  );
}

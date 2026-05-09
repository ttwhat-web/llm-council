'use client';

import Link from 'next/link';

import PerfumePlaceholder, { moodFor, shapeFor } from './PerfumePlaceholder';
import { formatTl } from '@/lib/store';
import type { Product } from '@/lib/types';
import { STOCK_LABEL } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const fillRatio =
    product.sizeMl > 0
      ? Math.min(1, Math.max(0, product.remainingMl / product.sizeMl))
      : 1;

  const isSplit = product.category === 'split';
  const isDekant = product.category === 'dekant';
  const inStock = product.status === 'in_stock';

  return (
    <Link
      href={`/urun/${product.id}`}
      className="surface fade-up"
      style={{
        display: 'block',
        overflow: 'hidden',
        borderRadius: 18,
        transition: 'transform .25s ease, box-shadow .25s ease',
      }}
    >
      <div style={{ position: 'relative' }}>
        <PerfumePlaceholder
          mood={moodFor(product.brand)}
          shape={shapeFor(product.brand)}
          imageUrl={product.imageUrl}
          aspect="1 / 1"
        />
        {/* top chips */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          {product.variantLabel ? (
            <span className="chip chip-gold">{product.variantLabel}</span>
          ) : <span />}
          <span
            className={`chip ${inStock ? 'chip-success' : 'chip-warn'}`}
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            {inStock ? 'STOKTA' : 'STOKTA YOK'}
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
          {product.brand}
        </div>
        <div
          className="serif"
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: 'var(--ink)',
            lineHeight: 1.15,
            marginTop: 2,
          }}
        >
          {product.name}
        </div>
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 11.5,
            letterSpacing: 1.2,
            fontWeight: 700,
            marginTop: 2,
          }}
        >
          {(product.variantLabel ?? product.category.toUpperCase()) +
            (isDekant ? ' · YAKINDA' : '')}
        </div>

        {/* ml progress */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 700,
          }}
        >
          <span>{product.remainingMl}/{product.sizeMl} ml</span>
          {!inStock && <span style={{ color: 'var(--warning)' }}>SİPARİŞ</span>}
        </div>
        <div
          style={{
            marginTop: 6,
            height: 5,
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
            marginTop: 10,
            color: inStock ? 'var(--success)' : 'var(--warning)',
            fontSize: 10.5,
            letterSpacing: 1.4,
            fontWeight: 800,
          }}
        >
          {STOCK_LABEL[product.status]}
        </div>

        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <div
            className="serif"
            style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}
          >
            {isSplit
              ? `${formatTl(product.pricePerMl ?? product.price)}/ml`
              : formatTl(product.price)}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span
              className="btn btn-dark"
              style={{ padding: '8px 14px', fontSize: 10 }}
            >
              İNCELE →
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .surface:hover { transform: translateY(-4px); box-shadow: 0 24px 40px rgba(20,20,15,0.12); }
      `}</style>
    </Link>
  );
}

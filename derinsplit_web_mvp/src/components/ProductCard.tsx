'use client';

import Link from 'next/link';

import PerfumePlaceholder, { moodFor, shapeFor } from './PerfumePlaceholder';
import { formatTl } from '@/lib/store';
import type { Product } from '@/lib/types';
import { STOCK_LABEL } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const isSplit = product.category === 'split';
  const inStock = product.status === 'in_stock';
  const fillRatio =
    product.sizeMl > 0
      ? Math.min(1, Math.max(0, product.remainingMl / product.sizeMl))
      : 1;

  return (
    <Link
      href={`/urun/${product.id}`}
      className="ds-pcard fade-up"
      style={{
        display: 'block',
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid var(--line)',
        boxShadow: '0 4px 14px rgba(20,20,15,0.04)',
        overflow: 'hidden',
        transition: 'transform .25s ease, box-shadow .25s ease, border-color .25s',
      }}
    >
      <div style={{ position: 'relative', background: '#0A0805' }}>
        <PerfumePlaceholder
          mood={moodFor(product.brand)}
          shape={shapeFor(product.brand)}
          imageUrl={product.imageUrl}
          aspect="1 / 1"
        />

        {/* Top chips */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 6,
            pointerEvents: 'none',
          }}
        >
          {product.variantLabel ? (
            <span
              className="chip chip-gold"
              style={{ fontSize: 9.5 }}
            >
              {product.variantLabel}
            </span>
          ) : <span />}
          <span
            className="chip"
            style={{
              fontSize: 9.5,
              color: inStock ? '#7DD4A1' : '#F4B96B',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            {inStock ? 'STOKTA' : 'ÖN SİPARİŞ'}
          </span>
        </div>

        {/* Hover overlay CTA */}
        <div
          className="ds-pcard-hover"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(0deg, rgba(20,20,15,0.78) 0%, rgba(20,20,15,0.0) 60%)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 18,
            opacity: 0,
            transition: 'opacity .25s',
          }}
        >
          <span
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: '#FFFFFF',
              color: 'var(--ink)',
              fontSize: 10.5,
              letterSpacing: 2,
              fontWeight: 800,
            }}
          >
            ÜRÜNÜ İNCELE →
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 16px 18px' }}>
        <div
          style={{
            color: 'var(--ink-3)',
            fontSize: 10.5,
            letterSpacing: 1.6,
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
          {product.brand}
        </div>
        <div
          className="serif"
          style={{
            color: 'var(--ink)',
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.2,
            marginTop: 4,
            minHeight: 41,
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2,
            overflow: 'hidden',
          }}
        >
          {product.name}
        </div>

        <div
          style={{
            marginTop: 8,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            color: 'var(--ink-3)',
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          <span>{product.sizeMl} ml</span>
          <span style={{ color: 'var(--line)' }}>·</span>
          <span>{product.city}</span>
          {product.variantLabel && (
            <>
              <span style={{ color: 'var(--line)' }}>·</span>
              <span>{product.variantLabel}</span>
            </>
          )}
        </div>

        {/* Capacity bar for split products */}
        {isSplit && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                height: 4,
                borderRadius: 6,
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
                marginTop: 5,
                fontSize: 10.5,
                color: 'var(--ink-3)',
                letterSpacing: 0.8,
                fontWeight: 600,
              }}
            >
              {product.remainingMl}/{product.sizeMl} ml kaldı
            </div>
          </div>
        )}

        {/* Price row */}
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <div className="serif" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>
            {isSplit
              ? `${formatTl(product.pricePerMl ?? product.price)}/ml`
              : formatTl(product.price)}
          </div>
          {!inStock && (
            <span
              style={{
                fontSize: 9.5,
                color: 'var(--warning)',
                letterSpacing: 1.2,
                fontWeight: 800,
              }}
            >
              7-10 GÜN
            </span>
          )}
        </div>
      </div>

      <style>{`
        .ds-pcard:hover {
          transform: translateY(-4px);
          box-shadow: 0 28px 50px rgba(20,20,15,0.12);
          border-color: rgba(20,20,15,0.16);
        }
        .ds-pcard:hover .ds-pcard-hover {
          opacity: 1;
        }
      `}</style>
    </Link>
  );
}

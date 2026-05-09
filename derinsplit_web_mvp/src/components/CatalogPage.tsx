'use client';

import { useMemo, useState } from 'react';

import ProductCard from './ProductCard';
import { useProducts } from '@/lib/store';
import type { ProductCategory } from '@/lib/types';

interface Props {
  category: ProductCategory;
  title: string;
  subtitle: string;
  eyebrow?: string;
  comingSoon?: boolean;
}

/**
 * Shared light-luxury catalog layout used by /sise, /split and /dekant.
 *
 * Reads products from the Zustand store, so admin additions appear here
 * instantly without a refresh.
 */
export default function CatalogPage({
  category,
  title,
  subtitle,
  eyebrow = 'KÜRATÖR ONAYLI · BATCH DOĞRULAMALI',
  comingSoon = false,
}: Props) {
  const all = useProducts(category);
  const [stock, setStock] = useState<'all' | 'in_stock' | 'pre_order'>('all');
  const [variant, setVariant] = useState<'all' | 'TESTER' | 'BOXED'>('all');

  const items = useMemo(() => {
    return all.filter((p) => {
      if (stock !== 'all' && p.status !== stock) return false;
      if (variant !== 'all' && (p.variantLabel ?? '') !== variant) return false;
      return true;
    });
  }, [all, stock, variant]);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      {/* Editorial dark hero strip */}
      <div
        style={{
          borderRadius: 22,
          padding: '32px 36px',
          background:
            'linear-gradient(135deg, #14110A 0%, #06070A 100%)',
          color: '#F5F1E8',
          boxShadow: '0 24px 60px rgba(0,0,0,0.32)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '6px 12px',
            border: '1px solid rgba(232,200,121,0.45)',
            borderRadius: 999,
            color: '#E8C879',
            fontSize: 10,
            letterSpacing: 2.4,
            fontWeight: 800,
          }}
        >
          {eyebrow}
        </div>
        <h1
          className="serif"
          style={{
            margin: '14px 0 12px',
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: '-0.6px',
            lineHeight: 1.0,
            backgroundImage:
              'linear-gradient(135deg, #F5F1E8, #E8C879, #F5F1E8)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            color: 'rgba(245,241,232,0.78)',
            fontSize: 14,
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Filter bar */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          className="chip"
          style={{ background: 'var(--ink)', color: '#fff' }}
        >
          {items.length} ÜRÜN
        </span>
        <FilterChip
          label="TÜMÜ"
          active={stock === 'all'}
          onClick={() => setStock('all')}
        />
        <FilterChip
          label="STOKTA"
          active={stock === 'in_stock'}
          onClick={() => setStock('in_stock')}
        />
        <FilterChip
          label="ÖN SİPARİŞ"
          active={stock === 'pre_order'}
          onClick={() => setStock('pre_order')}
        />
        <span
          style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 6px' }}
        />
        <FilterChip
          label="HEPSİ"
          active={variant === 'all'}
          onClick={() => setVariant('all')}
        />
        <FilterChip
          label="TESTER"
          active={variant === 'TESTER'}
          onClick={() => setVariant('TESTER')}
        />
        <FilterChip
          label="BOXED"
          active={variant === 'BOXED'}
          onClick={() => setVariant('BOXED')}
        />
      </div>

      {/* Grid */}
      <div
        style={{
          marginTop: 28,
          display: 'grid',
          gap: 22,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}
      >
        {items.length === 0 && (
          <div
            className="surface"
            style={{
              padding: '80px 40px',
              textAlign: 'center',
              gridColumn: '1 / -1',
              color: 'var(--ink-3)',
            }}
          >
            {comingSoon
              ? 'Bu bölüm yakında açılıyor. İlk ürünler küratör seçimiyle eklenecek.'
              : 'Bu kategoride henüz ürün yok. Admin panelinden bir ürün ekleyince burada görünecek.'}
          </div>
        )}
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 14px',
        borderRadius: 999,
        border: active ? '1px solid var(--ink)' : '1px solid var(--line)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? '#fff' : 'var(--ink)',
        fontSize: 10.5,
        letterSpacing: 1.6,
        fontWeight: 800,
        textTransform: 'uppercase',
        transition: 'background .18s, border-color .18s',
      }}
    >
      {label}
    </button>
  );
}

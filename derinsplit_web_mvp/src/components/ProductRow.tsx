import Link from 'next/link';

import ProductCard from './ProductCard';
import type { Product } from '@/lib/types';

interface Props {
  eyebrow: string;
  title: string;
  products: Product[];
  ctaLabel?: string;
  ctaHref?: string;
  cols?: number;
}

export default function ProductRow({
  eyebrow,
  title,
  products,
  ctaLabel = 'TÜMÜNÜ GÖR',
  ctaHref = '/sise',
  cols = 4,
}: Props) {
  if (products.length === 0) return null;
  return (
    <section style={{ marginTop: 64 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              color: 'var(--gold-dark)',
              fontSize: 10.5,
              letterSpacing: 3,
              fontWeight: 800,
            }}
          >
            {eyebrow}
          </div>
          <h2
            className="serif"
            style={{
              margin: '6px 0 0',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.4px',
              lineHeight: 1.05,
            }}
          >
            {title}
          </h2>
        </div>
        <Link
          href={ctaHref}
          className="btn btn-outline"
          style={{ padding: '10px 16px', fontSize: 10.5 }}
        >
          {ctaLabel} →
        </Link>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 22,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
        className={`ds-row-grid ds-row-${cols}`}
      >
        {products.slice(0, cols * 2).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .ds-row-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 880px) {
          .ds-row-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .ds-row-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

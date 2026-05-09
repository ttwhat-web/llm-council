'use client';

import Link from 'next/link';

import { formatTl, useCatalogStore, useProducts } from '@/lib/store';
import { CATEGORY_LABEL, STOCK_LABEL } from '@/lib/types';

export default function AdminPage() {
  const products = useProducts();
  const remove = useCatalogStore((s) => s.removeProduct);
  const reset = useCatalogStore((s) => s.reset);

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div
        className="surface"
        style={{ padding: '32px 36px', borderRadius: 24 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
              ADMIN PANEL
            </div>
            <h1
              className="serif"
              style={{
                margin: '6px 0 4px',
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: '-0.4px',
              }}
            >
              KATALOG YÖNETİMİ
            </h1>
            <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
              {products.length} ürün · değişiklikler tüm sayfalara anında yansır
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                if (confirm('Tüm değişiklikleri sıfırlamak istiyor musun?')) {
                  reset();
                }
              }}
            >
              SEED'E DÖN
            </button>
            <Link href="/admin/products/new" className="btn btn-gold">
              + YENİ ÜRÜN
            </Link>
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            border: '1px solid var(--line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13.5,
            }}
          >
            <thead style={{ background: 'rgba(20,20,15,0.04)' }}>
              <tr>
                <Th>ÜRÜN</Th>
                <Th>KATEGORİ</Th>
                <Th align="right">FİYAT</Th>
                <Th>ML</Th>
                <Th>ŞEHİR</Th>
                <Th>BATCH</Th>
                <Th>STOK</Th>
                <Th align="right">EKLENME</Th>
                <Th align="right"></Th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center',
                      padding: 32,
                      color: 'var(--ink-3)',
                    }}
                  >
                    Henüz ürün yok. Yukarıdaki "+ YENİ ÜRÜN"den ekle.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr
                  key={p.id}
                  style={{ borderTop: '1px solid var(--line)' }}
                >
                  <Td>
                    <div style={{ fontWeight: 700 }}>
                      {p.brand}{' '}
                      <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                        {p.name}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-3)',
                        letterSpacing: 0.4,
                      }}
                    >
                      {p.id}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className="chip chip-gold"
                      style={{ fontSize: 9.5 }}
                    >
                      {CATEGORY_LABEL[p.category]}
                    </span>
                  </Td>
                  <Td align="right">
                    {p.category === 'split'
                      ? `${formatTl(p.pricePerMl ?? p.price)}/ml`
                      : formatTl(p.price)}
                  </Td>
                  <Td>{p.remainingMl}/{p.sizeMl}</Td>
                  <Td>{p.city}</Td>
                  <Td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                    {p.batchCode}
                  </Td>
                  <Td>
                    <span
                      style={{
                        fontSize: 10.5,
                        letterSpacing: 1.4,
                        fontWeight: 800,
                        color:
                          p.status === 'in_stock'
                            ? 'var(--success)'
                            : p.status === 'pre_order'
                            ? 'var(--warning)'
                            : 'var(--error)',
                      }}
                    >
                      {STOCK_LABEL[p.status]}
                    </span>
                  </Td>
                  <Td align="right" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                    {new Date(p.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Td>
                  <Td align="right">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${p.brand} ${p.name}" silinsin mi?`)) {
                          remove(p.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--line)',
                        borderRadius: 999,
                        padding: '6px 10px',
                        fontSize: 10.5,
                        letterSpacing: 1.4,
                        fontWeight: 800,
                        color: 'var(--error)',
                      }}
                    >
                      SİL
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '12px 14px',
        fontSize: 10,
        letterSpacing: 1.6,
        fontWeight: 800,
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  style,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  return (
    <td style={{ padding: '12px 14px', textAlign: align, ...(style ?? {}) }}>
      {children}
    </td>
  );
}

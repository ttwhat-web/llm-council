'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  findDuplicateGroups,
  formatTl,
  useCatalogStore,
} from '@/lib/store';
import { CATEGORY_LABEL } from '@/lib/types';

export default function ImportPage() {
  const products = useCatalogStore((s) => s.products);
  const lastSyncAt = useCatalogStore((s) => s.lastSyncAt);
  const lastSyncResult = useCatalogStore((s) => s.lastSyncResult);
  const syncInFlight = useCatalogStore((s) => s.syncInFlight);
  const syncExternal = useCatalogStore((s) => s.syncExternal);
  const clearExternal = useCatalogStore((s) => s.clearExternal);

  const [showDupes, setShowDupes] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const externalCount = products.filter((p) => p.source === 'external').length;
  const manualCount = products.length - externalCount;
  const duplicates = useMemo(() => findDuplicateGroups(products), [products]);

  async function runSync(mode: 'new' | 'refresh') {
    setBanner(null);
    try {
      const r = await syncExternal(mode);
      setBanner(
        mode === 'new'
          ? `Senkronizasyon tamam — ${r.added} yeni ürün eklendi, ${r.skipped} mevcut atlandı.`
          : `Yenileme tamam — ${r.added} yeni, ${r.refreshed} güncellendi, ${r.skipped} atlandı.`,
      );
    } catch (e) {
      setBanner('Senkronizasyon başarısız: ' + (e as Error).message);
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div
        className="surface"
        style={{ padding: '32px 36px', borderRadius: 24 }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
          <Link
            href="/admin"
            style={{
              fontSize: 11,
              letterSpacing: 1.6,
              color: 'var(--ink-3)',
              fontWeight: 800,
            }}
          >
            ← KATALOG
          </Link>
          <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>
            ADMIN · DIŞ SİTEDEN İÇE AKTARIM
          </span>
        </div>
        <h1
          className="serif"
          style={{
            margin: '4px 0 4px',
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.4px',
          }}
        >
          Ürün senkronizasyonu
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
          Dış kaynaktan (Şişeci Boutique) gelen ürünleri DerinSplit kataloğuna
          aktarın. Aynı <code>marka · isim · batch</code> kombinasyonu tekrar
          eklenmez. Senkronizasyon tamamlandığı anda ürünler Ana Sayfa, Şişe,
          Split, Dekant ve ürün detay sayfalarına otomatik düşer.
        </p>

        {/* Status row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 24,
          }}
          className="ds-import-stats"
        >
          <Stat label="TOPLAM ÜRÜN" value={String(products.length)} sub="KATALOG" />
          <Stat label="MANUEL" value={String(manualCount)} sub="ADMIN EKLEDİ" />
          <Stat label="DIŞ KAYNAK" value={String(externalCount)} sub="SYNC GELDİ" gold />
          <Stat
            label="SON SYNC"
            value={lastSyncAt ? formatDate(lastSyncAt) : '—'}
            sub={lastSyncResult?.sourceName ?? 'HENÜZ ÇALIŞMADI'}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            className="btn btn-gold"
            disabled={syncInFlight}
            onClick={() => runSync('new')}
          >
            {syncInFlight ? 'SENKRONİZE EDİLİYOR…' : 'DIŞ SİTEDEN SENKRONİZE ET'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={syncInFlight}
            onClick={() => runSync('new')}
          >
            SADECE YENİ ÜRÜNLERİ AL
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={syncInFlight}
            onClick={() => runSync('refresh')}
          >
            TÜMÜNÜ YENİLE
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowDupes((v) => !v)}
          >
            {showDupes ? 'DUPLICATE’LERİ GİZLE' : `DUPLICATE’LERİ GÖSTER (${duplicates.length})`}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ marginLeft: 'auto', color: 'var(--error)', borderColor: 'rgba(163,59,59,0.4)' }}
            onClick={() => {
              const n = clearExternal();
              setBanner(`${n} dış kaynak ürünü kataloğdan kaldırıldı.`);
            }}
          >
            DIŞ ÜRÜNLERİ KALDIR
          </button>
        </div>

        {banner && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(200,162,74,0.10)',
              border: '1px solid rgba(200,162,74,0.4)',
              color: 'var(--ink)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {banner}
          </div>
        )}

        {/* Duplicates panel */}
        {showDupes && (
          <div
            style={{
              marginTop: 22,
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '18px 20px',
              background: 'rgba(20,20,15,0.03)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.8,
                fontWeight: 800,
                color: 'var(--ink-3)',
                marginBottom: 8,
              }}
            >
              DUPLICATE GRUPLARI
            </div>
            {duplicates.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>
                Hiç duplicate yok — her ürün eşsiz batch + marka + isim
                kombinasyonu.
              </div>
            ) : (
              duplicates.map((group, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 0',
                    borderBottom:
                      i === duplicates.length - 1
                        ? 'none'
                        : '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {group[0].brand} · {group[0].name}{' '}
                    <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>
                      ({group[0].batchCode})
                    </span>
                  </div>
                  <div style={{ marginTop: 4, color: 'var(--ink-3)', fontSize: 12 }}>
                    {group.length} kopya — kaynaklar:{' '}
                    {group.map((p) => p.source ?? 'manual').join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Synced products list */}
      <div
        className="surface"
        style={{ padding: '28px 32px', borderRadius: 24, marginTop: 24 }}
      >
        <h2
          className="serif"
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 14,
          }}
        >
          Senkronize edilmiş ürünler
        </h2>
        {externalCount === 0 ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>
            Henüz dış kaynaktan ürün gelmedi. Yukarıdaki <strong>DIŞ
            SİTEDEN SENKRONİZE ET</strong> butonuna basarak başlatabilirsiniz.
          </div>
        ) : (
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
                <Th>BATCH</Th>
                <Th>KAYNAK</Th>
                <Th align="right">SON SYNC</Th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter((p) => p.source === 'external')
                .map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: '1px solid var(--line)' }}
                  >
                    <Td>
                      <Link href={`/urun/${p.id}`}>
                        <strong>{p.brand}</strong>{' '}
                        <span style={{ color: 'var(--ink-3)' }}>{p.name}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="chip chip-gold" style={{ fontSize: 9.5 }}>
                        {CATEGORY_LABEL[p.category]}
                      </span>
                    </Td>
                    <Td align="right">
                      {p.category === 'split'
                        ? `${formatTl(p.pricePerMl ?? p.price)}/ml`
                        : formatTl(p.price)}
                    </Td>
                    <Td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>
                      {p.batchCode}
                    </Td>
                    <Td style={{ fontSize: 12 }}>{p.externalSourceName ?? '—'}</Td>
                    <Td align="right" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {p.lastSyncedAt ? formatDate(p.lastSyncedAt) : '—'}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-import-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  gold = false,
}: {
  label: string;
  value: string;
  sub: string;
  gold?: boolean;
}) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        background: gold
          ? 'linear-gradient(135deg, #E8C879, #C8A24A)'
          : '#FFFFFF',
        border: gold ? 'none' : '1px solid var(--line)',
        boxShadow: gold
          ? '0 14px 26px rgba(200,162,74,0.25)'
          : '0 4px 12px rgba(20,20,15,0.04)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.6,
          fontWeight: 800,
          color: gold ? 'rgba(20,20,15,0.7)' : 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{
          marginTop: 8,
          fontSize: 24,
          fontWeight: 800,
          color: 'var(--ink)',
          lineHeight: 1.0,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          letterSpacing: 1.4,
          fontWeight: 700,
          color: gold ? 'rgba(20,20,15,0.7)' : 'var(--ink-3)',
        }}
      >
        {sub}
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

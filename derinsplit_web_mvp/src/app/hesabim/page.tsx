'use client';

import { useState } from 'react';

import { useProducts } from '@/lib/store';

export default function HesabimPage() {
  const all = useProducts();
  const [tab, setTab] = useState<'profil' | 'siparis' | 'odeme'>('profil');

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div
        className="surface"
        style={{ padding: '40px 44px', borderRadius: 24 }}
      >
        <div
          className="eyebrow"
          style={{ color: 'var(--ink-3)' }}
        >
          KULLANICI DASHBOARD
        </div>
        <h1
          className="serif"
          style={{
            margin: '6px 0 4px',
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: '-0.4px',
          }}
        >
          TUNÇ TUNÇEL
        </h1>
        <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
          tunctuncel95@gmail.com · @tunc_tuncel
        </div>

        {/* Stats */}
        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }}
          className="ds-stats"
        >
          <Stat label="TRUST SCORE" value="92" sub="%92" gold />
          <Stat label="AKTİF SİPARİŞ" value="3" sub="KARGO" />
          <Stat label="TOPLAM SPLIT" value="14" sub="+2 BU AY" />
          <Stat label="KOLEKSİYON" value="47.520 ₺" sub="PİYASA" />
        </div>

        {/* Tabs */}
        <div
          style={{
            marginTop: 28,
            display: 'inline-flex',
            padding: 4,
            borderRadius: 999,
            background: 'rgba(20,20,15,0.04)',
            border: '1px solid var(--line)',
          }}
        >
          {(['profil', 'siparis', 'odeme'] as const).map((t) => {
            const label =
              t === 'profil'
                ? 'PROFİLİM'
                : t === 'siparis'
                ? 'SİPARİŞLERİM'
                : 'ÖDEME';
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: 0,
                  background: tab === t ? 'var(--ink)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--ink-2)',
                  fontSize: 11,
                  letterSpacing: 2,
                  fontWeight: 800,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 24 }}>
          {tab === 'profil' && <ProfilePanel />}
          {tab === 'siparis' && (
            <EmptyPanel text="Henüz sipariş geçmişiniz bulunmuyor." />
          )}
          {tab === 'odeme' && (
            <EmptyPanel text="Kayıtlı ödeme yöntemi bulunmuyor. Sipariş sırasında 3D Secure ile güvenli ödeme yapabilirsiniz." />
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div
        className="surface"
        style={{ padding: '28px 32px', marginTop: 24 }}
      >
        <div className="eyebrow" style={{ color: 'var(--ink-3)' }}>
          SON HAREKETLER
        </div>
        <ul
          style={{
            listStyle: 'none',
            margin: '14px 0 0',
            padding: 0,
            display: 'grid',
            gap: 10,
          }}
        >
          {[
            { t: 'Xerjoff Naxos splitine 5 ml katıldınız.', s: '2 saat önce · ₺900', c: 'var(--success)' },
            { t: 'Layton Exclusif ilanına 9.200 ₺ teklif verdiniz.', s: 'Dün · BEKLEMEDE', c: 'var(--warning)' },
            { t: `Toplam ${all.length} ürün koleksiyon kataloğunda.`, s: 'Otomatik', c: 'var(--gold-dark)' },
          ].map((row, i) => (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '8px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: row.c,
                }}
              />
              <span style={{ fontSize: 13.5 }}>{row.t}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: 1.2, fontWeight: 700 }}>
                {row.s}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-stats { grid-template-columns: repeat(2, 1fr) !important; }
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
        borderRadius: 16,
        background: gold
          ? 'linear-gradient(135deg, #E8C879, #C8A24A)'
          : 'var(--surface)',
        border: gold ? 'none' : '1px solid var(--line)',
        boxShadow: gold
          ? '0 18px 28px rgba(200,162,74,0.32)'
          : '0 6px 18px rgba(20,20,15,0.05)',
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
          fontSize: 28,
          fontWeight: 800,
          color: 'var(--ink)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
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

function ProfilePanel() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: 20,
      }}
      className="ds-profile-grid"
    >
      <div
        className="surface"
        style={{ padding: '22px 24px' }}
      >
        <div className="eyebrow">BİLGİ GÜNCELLEME</div>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
        <Field label="MEVCUT TELEFON" value="5333819200" />
        <input
          placeholder="Yeni Telefon No..."
          style={inputStyle}
        />
        <button
          type="button"
          className="btn btn-dark"
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          onClick={() => alert('Talep gönderildi (demo).')}
        >
          TELEFONU GÜNCELLEME TALEBİ GÖNDER
        </button>

        <Field
          label="MEVCUT ADRES"
          value="Yeni mahalle hasan kalesi caddesi no 5 1/A ava villaları avanos Nevşehir"
          gap
        />
        <textarea
          placeholder="Yeni Adres..."
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
        />
        <button
          type="button"
          className="btn btn-dark"
          style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          onClick={() => alert('Talep gönderildi (demo).')}
        >
          ADRESİ GÜNCELLEME TALEBİ GÖNDER
        </button>
      </div>

      <div
        className="surface"
        style={{ padding: '22px 24px' }}
      >
        <div className="eyebrow">ONAY BEKLEYEN DEĞİŞİKLİKLER</div>
        <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '14px 0' }} />
        <div
          style={{
            background: 'rgba(20,20,15,0.03)',
            borderRadius: 14,
            padding: '38px 18px',
            textAlign: 'center',
            color: 'var(--ink-3)',
            fontSize: 13,
            border: '1px solid var(--line)',
          }}
        >
          Henüz bekleyen değişiklik talebiniz yok.
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .ds-profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div
      className="surface"
      style={{
        padding: '60px 40px',
        textAlign: 'center',
        color: 'var(--ink-3)',
      }}
    >
      {text}
    </div>
  );
}

function Field({
  label,
  value,
  gap = false,
}: {
  label: string;
  value: string;
  gap?: boolean;
}) {
  return (
    <div style={{ marginTop: gap ? 22 : 0, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: 1.6,
          fontWeight: 800,
          color: 'var(--ink-3)',
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
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
  marginTop: 8,
};

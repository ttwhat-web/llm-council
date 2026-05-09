'use client';

import Link from 'next/link';

import CategoryCards from '@/components/CategoryCards';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import { useProducts } from '@/lib/store';

export default function HomePage() {
  const all = useProducts();
  const featured = all.slice(0, 4);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <Hero />
      <CategoryCards />

      {/* Featured row */}
      <section style={{ marginTop: 80 }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: 'var(--gold-dark)',
                fontSize: 10.5,
                letterSpacing: 3,
                fontWeight: 800,
              }}
            >
              KÜRATÖR SEÇİMİ
            </div>
            <h2
              className="serif"
              style={{
                margin: '8px 0 0',
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '-0.4px',
              }}
            >
              Bu hafta sahnede
            </h2>
          </div>
          <Link
            href="/sise"
            className="btn btn-outline"
            style={{ padding: '10px 16px', fontSize: 10.5 }}
          >
            TÜMÜNÜ GÖR →
          </Link>
        </header>

        {featured.length === 0 ? (
          <div
            className="surface"
            style={{
              padding: '60px 40px',
              textAlign: 'center',
              color: 'var(--ink-3)',
            }}
          >
            Henüz ürün eklenmedi. Admin panelinden ekleyince burada görünecek.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 22,
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            }}
          >
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Curator note + newsletter strip */}
      <section
        style={{
          marginTop: 80,
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 24,
        }}
        className="ds-strip"
      >
        <div
          style={{
            padding: '40px 36px',
            borderRadius: 22,
            background:
              'linear-gradient(135deg, #14110A, #06070A)',
            color: '#F5F1E8',
            boxShadow: '0 18px 40px rgba(0,0,0,0.20)',
          }}
        >
          <div
            style={{
              color: '#E8C879',
              fontSize: 10.5,
              letterSpacing: 3,
              fontWeight: 800,
            }}
          >
            KÜRATÖR NOTU
          </div>
          <p
            className="serif"
            style={{
              margin: '14px 0 0',
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.3,
              fontStyle: 'italic',
            }}
          >
            “Bir parfüm hatıralarla başlar.<br />Biz hatırayı güvenle paylaşırız.”
          </p>
          <p
            style={{
              marginTop: 20,
              color: 'rgba(245,241,232,0.75)',
              fontSize: 13.5,
              lineHeight: 1.65,
            }}
          >
            Topluluğumuza her hafta yeni splitler eklenir; küratör ekibimiz
            batch doğrulama, kanıtlanmış kaynak ve AI destekli risk skorunu
            zorunlu kılar.
          </p>
        </div>

        <div
          style={{
            padding: '36px',
            borderRadius: 22,
            background:
              'linear-gradient(135deg, rgba(200,162,74,0.20), rgba(255,255,255,0.6))',
            border: '1px solid rgba(200,162,74,0.4)',
          }}
        >
          <div
            style={{
              color: 'var(--gold-dark)',
              fontSize: 10.5,
              letterSpacing: 3,
              fontWeight: 800,
            }}
          >
            YENİ DROP BİLDİRİMİ
          </div>
          <h3
            className="serif"
            style={{
              margin: '12px 0 6px',
              fontSize: 22,
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            Sınırlı stok dropları kaçırmayın
          </h3>
          <p
            style={{
              margin: '0 0 18px',
              color: 'var(--ink-2)',
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            Yeni splitler ve nadir şişeler için haftalık küratör bültenine
            katılın.
          </p>
          <NewsletterForm />
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .ds-strip { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function NewsletterForm() {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alert('Listeye eklendiniz. (Demo)');
      }}
      style={{
        display: 'flex',
        gap: 8,
        background: '#fff',
        borderRadius: 999,
        padding: 6,
        border: '1px solid var(--line)',
      }}
    >
      <input
        type="email"
        placeholder="e-posta adresiniz"
        required
        style={{
          flex: 1,
          border: 0,
          outline: 0,
          padding: '10px 14px',
          fontSize: 13,
          background: 'transparent',
          color: 'var(--ink)',
        }}
      />
      <button type="submit" className="btn btn-gold" style={{ padding: '10px 18px' }}>
        KATIL
      </button>
    </form>
  );
}

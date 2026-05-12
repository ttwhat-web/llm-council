import Link from 'next/link';

import PerfumePlaceholder from './PerfumePlaceholder';

export default function EditorialBlock() {
  return (
    <section
      style={{
        marginTop: 80,
        borderRadius: 28,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #14110A, #06070A)',
        boxShadow: '0 24px 56px rgba(0,0,0,0.22)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.1fr',
          minHeight: 380,
        }}
        className="ds-editorial-grid"
      >
        <div
          style={{
            position: 'relative',
            minHeight: 320,
          }}
        >
          <PerfumePlaceholder mood="oud" shape="tall" aspect="auto" />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(0,0,0,0) 60%, rgba(6,7,10,0.95) 100%)',
            }}
          />
        </div>

        <div
          style={{
            padding: '64px 56px',
            color: '#F5F1E8',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: '#E8C879',
              fontSize: 10.5,
              letterSpacing: 3,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            KÜRATÖR HİKAYESİ
          </span>
          <h2
            className="serif"
            style={{
              margin: '0 0 16px',
              fontSize: 'clamp(28px, 3.4vw, 44px)',
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.5px',
              maxWidth: 520,
              backgroundImage:
                'linear-gradient(135deg, #F5F1E8, #E8C879, #F5F1E8)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Her şişenin arkasında bir hikaye var.
          </h2>
          <p
            style={{
              margin: '0 0 24px',
              color: 'rgba(245,241,232,0.72)',
              fontSize: 15,
              lineHeight: 1.7,
              maxWidth: 480,
            }}
          >
            Doğu Akdeniz'in oud kokularından, Paris'in beyaz çiçeklerine. Her
            hafta, dünyanın farklı atölyelerinden seçtiğimiz koleksiyon
            parçalarını topluluğumuza sunuyoruz. Tüm ürünlerimiz yetkili
            bayilerden, faturalı ve batch numaralı temin edilir.
          </p>
          <Link
            href="/sise"
            className="btn"
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1px solid rgba(232,200,121,0.55)',
              color: '#E8C879',
              padding: '12px 20px',
            }}
          >
            KOLEKSİYONA GİT →
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .ds-editorial-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

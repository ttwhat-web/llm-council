import Link from 'next/link';

import PerfumePlaceholder from './PerfumePlaceholder';

export default function Hero() {
  return (
    <section
      style={{
        marginTop: 28,
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: '0 28px 60px rgba(0,0,0,0.22)',
        background: 'linear-gradient(135deg, #14110A 0%, #06070A 65%, #130D14 100%)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          minHeight: 520,
        }}
        className="ds-hero-grid"
      >
        {/* Left: editorial copy */}
        <div
          style={{
            position: 'relative',
            padding: '72px 56px',
            color: '#F5F1E8',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Amber glow */}
          <div
            style={{
              position: 'absolute',
              left: '-120px',
              top: '-120px',
              width: 460,
              height: 460,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(232,200,121,0.25) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />

          <span
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '6px 14px',
              border: '1px solid rgba(232,200,121,0.45)',
              borderRadius: 999,
              color: '#E8C879',
              fontSize: 10.5,
              letterSpacing: 3,
              fontWeight: 800,
            }}
          >
            FALL · WINTER · 2026 KOLEKSİYONU
          </span>

          <h1
            className="serif"
            style={{
              margin: '20px 0 16px',
              fontSize: 'clamp(44px, 5.5vw, 84px)',
              lineHeight: 0.98,
              letterSpacing: '-1.5px',
              fontWeight: 700,
              backgroundImage:
                'linear-gradient(135deg, #F5F1E8 0%, #E8C879 50%, #F5F1E8 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              maxWidth: 560,
            }}
          >
            Niche parfümün<br />en derin köşesi.
          </h1>

          <p
            style={{
              color: 'rgba(245,241,232,0.74)',
              fontSize: 16,
              maxWidth: 480,
              lineHeight: 1.65,
              margin: '0 0 28px',
            }}
          >
            Tester ve boxed şişeler, küratör onaylı splitler ve sınırlı stok
            dekant koleksiyonları. Türkiye'nin en seçkin parfüm topluluğuna
            adım atın.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/sise" className="btn btn-gold">
              ŞİŞELERİ KEŞFET
            </Link>
            <Link
              href="/split"
              className="btn"
              style={{
                background: 'transparent',
                border: '1px solid rgba(232,200,121,0.55)',
                color: '#E8C879',
              }}
            >
              SPLİTLERE GÖZ AT
            </Link>
          </div>

          <div
            style={{
              marginTop: 36,
              display: 'flex',
              gap: 30,
              flexWrap: 'wrap',
              color: 'rgba(245,241,232,0.6)',
              fontSize: 11,
              letterSpacing: 1.6,
              fontWeight: 700,
            }}
          >
            <span>120+ MARKA</span>
            <span style={{ color: 'rgba(245,241,232,0.25)' }}>·</span>
            <span>HAFTALIK YENİ DROP</span>
            <span style={{ color: 'rgba(245,241,232,0.25)' }}>·</span>
            <span>BATCH DOĞRULAMALI</span>
          </div>
        </div>

        {/* Right: editorial bottle composition */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '48px 36px',
            background:
              'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '85%',
              height: '85%',
              top: '6%',
            }}
          >
            <PerfumePlaceholder mood="ivory" shape="round" aspect="1 / 1.05" />
          </div>
          {/* Floating mini bottles for editorial layering */}
          <div
            style={{
              position: 'absolute',
              left: 28,
              bottom: 30,
              width: 130,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 18px 30px rgba(0,0,0,0.40)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-hidden
          >
            <PerfumePlaceholder mood="oud" shape="tall" aspect="3 / 4" />
          </div>
          <div
            style={{
              position: 'absolute',
              right: 24,
              top: 28,
              width: 120,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 18px 30px rgba(0,0,0,0.40)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            aria-hidden
          >
            <PerfumePlaceholder mood="amber" shape="niche" aspect="3 / 4" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .ds-hero-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

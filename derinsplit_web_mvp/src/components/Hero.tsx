import Link from 'next/link';

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        marginTop: 28,
        borderRadius: 28,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}
    >
      {/* Dark perfume mood backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, #1A1108 0%, #06070A 65%, #130D14 100%)',
        }}
      />
      {/* Amber spotlight */}
      <div
        style={{
          position: 'absolute',
          right: '-10%',
          top: '-30%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(232,200,121,0.30) 0%, transparent 65%)',
        }}
      />
      {/* Violet underglow */}
      <div
        style={{
          position: 'absolute',
          left: '-15%',
          bottom: '-30%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(107,62,142,0.18) 0%, transparent 60%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          padding: '88px 64px 80px',
          minHeight: 460,
          color: '#F5F1E8',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            border: '1px solid rgba(232,200,121,0.45)',
            borderRadius: 999,
            color: '#E8C879',
            fontSize: 10.5,
            letterSpacing: 3,
            fontWeight: 800,
          }}
        >
          PRIVATE COLLECTOR CLUB
        </span>

        <h1
          className="serif"
          style={{
            fontSize: 'clamp(40px, 6.4vw, 88px)',
            margin: '24px 0 12px',
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: '-1.2px',
            backgroundImage:
              'linear-gradient(135deg, #F5F1E8, #E8C879, #F5F1E8)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            maxWidth: 760,
          }}
        >
          Hoş geldiniz
        </h1>
        <p
          style={{
            color: 'rgba(245,241,232,0.74)',
            fontSize: 16,
            maxWidth: 560,
            margin: '0 0 32px',
            lineHeight: 1.65,
          }}
        >
          Türkiye’nin en seçkin parfüm topluluğuna adım atın. Kokuların
          dünyasını keşfetmek için bölümleri inceleyin.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/sise" className="btn btn-gold">
            HEMEN KEŞFET
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
            SPLITLER
          </Link>
        </div>
      </div>
    </section>
  );
}

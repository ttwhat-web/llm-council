const BRANDS = [
  'Xerjoff',
  'Clive Christian',
  'Roja Parfums',
  'Amouage',
  'Parfums de Marly',
  'Tom Ford',
  'Nishane',
  'Initio',
  'Memo',
  'Maison Crivelli',
];

export default function BrandStrip() {
  return (
    <section style={{ marginTop: 72 }}>
      <div
        style={{
          textAlign: 'center',
          color: 'var(--ink-3)',
          fontSize: 10.5,
          letterSpacing: 3,
          fontWeight: 800,
          textTransform: 'uppercase',
        }}
      >
        Yetkili bayilerden, küratör onaylı
      </div>
      <div
        style={{
          marginTop: 22,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '28px 48px',
          alignItems: 'center',
        }}
      >
        {BRANDS.map((b) => (
          <span
            key={b}
            className="serif"
            style={{
              color: 'var(--ink-2)',
              fontSize: 22,
              letterSpacing: 1.5,
              fontWeight: 700,
              opacity: 0.78,
              transition: 'opacity .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.78')}
          >
            {b}
          </span>
        ))}
      </div>
    </section>
  );
}

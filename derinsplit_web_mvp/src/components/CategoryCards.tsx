import Link from 'next/link';

import PerfumePlaceholder from './PerfumePlaceholder';

export default function CategoryCards() {
  const cards = [
    {
      title: 'SPLIT',
      subtitle:
        'Parfümleri paylaşın, ml veya şişe taleplerini zaman sırasıyla yönetin.',
      kicker: 'AKTİF',
      kickerColor: '#4D8A5E',
      href: '/split',
      mood: 'amber' as const,
      shape: 'flask' as const,
    },
    {
      title: 'ŞİŞE SATIŞLARI',
      subtitle:
        'Parfüm şişelerini inceleyin ve satın alma talebi gönderin.',
      kicker: 'AKTİF',
      kickerColor: '#4D8A5E',
      href: '/sise',
      mood: 'violet' as const,
      shape: 'round' as const,
    },
    {
      title: 'DEKANT',
      subtitle: 'Dekant satış yakında.',
      kicker: 'YAKINDA',
      kickerColor: '#B58730',
      href: '/dekant',
      mood: 'smoke' as const,
      shape: 'niche' as const,
    },
  ];

  return (
    <section
      style={{
        marginTop: 64,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
      }}
      className="ds-cat-grid"
    >
      {cards.map((c) => (
        <Link
          href={c.href}
          key={c.title}
          style={{
            position: 'relative',
            borderRadius: 22,
            overflow: 'hidden',
            minHeight: 420,
            display: 'block',
            boxShadow: '0 14px 40px rgba(0,0,0,0.16)',
            transition: 'transform .25s ease, box-shadow .25s ease',
          }}
          className="ds-cat-card"
        >
          <PerfumePlaceholder mood={c.mood} shape={c.shape} aspect="4 / 5" />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
            }}
          >
            <span
              className="chip"
              style={{
                color: c.kickerColor,
                background: 'rgba(255,255,255,0.10)',
                border: `1px solid ${c.kickerColor}80`,
              }}
            >
              {c.kicker}
            </span>
          </div>
          <div
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              bottom: 24,
              color: '#F5F1E8',
            }}
          >
            <h3
              className="serif"
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: '-0.5px',
              }}
            >
              {c.title}
            </h3>
            <p
              style={{
                margin: '8px 0 16px',
                color: 'rgba(245,241,232,0.75)',
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {c.subtitle}
            </p>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                border: '1px solid rgba(232,200,121,0.55)',
                color: '#E8C879',
                fontSize: 10.5,
                fontWeight: 800,
                letterSpacing: 2.2,
              }}
            >
              İNCELE →
            </span>
          </div>
        </Link>
      ))}
      <style>{`
        .ds-cat-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(0,0,0,0.30); }
        @media (max-width: 980px) {
          .ds-cat-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
}

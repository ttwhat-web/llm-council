interface Signal {
  title: string;
  body: string;
  symbol: string;
}

const SIGNALS: Signal[] = [
  {
    symbol: '◇',
    title: 'KÜRATÖR ONAYLI',
    body: 'Tüm şişeler küratör süzgecinden ve batch doğrulamadan geçer.',
  },
  {
    symbol: '◊',
    title: 'FATURALI · ORİJİNAL',
    body: 'Yetkili bayilerden temin edilen, faturalı ve orijinal ürünler.',
  },
  {
    symbol: '✦',
    title: 'SİGORTALI KARGO',
    body: 'Aynı gün gönderim · sigortalı paketleme · Türkiye geneli.',
  },
  {
    symbol: '◈',
    title: 'GÜVENLİ İADE',
    body: 'Açılmamış ürünlerde 14 gün koşulsuz iade hakkı.',
  },
];

export default function TrustSignals() {
  return (
    <section
      style={{
        marginTop: 80,
        padding: '28px 0',
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 30,
        }}
        className="ds-trust-grid"
      >
        {SIGNALS.map((s) => (
          <div
            key={s.title}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                border: '1px solid var(--gold)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: 'var(--gold-dark)',
                flexShrink: 0,
              }}
            >
              {s.symbol}
            </span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.8,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  marginBottom: 4,
                }}
              >
                {s.title}
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--ink-3)',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 880px) {
          .ds-trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .ds-trust-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 96,
        background: '#0E0D0A',
        color: '#D9D4C5',
      }}
    >
      <div
        className="container"
        style={{
          padding: '60px 32px 24px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
          gap: 40,
        }}
      >
        <div>
          <div
            className="serif"
            style={{
              fontSize: 22,
              letterSpacing: 4,
              fontWeight: 800,
              backgroundImage:
                'linear-gradient(135deg, #E8C879, #C8A24A, #8E6F2C)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            DERİN  SPLIT
          </div>
          <p
            style={{
              marginTop: 18,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'rgba(217,212,197,0.65)',
              maxWidth: 340,
            }}
          >
            Türkiye'nin en seçkin parfüm topluluğu. Şişe satışları, splitler,
            dekant koleksiyonları ve küratör seçkileri. Tüm ürünlerimiz
            faturalı ve batch doğrulamalıdır.
          </p>
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              gap: 8,
            }}
          >
            <SocialIcon label="IG" />
            <SocialIcon label="WA" />
            <SocialIcon label="TW" />
            <SocialIcon label="PI" />
          </div>
        </div>

        <Column
          title="ALIŞVERİŞ"
          items={[
            { label: 'Şişe İlanları', href: '/sise' },
            { label: 'Aktif Splitler', href: '/split' },
            { label: 'Dekant', href: '/dekant' },
            { label: 'Yeni Drop', href: '/sise' },
            { label: 'Küratör Seçimi', href: '/sise' },
          ]}
        />
        <Column
          title="HESAP"
          items={[
            { label: 'Hesabım', href: '/hesabim' },
            { label: 'Siparişlerim', href: '/hesabim' },
            { label: 'Adreslerim', href: '/hesabim' },
            { label: 'Trust Center', href: '/hesabim' },
            { label: 'Admin Panel', href: '/admin' },
          ]}
        />
        <Column
          title="YARDIM"
          items={[
            { label: 'Kargo & Teslimat', href: '#' },
            { label: 'İade & Değişim', href: '#' },
            { label: 'Sıkça Sorulanlar', href: '#' },
            { label: 'KVKK', href: '#' },
            { label: 'Kullanım Koşulları', href: '#' },
            { label: 'İletişim', href: '#' },
          ]}
        />
      </div>

      <div
        style={{
          borderTop: '1px solid rgba(217,212,197,0.12)',
        }}
      >
        <div
          className="container"
          style={{
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
            fontSize: 11,
            letterSpacing: 1.4,
            color: 'rgba(217,212,197,0.5)',
            fontWeight: 700,
          }}
        >
          <span>© 2026 DERİN SPLIT · PRIVATE COLLECTOR CLUB · EST. 2026</span>
          <span>VISA · MASTERCARD · IYZICO · IBAN</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          footer .container[style*="grid-template-columns"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 580px) {
          footer .container[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  );
}

function Column({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2.2,
          fontWeight: 800,
          color: '#F5F1E8',
        }}
      >
        {title}
      </div>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '16px 0 0',
          display: 'grid',
          gap: 10,
        }}
      >
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              style={{
                color: 'rgba(217,212,197,0.65)',
                fontSize: 13,
                transition: 'color .15s',
              }}
              className="ds-foot-link"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
      <style>{`
        .ds-foot-link:hover { color: var(--gold-light) !important; }
      `}</style>
    </div>
  );
}

function SocialIcon({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '1px solid rgba(217,212,197,0.25)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        letterSpacing: 1.2,
        fontWeight: 800,
        color: 'rgba(217,212,197,0.7)',
      }}
    >
      {label}
    </span>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { label: 'ANA SAYFA', href: '/' },
  { label: 'ŞİŞE', href: '/sise' },
  { label: 'SPLIT', href: '/split' },
  { label: 'DEKANT', href: '/dekant' },
  { label: 'HESABIM', href: '/hesabim' },
  { label: 'ADMIN', href: '/admin' },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(241, 238, 230, 0.88)',
        backdropFilter: 'saturate(140%) blur(18px)',
        WebkitBackdropFilter: 'saturate(140%) blur(18px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="container"
        style={{
          height: 78,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            marginRight: 10,
          }}
        >
          <Emblem />
          <span
            className="serif"
            style={{
              fontWeight: 800,
              letterSpacing: 4,
              fontSize: 18,
              backgroundImage:
                'linear-gradient(135deg, #E8C879, #C8A24A, #8E6F2C)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            DERİN&nbsp;&nbsp;SPLIT
          </span>
        </Link>

        {/* Center nav */}
        <nav
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {ITEMS.map((item) => {
            const active =
              item.href === '/' ? path === '/' : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 14px',
                  borderRadius: 0,
                  borderBottom: active
                    ? '2px solid var(--ink)'
                    : '2px solid transparent',
                  color: active ? 'var(--ink)' : 'var(--ink-2)',
                  fontSize: 11.5,
                  letterSpacing: 2.2,
                  fontWeight: 700,
                  transition: 'border-color .2s, color .2s',
                }}
                className="ds-nav-link"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster — search + cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton label="Ara" symbol="⌕" />
          <IconButton label="Sepet" symbol="◧" badge="0" />
          <Link
            href="/admin/products/new"
            className="btn btn-gold"
            style={{ padding: '10px 16px', fontSize: 10.5 }}
          >
            + ÜRÜN EKLE
          </Link>
        </div>
      </div>
      <style>{`
        .ds-nav-link:hover { color: var(--ink) !important; }
      `}</style>
    </header>
  );
}

function IconButton({
  label,
  symbol,
  badge,
}: {
  label: string;
  symbol: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      style={{
        position: 'relative',
        width: 38,
        height: 38,
        borderRadius: '50%',
        border: '1px solid var(--line)',
        background: 'transparent',
        color: 'var(--ink-2)',
        fontSize: 18,
        lineHeight: 1,
      }}
    >
      {symbol}
      {badge !== undefined && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 999,
            background: 'var(--ink)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function Emblem() {
  return (
    <span
      aria-hidden
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        border: '1px solid var(--gold)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 18px rgba(200,162,74,0.45)',
      }}
    >
      <span
        style={{
          width: 6,
          height: 12,
          borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%',
          background: 'var(--gold)',
        }}
      />
    </span>
  );
}

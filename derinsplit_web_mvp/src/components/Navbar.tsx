'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { label: 'ANA SAYFA', href: '/' },
  { label: 'SPLIT', href: '/split' },
  { label: 'ŞİŞE', href: '/sise' },
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
        background: 'rgba(241, 238, 230, 0.78)',
        backdropFilter: 'saturate(140%) blur(18px)',
        WebkitBackdropFilter: 'saturate(140%) blur(18px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div
        className="container"
        style={{
          height: 76,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* Social */}
        <div style={{ display: 'flex', gap: 6 }}>
          <SocialIcon label="Instagram" />
          <SocialIcon label="WhatsApp" />
        </div>

        {/* Wordmark */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Emblem />
          <span
            className="serif"
            style={{
              fontWeight: 800,
              letterSpacing: 4,
              fontSize: 16,
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

        {/* Center pill nav */}
        <nav
          style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {ITEMS.map((item) => {
            const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink-2)',
                  fontSize: 11.5,
                  letterSpacing: 2.4,
                  fontWeight: 700,
                  transition: 'background .18s',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <Link
          href="/admin/products/new"
          className="btn btn-gold"
          style={{ padding: '10px 18px', fontSize: 11 }}
        >
          + ÜRÜN EKLE
        </Link>
      </div>
    </header>
  );
}

function SocialIcon({ label }: { label: string }) {
  return (
    <span
      aria-label={label}
      role="img"
      style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: '1px solid var(--line)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'var(--ink-2)',
      }}
    >
      {label === 'Instagram' ? '◎' : '◊'}
    </span>
  );
}

function Emblem() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '1px solid var(--gold)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 16px rgba(200,162,74,0.45)',
      }}
    >
      <span style={{ width: 6, height: 12, borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%', background: 'var(--gold)' }} />
    </span>
  );
}

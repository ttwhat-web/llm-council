import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'DerinSplit — Live Operations',
  description: 'Real-time event console for the DerinSplit marketplace',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            padding: '14px 24px',
            background: '#0B0B0F',
            borderBottom: '1px solid #252538',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'Georgia, serif',
              letterSpacing: 3,
              color: '#C8A24A',
              fontWeight: 700,
            }}
          >
            DERİN  SPLIT
          </span>
          <span style={{ color: '#7A7A8C', fontSize: 11, letterSpacing: 2 }}>
            · LIVE OPS CONSOLE
          </span>
        </header>
        <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>{children}</main>
      </body>
    </html>
  );
}

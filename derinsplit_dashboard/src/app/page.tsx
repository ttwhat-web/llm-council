import Link from 'next/link';
import EventFeed from '@/components/EventFeed';
import { api } from '@/lib/api';

async function loadInitial() {
  try {
    const [splits, listings] = await Promise.all([
      api.listSplits('open'),
      api.listListings(),
    ]);
    return { splits, listings, error: null as string | null };
  } catch (e) {
    return { splits: [], listings: [], error: (e as Error).message };
  }
}

export default async function HomePage() {
  const { splits, listings, error } = await loadInitial();

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section>
        <h1 style={{ margin: 0, fontSize: 22 }}>Real-time marketplace operations</h1>
        <p style={{ color: '#B5B5C5', marginTop: 8, fontSize: 14, maxWidth: 720 }}>
          This dashboard subscribes to <code>splits:global</code>,{' '}
          <code>market:global</code> and <code>ai:risk</code> over WebSocket. Every
          action that hits the API — a join, an offer, a payment, an AI risk
          update — appears here within ~10 ms thanks to Redis pub/sub fan-out.
        </p>
      </section>

      {error && (
        <div
          style={{
            padding: 12,
            border: '1px solid #F8717155',
            color: '#F87171',
            borderRadius: 8,
            background: '#220E0E',
            fontSize: 13,
          }}
        >
          API unreachable: {error}. Start the backend with{' '}
          <code>docker compose up</code> or <code>npm run start:dev</code>.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
        <section>
          <h2 style={{ fontSize: 14, letterSpacing: 1.4, color: '#C8A24A' }}>
            OPEN SPLITS ({splits.length})
          </h2>
          <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
            {splits.map((s: any) => (
              <li
                key={s.id}
                style={{
                  padding: 12,
                  background: '#141420',
                  border: '1px solid #252538',
                  borderRadius: 12,
                }}
              >
                <Link href={`/splits/${s.id}`}>
                  <div style={{ fontWeight: 700 }}>
                    {s.perfume?.brand} {s.perfume?.name}
                  </div>
                  <div style={{ color: '#B5B5C5', fontSize: 12, marginTop: 4 }}>
                    {s.filledMl}/{s.totalVolumeMl} ml ·{' '}
                    {Number(s.pricePerMl).toFixed(0)} ₺/ml ·{' '}
                    {s.aiRiskScore ?? '—'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 14, letterSpacing: 1.4, color: '#C8A24A' }}>
            LIVE EVENT STREAM
          </h2>
          <EventFeed
            channels={['splits:global', 'market:global', 'ai:risk']}
          />
        </section>
      </div>

      <section>
        <h2 style={{ fontSize: 14, letterSpacing: 1.4, color: '#C8A24A' }}>
          ACTIVE LISTINGS ({listings.length})
        </h2>
        <ul style={{ display: 'grid', gap: 8, listStyle: 'none', padding: 0 }}>
          {listings.map((l: any) => (
            <li
              key={l.id}
              style={{
                padding: 12,
                background: '#141420',
                border: '1px solid #252538',
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              <strong>
                {l.perfume?.brand} {l.perfume?.name}
              </strong>
              <span style={{ color: '#7A7A8C', marginLeft: 8 }}>
                {l.bottleSizeMl}ml · {l.city} ·{' '}
                {l.price ? `${Number(l.price).toFixed(0)} ₺` : 'TRADE'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

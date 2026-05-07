import { notFound } from 'next/navigation';
import EventFeed from '@/components/EventFeed';
import { api } from '@/lib/api';

export default async function SplitLivePage({
  params,
}: {
  params: { id: string };
}) {
  let split: any;
  try {
    split = await api.getSplit(params.id);
  } catch {
    notFound();
  }

  const remaining = split.totalVolumeMl - split.filledMl;
  const pct = (split.filledMl / split.totalVolumeMl) * 100;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>
        {split.perfume?.brand} {split.perfume?.name}
      </h1>
      <div style={{ color: '#B5B5C5', fontSize: 13 }}>
        {split.concentration} · {split.bottleSizeMl} ml · batch{' '}
        <code>{split.batchCode}</code>
      </div>

      <section
        style={{
          padding: 16,
          background: '#141420',
          border: '1px solid #252538',
          borderRadius: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <strong style={{ color: '#C8A24A', letterSpacing: 1.2 }}>
            SPLIT STATUS · {split.status}
          </strong>
          <span style={{ color: '#7A7A8C', fontSize: 12 }}>
            closes {new Date(split.closesAt).toLocaleString()}
          </span>
        </div>
        <div
          style={{
            height: 10,
            background: '#1B1B2A',
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, #E2C46E, #C8A24A, #A8842F)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <span>
            <strong>{split.filledMl}</strong> filled
          </span>
          <span style={{ color: '#4ADE80' }}>
            <strong>{remaining}</strong> remaining
          </span>
          <span style={{ marginLeft: 'auto', color: '#C8A24A', fontWeight: 700 }}>
            {Number(split.pricePerMl).toFixed(0)} ₺ / ml
          </span>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 14, letterSpacing: 1.4, color: '#C8A24A' }}>
          LIVE — splits:{params.id}
        </h2>
        <EventFeed
          channels={[
            `splits:${params.id}`,
            `ai:risk:${params.id}`,
            'splits:global',
          ]}
        />
      </section>
    </div>
  );
}

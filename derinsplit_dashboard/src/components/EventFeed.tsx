'use client';

import { useEffect, useState } from 'react';
import { EventEnvelope, getSocket, subscribe } from '@/lib/socket';

const colorFor = (type: string): string => {
  if (type.startsWith('split.') || type.startsWith('ml.') || type.startsWith('bottle.'))
    return '#C8A24A';
  if (type.startsWith('listing.') || type.startsWith('offer.')) return '#60A5FA';
  if (type.startsWith('ai.')) return '#A78BFA';
  if (type.startsWith('payment.')) return '#4ADE80';
  return '#7A7A8C';
};

export default function EventFeed({ channels }: { channels: string[] }) {
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onEvent = (env: EventEnvelope) => {
      setEvents((prev) => [env, ...prev].slice(0, 100));
    };
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('event', onEvent);

    if (s.connected) onConnect();
    subscribe(channels);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('event', onEvent);
    };
  }, [channels.join(',')]);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 8,
            background: connected ? '#4ADE80' : '#F87171',
            display: 'inline-block',
          }}
        />
        <strong style={{ fontSize: 14 }}>
          {connected ? 'LIVE' : 'reconnecting…'}
        </strong>
        <span style={{ color: '#7A7A8C', fontSize: 12 }}>
          {channels.join('  ·  ')}
        </span>
      </header>

      {events.length === 0 && (
        <div style={{ color: '#7A7A8C', fontSize: 13 }}>
          waiting for events…
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              padding: '8px 10px',
              background: '#141420',
              border: '1px solid #252538',
              borderLeft: `3px solid ${colorFor(e.type)}`,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: colorFor(e.type), fontWeight: 700 }}>
                {e.type}
              </span>
              <span style={{ color: '#7A7A8C' }}>
                {new Date(e.occurredAt).toLocaleTimeString()}
              </span>
            </div>
            <div style={{ color: '#B5B5C5', marginTop: 2 }}>
              {e.aggregateType ? `${e.aggregateType}#${e.aggregateId} · ` : ''}
              {JSON.stringify(e.payload)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

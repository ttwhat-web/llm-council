import { nanoid } from 'nanoid';
import type { EventType } from './event-types';

/**
 * Every event published through the bus is wrapped in this envelope.
 * Stable shape → frontends + consumers can rely on it without per-event branching.
 */
export interface EventEnvelope<P = unknown> {
  id: string;
  type: EventType;
  occurredAt: string;       // ISO timestamp
  actorId?: string | null;  // user that caused the event, null for system
  aggregateType?: string;   // 'split' | 'listing' | 'offer' | …
  aggregateId?: string;     // the row id of the aggregate
  channels: string[];       // WS channels the gateway will fan-out to
  payload: P;
}

export function makeEvent<P>(
  type: EventType,
  payload: P,
  meta: {
    actorId?: string | null;
    aggregateType?: string;
    aggregateId?: string;
    channels: string[];
  },
): EventEnvelope<P> {
  return {
    id: `evt_${nanoid(16)}`,
    type,
    occurredAt: new Date().toISOString(),
    actorId: meta.actorId ?? null,
    aggregateType: meta.aggregateType,
    aggregateId: meta.aggregateId,
    channels: meta.channels,
    payload,
  };
}

/**
 * Internal Redis topic. Single key keeps fan-out logic centralised on the
 * subscriber side — channel routing is part of the envelope, not the topic.
 */
export const REDIS_EVENT_TOPIC = 'derinsplit:events';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  EventEnvelope,
  REDIS_EVENT_TOPIC,
  makeEvent,
} from './event-envelope';
import type { EventType } from './event-types';

/**
 * EventBusService is the single seam between domain code and the rest of the
 * system. Domain services NEVER touch Redis or Socket.IO directly; they call
 * `bus.publish(event)`.
 *
 * Flow per publish:
 *   1. persist envelope to EventLog (for audit + replay)
 *   2. PUBLISH on Redis topic so every API instance receives a copy
 *   3. an in-process Subject re-emits to local consumers
 *      (the RealtimeGateway + per-domain processors subscribe to it)
 *
 * This keeps the domain logic synchronous w.r.t. the DB transaction while
 * giving the WS layer a fully async fanout pipeline.
 */
@Injectable()
export class EventBusService implements OnModuleInit {
  private readonly logger = new Logger(EventBusService.name);
  private readonly stream$ = new Subject<EventEnvelope>();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** RealtimeGateway subscribes to this stream and broadcasts to Socket.IO. */
  get events$(): Observable<EventEnvelope> {
    return this.stream$.asObservable();
  }

  async onModuleInit() {
    await this.redis.subscriber.subscribe(REDIS_EVENT_TOPIC);
    this.redis.subscriber.on('message', (channel, raw) => {
      if (channel !== REDIS_EVENT_TOPIC) return;
      try {
        const env = JSON.parse(raw) as EventEnvelope;
        this.stream$.next(env);
      } catch (e) {
        this.logger.warn(`bad event payload: ${(e as Error).message}`);
      }
    });
    this.logger.log(`subscribed to ${REDIS_EVENT_TOPIC}`);
  }

  /** Convenience helper to construct + publish in one call. */
  async emit<P>(
    type: EventType,
    payload: P,
    meta: {
      actorId?: string | null;
      aggregateType?: string;
      aggregateId?: string;
      channels: string[];
    },
  ): Promise<EventEnvelope<P>> {
    const env = makeEvent(type, payload, meta);
    await this.publish(env);
    return env;
  }

  async publish<P>(env: EventEnvelope<P>): Promise<void> {
    // 1) persist
    await this.prisma.eventLog.create({
      data: {
        id: env.id,
        type: env.type,
        aggregateId: env.aggregateId ?? null,
        aggregateType: env.aggregateType ?? null,
        actorId: env.actorId ?? null,
        channels: env.channels,
        payload: env.payload as object,
      },
    });

    // 2) cross-instance fanout via Redis pub/sub
    await this.redis.publisher.publish(REDIS_EVENT_TOPIC, JSON.stringify(env));
  }
}

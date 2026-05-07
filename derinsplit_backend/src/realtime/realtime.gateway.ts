import { Logger, OnModuleInit, UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';

import { EventBusService } from '../common/events/event-bus.service';
import { CH } from '../common/events/event-types';

/**
 * Single global gateway for all real-time traffic.
 *
 * Channels are Socket.IO rooms. Clients call `subscribe` with a list of
 * channels they want updates from; the gateway joins them to those rooms.
 *
 * The gateway also subscribes to the in-process event stream from
 * EventBusService and emits each envelope to every channel listed in
 * `env.channels`. Cross-instance fanout is handled by the Redis IO adapter.
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private busSub?: Subscription;

  constructor(
    private readonly bus: EventBusService,
    private readonly jwt: JwtService,
  ) {}

  onModuleInit() {
    this.busSub = this.bus.events$.subscribe((env) => {
      // Fan-out: each event lists the channels it should land in.
      // Clients receive a single message type 'event' with the envelope.
      for (const ch of env.channels) {
        this.server.to(ch).emit('event', env);
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    // Optional auth: token via query or auth header. Anonymous connections
    // are allowed for public channels (splits:global, market:global, ai:risk).
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
        (client.data as any).userId = payload.sub;
        // every authed client is auto-joined to its private channel
        await client.join(CH.user(payload.sub));
      } catch {
        // invalid token → still allow public channels, just no user room
      }
    }

    this.logger.log(
      `WS connect ${client.id} user=${(client.data as any).userId ?? 'anon'}`,
    );
    client.emit('hello', {
      socketId: client.id,
      authenticated: Boolean((client.data as any).userId),
      serverTime: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnect ${client.id}`);
  }

  /** Client → server: "subscribe me to these channels". */
  @SubscribeMessage('subscribe')
  async onSubscribe(
    @MessageBody() body: { channels: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const allowed = (body?.channels ?? []).filter((c) =>
      this.canJoin(c, (client.data as any).userId),
    );
    await Promise.all(allowed.map((c) => client.join(c)));
    return { ok: true, joined: allowed };
  }

  @SubscribeMessage('unsubscribe')
  async onUnsubscribe(
    @MessageBody() body: { channels: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const channels = body?.channels ?? [];
    await Promise.all(channels.map((c) => client.leave(c)));
    return { ok: true, left: channels };
  }

  @SubscribeMessage('ping')
  onPing() {
    return { pong: Date.now() };
  }

  /**
   * Authorisation rules for joining a channel. Public channels are open;
   * `user:{id}` is only joinable by that user; conversation channels would
   * be checked against participants in a real implementation.
   */
  private canJoin(channel: string, userId?: string): boolean {
    if (
      channel === 'splits:global' ||
      channel === 'market:global' ||
      channel === 'ai:risk' ||
      channel.startsWith('splits:') ||
      channel.startsWith('listings:') ||
      channel.startsWith('ai:risk:')
    ) {
      return true;
    }
    if (channel.startsWith('user:')) {
      return Boolean(userId) && channel === CH.user(userId!);
    }
    if (channel.startsWith('payments:') || channel.startsWith('conversation:')) {
      return Boolean(userId);
    }
    return false;
  }
}

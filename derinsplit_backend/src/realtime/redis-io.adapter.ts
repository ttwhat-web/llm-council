import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Wires the Socket.IO Redis adapter so multiple API instances all see the
 * same emit() calls. Without this, broadcasting from instance A would not
 * reach a client connected to instance B.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterCtor!: ReturnType<typeof createAdapter>;

  async connectToRedis(url: string): Promise<void> {
    const pub = new Redis(url, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    this.adapterCtor = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
        credentials: true,
      },
    });
    server.adapter(this.adapterCtor);
    return server;
  }
}

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

/**
 * RedisService owns three connections:
 *
 *   - `client`     : general-purpose commands (GET / SET / EXPIRE / pipeline)
 *   - `publisher`  : dedicated PUB connection used by EventBusService
 *   - `subscriber` : dedicated SUB connection (pub/sub mode disables normal cmds)
 *
 * Separate connections are required because ioredis enters subscriber mode
 * on the connection that runs SUBSCRIBE — that connection can no longer issue
 * arbitrary commands.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  public client!: Redis;
  public publisher!: Redis;
  public subscriber!: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('redis.url')!;
    const opts: RedisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    };
    this.client = new Redis(url, opts);
    this.publisher = new Redis(url, opts);
    this.subscriber = new Redis(url, opts);

    for (const [name, conn] of [
      ['client', this.client],
      ['publisher', this.publisher],
      ['subscriber', this.subscriber],
    ] as const) {
      conn.on('connect', () => this.logger.log(`redis[${name}] connected`));
      conn.on('error', (e) =>
        this.logger.error(`redis[${name}] error: ${e.message}`),
      );
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.client?.quit(),
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }
}

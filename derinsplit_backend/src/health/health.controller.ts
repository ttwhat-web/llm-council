import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get('health')
  async health() {
    const [dbOk, redisOk] = await Promise.all([
      this.prisma
        .$queryRaw`select 1`
        .then(() => true)
        .catch(() => false),
      this.redis.client
        .ping()
        .then(() => true)
        .catch(() => false),
    ]);
    return {
      status: dbOk && redisOk ? 'ok' : 'degraded',
      db: dbOk,
      redis: redisOk,
      uptimeSec: Math.round(process.uptime()),
    };
  }
}

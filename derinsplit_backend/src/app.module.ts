import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { EventBusModule } from './common/events/event-bus.module';
import { configuration } from './config/configuration';
import { HealthController } from './health/health.controller';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RedisModule } from './redis/redis.module';
import { SplitsModule } from './splits/splits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Infra (global)
    PrismaModule,
    RedisModule,
    EventBusModule,
    // Realtime gateway
    RealtimeModule,
    // Domain
    AuthModule,
    SplitsModule,
    MarketplaceModule,
    AiModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

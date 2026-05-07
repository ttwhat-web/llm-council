import { Module } from '@nestjs/common';

import { MarketplaceModule } from '../marketplace/marketplace.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [MarketplaceModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

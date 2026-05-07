import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  controllers: [MarketplaceController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class MarketplaceModule {}

import { Module } from '@nestjs/common';
import { SplitsController } from './splits.controller';
import { SplitsService } from './splits.service';

@Module({
  controllers: [SplitsController],
  providers: [SplitsService],
  exports: [SplitsService],
})
export class SplitsModule {}

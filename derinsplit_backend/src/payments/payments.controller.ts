import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

class InitiateDto {
  @IsString() splitRequestId!: string;
}
class StubConfirmDto {
  @IsOptional() @IsBoolean() succeed?: boolean;
}

@ApiTags('payments')
@Controller('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post('initiate')
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiateDto) {
    return this.svc.initiate(dto.splitRequestId, user.id);
  }

  /**
   * Stub provider confirmation. Replace with a real provider webhook
   * (Iyzico/Stripe) — verify HMAC against PAYMENTS_WEBHOOK_SECRET first.
   */
  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: StubConfirmDto,
  ) {
    return this.svc.confirmStub(id, dto.succeed ?? true);
  }
}

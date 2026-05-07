import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  BottleRequestDto,
  CreateSplitDto,
  JoinSplitDto,
} from './dto/create-split.dto';
import { SplitsService } from './splits.service';

@ApiTags('splits')
@Controller('splits')
export class SplitsController {
  constructor(private readonly splits: SplitsService) {}

  @Get()
  list(@Query('filter') filter: 'open' | 'bottle_left' | 'closed' = 'open') {
    return this.splits.list(filter);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.splits.get(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.trusted_seller, UserRole.admin)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSplitDto) {
    return this.splits.create(user.id, dto);
  }

  @Post(':id/requests')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  join(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinSplitDto,
  ) {
    return this.splits.joinSplit(id, user.id, dto);
  }

  @Post(':id/bottle-requests')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  bottle(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: BottleRequestDto,
  ) {
    return this.splits.bottleRequest(id, user.id, dto);
  }

  @Post(':id/waitlist')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  waitlist(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: JoinSplitDto,
  ) {
    return this.splits.joinWaitlist(id, user.id, dto.amountMl);
  }
}

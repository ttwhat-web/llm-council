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
import { ListingType } from '@prisma/client';

import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import {
  CounterOfferDto,
  CreateListingDto,
  CreateOfferDto,
} from './dto/listing.dto';
import { ListingsService } from './listings.service';

@ApiTags('marketplace')
@Controller()
export class MarketplaceController {
  constructor(private readonly svc: ListingsService) {}

  @Get('listings')
  list(
    @Query('type') type?: ListingType,
    @Query('city') city?: string,
  ) {
    return this.svc.list({ type, city });
  }

  @Get('listings/:id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post('listings')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.svc.create(user.id, dto);
  }

  @Post('listings/:id/offers')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  offer(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOfferDto,
  ) {
    return this.svc.createOffer(id, user.id, dto);
  }

  @Post('offers/:id/accept')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.acceptOffer(id, user.id);
  }

  @Post('offers/:id/reject')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.rejectOffer(id, user.id);
  }

  @Post('offers/:id/counter')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  counter(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CounterOfferDto,
  ) {
    return this.svc.counterOffer(id, user.id, dto);
  }
}

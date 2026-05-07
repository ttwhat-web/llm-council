import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListingType, OfferType } from '@prisma/client';

export class CreateListingDto {
  @IsString() perfumeId!: string;
  @IsEnum(ListingType) type!: ListingType;
  @IsInt() @Min(1) bottleSizeMl!: number;
  @IsInt() @Min(0) remainingMl!: number;
  @IsString() batchCode!: string;
  @IsString() city!: string;
  @IsOptional() @IsBoolean() hasBox?: boolean;
  @IsOptional() @IsString() tradeExpectations?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];

  @ValidateIf((o) => o.type !== ListingType.trade)
  @IsNumber()
  @Min(1)
  price?: number;
}

export class CreateOfferDto {
  @IsEnum(OfferType) type!: OfferType;
  @IsOptional() @IsNumber() @Min(1) offeredPrice?: number;
  @IsOptional() @IsString() tradeListingId?: string;
  @IsOptional() @IsString() tradeDescription?: string;
  @IsOptional() @IsString() note?: string;
}

export class CounterOfferDto {
  @IsNumber() @Min(1) offeredPrice!: number;
  @IsOptional() @IsString() note?: string;
}

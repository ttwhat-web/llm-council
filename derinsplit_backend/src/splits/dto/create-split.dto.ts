import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSplitDto {
  @IsString() perfumeId!: string;
  @IsInt() @Min(10) totalVolumeMl!: number;
  @IsInt() @Min(10) bottleSizeMl!: number;
  @IsNumber() @Min(0.1) pricePerMl!: number;
  @IsArray() @ArrayNotEmpty() @ArrayMinSize(1) @IsInt({ each: true })
  allowedIncrements!: number[];
  @IsString() batchCode!: string;
  @IsString() sourceInfo!: string;
  @IsOptional() @IsBoolean() hasBox?: boolean;
  @IsDateString() closesAt!: string;
}

export class JoinSplitDto {
  @IsInt() @Min(1) amountMl!: number;
}

export class BottleRequestDto {
  @IsString() confirmText!: string;
}

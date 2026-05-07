import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AiCheckableType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { AiService } from './ai.service';

class AuthenticityCheckDto {
  @IsEnum(AiCheckableType) checkableType!: AiCheckableType;
  @IsString() checkableId!: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) images!: string[];
  @IsOptional() @IsString() batchCodeText?: string;
}

@ApiTags('ai')
@Controller('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('authenticity-check')
  start(@Body() dto: AuthenticityCheckDto) {
    return this.ai.startCheck(
      dto.checkableType,
      dto.checkableId,
      dto.images,
      dto.batchCodeText,
    );
  }

  @Get('check-status/:id')
  status(@Param('id') id: string) {
    return this.ai.getCheck(id);
  }
}

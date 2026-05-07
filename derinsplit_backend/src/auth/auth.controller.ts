import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsString() @Length(6, 20) phone!: string;
  @IsString() @Length(2, 80) name!: string;
  @IsString() @Length(6, 100) password!: string;
  @IsOptional() @IsString() email?: string;
}

class LoginDto {
  @IsString() phone!: string;
  @IsString() password!: string;
}

class OtpRequestDto {
  @IsString() phone!: string;
}

class OtpVerifyDto {
  @IsString() phone!: string;
  @IsString() @Length(6, 6) code!: string;
  @IsOptional() @IsString() name?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone, dto.password);
  }

  @Post('request-otp')
  otp(@Body() dto: OtpRequestDto) {
    return this.auth.issueOtp(dto.phone);
  }

  @Post('verify-otp')
  verify(@Body() dto: OtpVerifyDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.name);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}

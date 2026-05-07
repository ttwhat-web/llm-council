import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: {
    phone: string;
    name: string;
    password: string;
    email?: string;
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: input.phone,
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });
    return this.issueToken(user.id, user.role);
  }

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    return this.issueToken(user.id, user.role);
  }

  async issueOtp(phone: string): Promise<{ otpId: string; devHint: string }> {
    // Real impl would dispatch SMS. For demo we always accept "123456".
    return { otpId: `otp_${phone}_${Date.now()}`, devHint: '123456' };
  }

  async verifyOtp(phone: string, code: string, name?: string) {
    if (code !== '123456') {
      throw new UnauthorizedException('invalid otp');
    }
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, name: name ?? phone },
      });
    }
    return this.issueToken(user.id, user.role);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('user not found');
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      trustScore: user.trustScore,
      city: user.city,
    };
  }

  private async issueToken(userId: string, role: JwtPayload['role']) {
    const accessToken = await this.jwt.signAsync({ sub: userId, role });
    return { accessToken, user: { id: userId, role } };
  }
}

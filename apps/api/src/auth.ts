import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Module, Post, Req, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { Db } from './db';
import { jwtSecret } from './config';

export interface Actor { id: number; username: string; name: string; role: Role }
export type AuthedRequest = Request & { user: Actor };
export const publicUser = { id: true, username: true, name: true, role: true } as const;
export const Public = () => SetMetadata('public', true);
export const Admin = () => SetMetadata('admin', true);

class LoginDto {
  @IsString() @IsNotEmpty() @MaxLength(40) username!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) password!: string;
}

/** Simple in-memory login throttle for localhost demos (per client IP). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS = 10;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function noteLoginFailure(ip: string): number {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return 1;
  }
  current.count += 1;
  loginAttempts.set(ip, current);
  return current.count;
}

@Injectable()
class AccessGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private db: Db) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets)) return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const match = /^Bearer (\S+)$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('请先登录。');
    let payload: { sub: number };
    try { payload = await this.jwt.verifyAsync(match[1]); }
    catch { throw new UnauthorizedException('登录已过期，请重新登录。'); }
    if (!Number.isInteger(payload.sub)) throw new UnauthorizedException('无效的登录凭证。');
    const user = await this.db.user.findUnique({ where: { id: payload.sub }, select: publicUser });
    if (!user) throw new UnauthorizedException('账号不存在。');
    if (this.reflector.getAllAndOverride<boolean>('admin', targets) && user.role !== Role.ADMIN) {
      throw new ForbiddenException('此操作仅限管理员。');
    }
    request.user = user;
    return true;
  }
}

@Controller('auth')
class AuthController {
  constructor(private db: Db, private jwt: JwtService) {}
  @Public() @Post('login')
  async login(@Req() req: Request, @Body() data: LoginDto) {
    const ip = clientIp(req);
    const now = Date.now();
    const tracked = loginAttempts.get(ip);
    if (tracked && tracked.resetAt > now && tracked.count >= LOGIN_MAX_ATTEMPTS) {
      throw new UnauthorizedException('登录尝试过于频繁，请稍后再试。');
    }
    const user = await this.db.user.findUnique({ where: { username: data.username } });
    if (!user || !(await compare(data.password, user.passwordHash))) {
      const failures = noteLoginFailure(ip);
      await sleep(Math.min(failures * 200, 2000));
      throw new UnauthorizedException('用户名或密码错误。');
    }
    loginAttempts.delete(ip);
    return {
      token: await this.jwt.signAsync({ sub: user.id }),
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    };
  }
  @Get('me') me(@Req() req: AuthedRequest) { return req.user; }
  @Get('users') users() { return this.db.user.findMany({ select: publicUser, orderBy: { id: 'asc' } }); }
}

@Module({
  imports: [JwtModule.register({ secret: jwtSecret, signOptions: { expiresIn: '8h' } })],
  controllers: [AuthController],
  providers: [{ provide: APP_GUARD, useClass: AccessGuard }],
})
export class AuthModule {}

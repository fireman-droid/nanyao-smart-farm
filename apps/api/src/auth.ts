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
  async login(@Body() data: LoginDto) {
    const user = await this.db.user.findUnique({ where: { username: data.username } });
    if (!user || !(await compare(data.password, user.passwordHash))) {
      throw new UnauthorizedException('用户名或密码错误。');
    }
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

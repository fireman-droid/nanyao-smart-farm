import { ArgumentsHost, Catch, ExceptionFilter, Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Response } from 'express';

@Injectable()
export class Db extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}

@Global()
@Module({ providers: [Db], exports: [Db] })
export class DatabaseModule {}

@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const messages: Record<string, [number, string]> = {
      P2002: [409, '名称或编号已存在，请使用其他名称或编号。'],
      P2003: [409, '关联记录不存在，或当前记录已被业务数据引用，无法删除。'],
      P2025: [404, '记录不存在或已被删除。'],
      P2034: [409, '资源正在被其他操作更新，请刷新后重试。'],
    };
    const [statusCode, message] = messages[error.code] ?? [500, '数据库操作失败，请联系管理员。'];
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message });
  }
}

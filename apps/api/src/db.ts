import { ArgumentsHost, Catch, ExceptionFilter, Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

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
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    if (error.code === 'P2002') {
      return response.status(409).json({ statusCode: 409, message: '名称或编号已存在，请使用其他名称或编号。' });
    }
    if (error.code === 'P2003') {
      // Create/update missing FK vs delete blocked by references — different user-facing copy.
      if (request.method === 'DELETE') {
        return response.status(409).json({ statusCode: 409, message: '当前记录已被业务数据引用，无法删除。' });
      }
      return response.status(404).json({ statusCode: 404, message: '关联的品种、地块或人员不存在。' });
    }
    if (error.code === 'P2025') {
      return response.status(404).json({ statusCode: 404, message: '记录不存在或已被删除。' });
    }
    if (error.code === 'P2034') {
      return response.status(409).json({ statusCode: 409, message: '资源正在被其他操作更新，请刷新后重试。' });
    }
    return response.status(500).json({ statusCode: 500, message: '数据库操作失败，请联系管理员。' });
  }
}

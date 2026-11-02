import 'reflect-metadata';
import './config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './module';
import { DatabaseFilter } from './db';

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new DatabaseFilter());
  app.enableShutdownHooks();
  return app;
}

if (require.main === module) {
  createApp().then((app) => app.listen(Number(process.env.PORT ?? 3000), '127.0.0.1'))
    .catch(() => { console.error('API 启动失败，请检查数据库及 .env 配置。'); process.exitCode = 1; });
}

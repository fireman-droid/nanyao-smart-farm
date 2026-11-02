import { Module } from '@nestjs/common';
import { AuthModule } from './auth';
import { CatalogController, CatalogService } from './catalog';
import { DatabaseModule } from './db';
import { MonitoringController, MonitoringService } from './monitoring';
import { OperationsController, OperationsService } from './operations';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CatalogController, OperationsController, MonitoringController],
  providers: [CatalogService, OperationsService, MonitoringService],
})
export class AppModule {}

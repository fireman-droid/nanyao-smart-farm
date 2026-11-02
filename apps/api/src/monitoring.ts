import { Body, ConflictException, Controller, Get, Injectable, NotFoundException, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Admin, publicUser } from './auth';
import { batchInclude } from './catalog';
import { Db } from './db';
import { ResolveDto, SimulateDto } from './dto';

@Injectable()
export class MonitoringService {
  constructor(private db: Db) {}
  monitoring() {
    return this.db.plot.findMany({
      orderBy: { id: 'asc' },
      include: {
        readings: { orderBy: { recordedAt: 'desc' }, take: 24 },
        batches: { where: { status: 'GROWING' }, include: { herb: true } },
      },
    });
  }
  alerts() {
    return this.db.alert.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { batch: { include: batchInclude }, reading: true },
    });
  }
  simulate(data: SimulateDto) {
    return this.db.$transaction(async (tx) => {
      const plot = await tx.plot.findUnique({
        where: { id: data.plotId },
        include: { batches: { where: { status: 'GROWING' }, include: { herb: true } } },
      });
      if (!plot) throw new NotFoundException('地块不存在。');
      const herb = plot.batches[0]?.herb;
      const temperature = data.scenario === 'HOT' ? 43 : Number(((herb ? (herb.tempMin + herb.tempMax) / 2 : 26) + Math.random() * 2 - 1).toFixed(1));
      const moisture = data.scenario === 'DRY' ? 8 : Number(((herb ? (herb.moistureMin + herb.moistureMax) / 2 : 60) + Math.random() * 4 - 2).toFixed(1));
      const reading = await tx.reading.create({
        data: { plotId: plot.id, temperature, moisture, humidity: Math.round(65 + Math.random() * 15), light: Math.round(15000 + Math.random() * 12000), simulated: true },
      });
      let createdAlerts = 0;
      for (const batch of plot.batches) {
        const metrics = [
          { key: 'temperature', label: '空气温度', value: temperature, min: batch.herb.tempMin, max: batch.herb.tempMax, unit: '℃' },
          { key: 'moisture', label: '土壤湿度', value: moisture, min: batch.herb.moistureMin, max: batch.herb.moistureMax, unit: '%' },
        ];
        for (const metric of metrics) {
          if (metric.value >= metric.min && metric.value <= metric.max) continue;
          if (await tx.alert.findFirst({ where: { batchId: batch.id, metric: metric.key, status: 'OPEN' } })) continue;
          await tx.alert.create({ data: {
            batchId: batch.id, readingId: reading.id, metric: metric.key,
            message: `${batch.herb.name}${metric.label} ${metric.value}${metric.unit}，超出参考范围 ${metric.min}–${metric.max}${metric.unit}。`,
          } });
          createdAlerts++;
        }
      }
      return { reading, createdAlerts };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async resolve(id: number, data: ResolveDto) {
    const result = await this.db.alert.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'RESOLVED', resolution: data.resolution, resolvedAt: new Date() },
    });
    if (!result.count) {
      if (!await this.db.alert.findUnique({ where: { id } })) throw new NotFoundException('预警不存在。');
      throw new ConflictException('该预警已处理，不能重复提交。');
    }
    return this.db.alert.findUnique({ where: { id } });
  }
  async dashboard() {
    const [plots, herbCount, growingCount, taskCount, overdueCount, alertCount, harvest, tasks, alerts, batches] = await Promise.all([
      this.db.plot.aggregate({ _sum: { area: true }, _count: true }),
      this.db.herb.count(),
      this.db.batch.count({ where: { status: 'GROWING' } }),
      this.db.farmTask.count({ where: { status: 'TODO' } }),
      this.db.farmTask.count({ where: { status: 'TODO', dueAt: { lt: new Date() } } }),
      this.db.alert.count({ where: { status: 'OPEN' } }),
      this.db.harvest.aggregate({ _sum: { weight: true }, _count: true }),
      this.db.farmTask.findMany({ where: { status: 'TODO' }, take: 5, orderBy: { dueAt: 'asc' }, include: { batch: { include: batchInclude }, assignee: { select: publicUser } } }),
      this.db.alert.findMany({ where: { status: 'OPEN' }, take: 4, orderBy: { createdAt: 'desc' }, include: { batch: { include: batchInclude } } }),
      this.db.batch.findMany({ where: { status: 'GROWING' }, include: batchInclude, orderBy: { expectedAt: 'asc' } }),
    ]);
    return {
      stats: { plotCount: plots._count, area: plots._sum.area ?? 0, herbCount, growingCount, taskCount, overdueCount, alertCount, harvestWeight: harvest._sum.weight ?? 0, harvestCount: harvest._count },
      tasks, alerts, batches,
    };
  }
}
@Controller()
export class MonitoringController {
  constructor(private service: MonitoringService) {}
  @Get('dashboard') dashboard() { return this.service.dashboard(); }
  @Get('monitoring') monitoring() { return this.service.monitoring(); }
  @Admin() @Post('monitoring/simulate') simulate(@Body() data: SimulateDto) { return this.service.simulate(data); }
  @Get('alerts') alerts() { return this.service.alerts(); }
  @Patch('alerts/:id/resolve') resolve(@Param('id', ParseIntPipe) id: number, @Body() data: ResolveDto) { return this.service.resolve(id, data); }
}

import { BadRequestException, Body, ConflictException, Controller, Delete, Get, Injectable, NotFoundException, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Admin } from './auth';
import { Db } from './db';
import { BatchDto, HerbDto, PlotDto } from './dto';

export const batchInclude = { herb: true, plot: true } as const;
export async function growingBatch(db: Prisma.TransactionClient, id: number) {
  const batch = await db.batch.findUnique({ where: { id }, include: batchInclude });
  if (!batch) throw new NotFoundException('种植批次不存在。');
  if (batch.status !== 'GROWING') throw new ConflictException('该批次已采收，不能再修改或安排农事。');
  return batch;
}
function validateHerb(data: HerbDto) {
  if (data.tempMin >= data.tempMax || data.moistureMin >= data.moistureMax) {
    throw new BadRequestException('适宜范围的下限必须小于上限。');
  }
}
function validateBatch(data: BatchDto) {
  if (new Date(data.expectedAt) < new Date(data.plantedAt)) {
    throw new BadRequestException('预计采收日期不能早于种植日期。');
  }
  if (new Date(data.plantedAt).getTime() > Date.now()) throw new BadRequestException('种植日期不能在未来。');
  return { ...data, plantedAt: new Date(data.plantedAt), expectedAt: new Date(data.expectedAt) };
}

@Injectable()
export class CatalogService {
  constructor(private db: Db) {}
  herbs() { return this.db.herb.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { batches: true } } } }); }
  plots() { return this.db.plot.findMany({ orderBy: { id: 'asc' }, include: { batches: { where: { status: 'GROWING' }, include: { herb: true } } } }); }
  batches() { return this.db.batch.findMany({ orderBy: { plantedAt: 'desc' }, include: { ...batchInclude, harvest: true } }); }
  createHerb(data: HerbDto) { validateHerb(data); return this.db.herb.create({ data }); }
  updateHerb(id: number, data: HerbDto) { validateHerb(data); return this.db.herb.update({ where: { id }, data }); }
  deleteHerb(id: number) { return this.db.herb.delete({ where: { id } }); }
  createPlot(data: PlotDto) { return this.db.plot.create({ data }); }
  updatePlot(id: number, data: PlotDto) { return this.db.plot.update({ where: { id }, data }); }
  deletePlot(id: number) { return this.db.plot.delete({ where: { id } }); }
  createBatch(data: BatchDto) { return this.db.batch.create({ data: validateBatch(data), include: batchInclude }); }
  updateBatch(id: number, data: BatchDto) {
    const values = validateBatch(data);
    return this.db.$transaction(async (tx) => {
      await growingBatch(tx, id);
      const linked = await tx.farmTask.count({ where: { batchId: id } }) + await tx.alert.count({ where: { batchId: id } });
      if (linked) throw new ConflictException('批次已有农事或监测记录，为保留溯源关联不可再编辑。');
      return tx.batch.update({ where: { id }, data: values, include: batchInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  deleteBatch(id: number) { return this.db.batch.delete({ where: { id } }); }
}

@Controller()
export class CatalogController {
  constructor(private service: CatalogService) {}
  @Get('herbs') herbs() { return this.service.herbs(); }
  @Admin() @Post('herbs') createHerb(@Body() data: HerbDto) { return this.service.createHerb(data); }
  @Admin() @Put('herbs/:id') updateHerb(@Param('id', ParseIntPipe) id: number, @Body() data: HerbDto) { return this.service.updateHerb(id, data); }
  @Admin() @Delete('herbs/:id') deleteHerb(@Param('id', ParseIntPipe) id: number) { return this.service.deleteHerb(id); }
  @Get('plots') plots() { return this.service.plots(); }
  @Admin() @Post('plots') createPlot(@Body() data: PlotDto) { return this.service.createPlot(data); }
  @Admin() @Put('plots/:id') updatePlot(@Param('id', ParseIntPipe) id: number, @Body() data: PlotDto) { return this.service.updatePlot(id, data); }
  @Admin() @Delete('plots/:id') deletePlot(@Param('id', ParseIntPipe) id: number) { return this.service.deletePlot(id); }
  @Get('batches') batches() { return this.service.batches(); }
  @Admin() @Post('batches') createBatch(@Body() data: BatchDto) { return this.service.createBatch(data); }
  @Admin() @Put('batches/:id') updateBatch(@Param('id', ParseIntPipe) id: number, @Body() data: BatchDto) { return this.service.updateBatch(id, data); }
  @Admin() @Delete('batches/:id') deleteBatch(@Param('id', ParseIntPipe) id: number) { return this.service.deleteBatch(id); }
}

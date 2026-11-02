import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseIntPipe, Patch, Post, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { Actor, Admin, AuthedRequest, publicUser } from './auth';
import { batchInclude, growingBatch } from './catalog';
import { Db } from './db';
import { CompleteDto, HarvestDto, TaskDto } from './dto';

const taskInclude = { batch: { include: batchInclude }, assignee: { select: publicUser } } as const;
const harvestInclude = { batch: { include: batchInclude }, operator: { select: publicUser } } as const;
@Injectable()
export class OperationsService {
  constructor(private db: Db) {}
  tasks() { return this.db.farmTask.findMany({ include: taskInclude, orderBy: [{ status: 'desc' }, { dueAt: 'asc' }] }); }
  createTask(data: TaskDto) {
    return this.db.$transaction(async (tx) => {
      const batch = await growingBatch(tx, data.batchId);
      if (new Date(data.dueAt) < batch.plantedAt) throw new BadRequestException('农事时间不能早于种植日期。');
      return tx.farmTask.create({ data: { ...data, dueAt: new Date(data.dueAt) }, include: taskInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async completeTask(id: number, data: CompleteDto, actor: Actor) {
    const task = await this.db.farmTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('农事任务不存在。');
    if (actor.role !== 'ADMIN' && task.assigneeId !== actor.id) throw new ForbiddenException('只能完成分配给自己的任务。');
    const result = await this.db.farmTask.updateMany({
      where: { id, status: 'TODO' },
      data: { status: 'DONE', result: data.result, completedAt: new Date() },
    });
    if (!result.count) throw new ConflictException('该任务已经完成，不能重复提交。');
    return this.db.farmTask.findUnique({ where: { id }, include: taskInclude });
  }
  harvests() { return this.db.harvest.findMany({ include: harvestInclude, orderBy: { harvestedAt: 'desc' } }); }
  createHarvest(data: HarvestDto, actor: Actor) {
    return this.db.$transaction(async (tx) => {
      const batch = await growingBatch(tx, data.batchId);
      const date = new Date(data.harvestedAt);
      if (date < batch.plantedAt || date.getTime() > Date.now()) throw new BadRequestException('采收时间必须在种植日期与当前时间之间。');
      if (await tx.farmTask.count({ where: { batchId: batch.id, status: 'TODO' } })) {
        throw new ConflictException('请先完成该批次的待办农事，再登记采收。');
      }
      if (await tx.farmTask.count({ where: { batchId: batch.id, completedAt: { gt: date } } })) {
        throw new BadRequestException('采收时间不能早于该批次最后一次农事完成时间。');
      }
      const harvest = await tx.harvest.create({
        data: {
          ...data, harvestedAt: date, operatorId: actor.id,
          traceCode: `NY${date.getFullYear()}${randomBytes(8).toString('hex').toUpperCase()}`,
        },
        include: harvestInclude,
      });
      await tx.batch.update({ where: { id: batch.id }, data: { status: 'HARVESTED' } });
      return harvest;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
  async trace(code: string) {
    const harvest = await this.db.harvest.findUnique({ where: { traceCode: code }, include: harvestInclude });
    if (!harvest) throw new NotFoundException('未找到此溯源码，请核对后重试。');
    const tasks = await this.db.farmTask.findMany({
      where: { batchId: harvest.batchId, status: 'DONE' },
      include: { assignee: { select: publicUser } }, orderBy: { completedAt: 'asc' },
    });
    const readings = await this.db.reading.findMany({
      where: { plotId: harvest.batch.plotId, recordedAt: { gte: harvest.batch.plantedAt, lte: harvest.harvestedAt } },
      orderBy: { recordedAt: 'asc' },
    });
    return { harvest, tasks, readings, disclaimer: '课程演示数据，不是官方质量认证或药材安全证明。' };
  }
}
@Controller()
export class OperationsController {
  constructor(private service: OperationsService) {}
  @Get('tasks') tasks() { return this.service.tasks(); }
  @Admin() @Post('tasks') createTask(@Body() data: TaskDto) { return this.service.createTask(data); }
  @Patch('tasks/:id/complete') completeTask(@Param('id', ParseIntPipe) id: number, @Body() data: CompleteDto, @Req() req: AuthedRequest) { return this.service.completeTask(id, data, req.user); }
  @Get('harvests') harvests() { return this.service.harvests(); }
  @Post('harvests') createHarvest(@Body() data: HarvestDto, @Req() req: AuthedRequest) { return this.service.createHarvest(data, req.user); }
  @Get('trace/:code') trace(@Param('code') code: string) { return this.service.trace(code); }
}

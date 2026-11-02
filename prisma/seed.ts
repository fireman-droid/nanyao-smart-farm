import 'dotenv/config';
import { PrismaClient, TaskKind } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const ago = (days: number) => new Date(Date.now() - days * 86400000);

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8) throw new Error('请在 .env 中设置至少 8 位的 DEMO_PASSWORD。');
  const passwordHash = await hash(password, 10);
  await db.$transaction(async (tx) => {
    await tx.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', name: '基地管理员', passwordHash, role: 'ADMIN' } });
    const farmer = await tx.user.upsert({ where: { username: 'farmer' }, update: {}, create: { username: 'farmer', name: '陈种植', passwordHash, role: 'FARMER' } });
    const entries = [
      { name: '广藿香', scientificName: 'Pogostemon cablin', family: '唇形科', part: '地上部分', region: '广东 · 阳春', growthDays: 210, tempMin: 20, tempMax: 32, moistureMin: 55, moistureMax: 80, description: '岭南常见芳香植物，适合温暖湿润环境。管理关注排水、遮阴和分批采收。此处阈值仅用于课设演示。' },
      { name: '砂仁', scientificName: 'Amomum villosum', family: '姜科', part: '果实', region: '广东 · 阳春', growthDays: 720, tempMin: 20, tempMax: 30, moistureMin: 60, moistureMax: 85, description: '林下种植代表品种，喜温暖、湿润与适度荫蔽。演示重点为花果期巡检、保湿和采收批次记录。' },
      { name: '巴戟天', scientificName: 'Morinda officinalis', family: '茜草科', part: '根', region: '广东 · 德庆', growthDays: 1095, tempMin: 18, tempMax: 32, moistureMin: 50, moistureMax: 75, description: '多年生藤本植物，管理周期较长。系统记录种植来源、地块条件以及长期农事档案。' },
      { name: '益智', scientificName: 'Alpinia oxyphylla', family: '姜科', part: '果实', region: '海南 · 琼中', growthDays: 720, tempMin: 20, tempMax: 33, moistureMin: 55, moistureMax: 80, description: '热带、亚热带林下植物。以地块、农事和果实采收记录构成完整的种植批次档案。' },
      { name: '穿心莲', scientificName: 'Andrographis paniculata', family: '爵床科', part: '地上部分', region: '广东 · 清远', growthDays: 120, tempMin: 20, tempMax: 32, moistureMin: 50, moistureMax: 75, description: '生长周期较短，适合演示从定植到采收的完整管理流程。阈值不能替代实际农艺指导。' },
      { name: '五指毛桃', scientificName: 'Ficus hirta', family: '桑科', part: '根', region: '广东 · 河源', growthDays: 730, tempMin: 18, tempMax: 32, moistureMin: 50, moistureMax: 80, description: '岭南特色植物。管理关注苗期养护、除草、追肥和采收来源记录，不提供医疗功效建议。' },
    ];
    const herbs = [];
    for (const entry of entries) herbs.push(await tx.herb.upsert({ where: { name: entry.name }, update: {}, create: entry }));
    const plots = [];
    const names = ['A01 · 芳香药园', 'A02 · 林下示范区', 'B01 · 根茎种植区', 'B02 · 轮作试验田', 'C01 · 生态种植区'];
    for (let i = 0; i < names.length; i++) {
      plots.push(await tx.plot.upsert({
        where: { name: names[i] }, update: {},
        create: { name: names[i], area: [28.5, 36, 42.8, 18.6, 22.4][i], location: `广东省肇庆市 · 南药示范基地 ${String.fromCharCode(65 + Math.floor(i / 2))} 区`, soil: i === 1 ? '富腐殖质壤土' : '疏松砂质壤土', manager: '陈种植' },
      }));
    }
    const batches = [];
    const configs = [
      { code: 'NY-HX-001', herb: 0, plot: 0, days: 86 },
      { code: 'NY-SR-001', herb: 1, plot: 1, days: 430 },
      { code: 'NY-BJ-001', herb: 2, plot: 2, days: 680 },
      { code: 'NY-WZ-001', herb: 5, plot: 4, days: 380 },
    ];
    for (const c of configs) {
      batches.push(await tx.batch.upsert({
        where: { code: c.code }, update: {},
        create: { code: c.code, herbId: herbs[c.herb].id, plotId: plots[c.plot].id, plantedAt: ago(c.days), expectedAt: ago(c.days - herbs[c.herb].growthDays), quantity: 2400 + c.plot * 600, notes: '课程演示种植批次，非真实生产数据。' },
      }));
    }
    const old = await tx.batch.upsert({
      where: { code: 'NY-CXL-001' }, update: {},
      create: { code: 'NY-CXL-001', herbId: herbs[4].id, plotId: plots[3].id, plantedAt: ago(125), expectedAt: ago(5), quantity: 5600, status: 'HARVESTED', notes: '已完成采收的演示批次。' },
    });
    const taskSeeds: { title: string; kind: TaskKind; batchId: number; dueAt: Date; done?: boolean }[] = [
      { title: '广藿香苗情巡检', kind: 'INSPECT', batchId: batches[0].id, dueAt: ago(-0.15) },
      { title: '林下砂仁补水养护', kind: 'WATER', batchId: batches[1].id, dueAt: ago(-0.25) },
      { title: '巴戟天地块除草', kind: 'WEED', batchId: batches[2].id, dueAt: ago(0.5) },
      { title: '五指毛桃生长记录', kind: 'INSPECT', batchId: batches[3].id, dueAt: ago(-1) },
      { title: '广藿香基肥施用记录', kind: 'FERTILIZE', batchId: batches[0].id, dueAt: ago(6), done: true },
      { title: '穿心莲采前巡检', kind: 'INSPECT', batchId: old.id, dueAt: ago(3), done: true },
    ];
    for (const task of taskSeeds) {
      if (await tx.farmTask.findFirst({ where: { title: task.title, batchId: task.batchId } })) continue;
      await tx.farmTask.create({ data: {
        title: task.title, kind: task.kind, batchId: task.batchId, dueAt: task.dueAt, assigneeId: farmer.id,
        notes: '按基地计划执行，完成后填写操作记录。', status: task.done ? 'DONE' : 'TODO',
        completedAt: task.done ? task.dueAt : null, result: task.done ? '已完成巡检或养护，并登记现场情况（演示）。' : '',
      } });
    }
    await tx.harvest.upsert({
      where: { batchId: old.id }, update: {},
      create: { batchId: old.id, operatorId: farmer.id, traceCode: 'NY-DEMO-CXL-001', harvestedAt: ago(2), weight: 1280.5, grade: '演示一级', destination: '基地初加工车间', notes: '仅用于课程溯源演示，不构成质量认证。' },
    });
    for (let p = 0; p < plots.length; p++) {
      if (await tx.reading.count({ where: { plotId: plots[p].id } })) continue;
      for (let h = 23; h >= 0; h--) {
        const dry = p === 2 && h === 0;
        const hot = p === 0 && h === 0;
        const reading = await tx.reading.create({ data: {
          plotId: plots[p].id, temperature: hot ? 35.8 : Number((26 + Math.sin(h / 3) * 2.8).toFixed(1)),
          humidity: Number((72 + Math.cos(h / 4) * 6).toFixed(1)),
          moisture: dry ? 32.5 : Number((66 + Math.sin(h / 5) * 4).toFixed(1)),
          light: Math.max(0, Math.round(19000 + Math.sin(h / 4) * 14000)),
          simulated: true, recordedAt: new Date(Date.now() - h * 3600000 - (p === 3 ? 3 * 86400000 : 0)),
        } });
        if (dry || hot) await tx.alert.create({ data: {
          batchId: dry ? batches[2].id : batches[0].id, readingId: reading.id, metric: dry ? 'moisture' : 'temperature',
          message: dry ? '巴戟天土壤湿度 32.5%，低于演示参考下限 50%，请检查灌溉。' : '广藿香空气温度 35.8℃，高于演示参考上限 32℃，请巡检遮阴情况。',
        } });
      }
    }
  }, { timeout: 30000 });
  console.log('演示数据已就绪；重复运行保留已有记录，不重置账号或业务数据。');
}
main().catch(() => { console.error('演示数据初始化失败，请检查数据库和 DEMO_PASSWORD。'); process.exitCode = 1; })
  .finally(() => db.$disconnect());

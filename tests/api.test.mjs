import 'dotenv/config';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createApp } from '../apps/api/dist/main.js';
import { Db } from '../apps/api/dist/db.js';

let app, db, base, admin, farmer, farmerId, adminId;
const ids = { herbs: [], plots: [], batches: [] };
const suffix = randomBytes(5).toString('hex');
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();
const calendarDay = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
async function request(path, method = 'GET', data, token = admin) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
}
const herbData = {
  name: `测试药材-${suffix}`, scientificName: 'Test plant', family: '测试科', part: '地上部分',
  region: '测试基地', description: '自动化验证产生的临时记录。', growthDays: 120,
  tempMin: 20, tempMax: 32, moistureMin: 50, moistureMax: 80,
};
const plotData = { name: `测试地块-${suffix}`, area: 3.5, soil: '壤土', location: '本地测试', manager: '测试人员' };
let herb, plot, batch;

before(async () => {
  app = await createApp();
  app.useLogger(false);
  await app.listen(0, '127.0.0.1');
  base = `${await app.getUrl()}/api`;
  db = app.get(Db);
  for (const username of ['admin', 'farmer']) {
    const result = await request('/auth/login', 'POST', { username, password: process.env.DEMO_PASSWORD }, null);
    assert.equal(result.status, 201, '演示账号应能登录；先执行 db:seed');
    if (username === 'admin') { admin = result.body.token; adminId = result.body.user.id; }
    else { farmer = result.body.token; farmerId = result.body.user.id; }
  }
});
after(async () => {
  if (db) {
    // Delete only records owned by this test run, in foreign-key dependency order.
    await db.$transaction([
      db.alert.deleteMany({ where: { batchId: { in: ids.batches } } }),
      db.farmTask.deleteMany({ where: { batchId: { in: ids.batches } } }),
      db.harvest.deleteMany({ where: { batchId: { in: ids.batches } } }),
      db.batch.deleteMany({ where: { id: { in: ids.batches } } }),
      db.reading.deleteMany({ where: { plotId: { in: ids.plots } } }),
      db.plot.deleteMany({ where: { id: { in: ids.plots } } }),
      db.herb.deleteMany({ where: { id: { in: ids.herbs } } }),
    ]);
  }
  if (app) await app.close();
});

test('登录与角色权限：匿名请求及越权写入被拒绝，不返回密码散列', async () => {
  assert.equal((await request('/dashboard', 'GET', undefined, null)).status, 401);
  assert.equal((await request('/dashboard', 'GET', undefined, 'invalid-token')).status, 401);
  assert.equal((await request('/auth/login', 'POST', { username: 'admin', password: 'incorrect-test-password' }, null)).status, 401);
  assert.equal((await request('/herbs', 'POST', herbData, farmer)).status, 403);
  const users = await request('/auth/users', 'GET', undefined, farmer);
  assert.equal(users.status, 200);
  assert.ok(users.body.every((u) => !Object.hasOwn(u, 'passwordHash')));
});

test('档案与种植批次：校验范围、日期、重复编号和外键保护', async () => {
  assert.equal((await request('/herbs', 'POST', { ...herbData, tempMin: 40 })).status, 400);
  assert.equal((await request('/herbs', 'POST', { ...herbData, role: 'ADMIN' })).status, 400);
  let result = await request('/herbs', 'POST', herbData);
  assert.equal(result.status, 201); herb = result.body; ids.herbs.push(herb.id);
  assert.equal((await request('/herbs', 'POST', herbData)).status, 409);
  result = await request(`/herbs/${herb.id}`, 'PUT', { ...herbData, description: '已编辑的测试说明' });
  assert.equal(result.status, 200); assert.equal(result.body.description, '已编辑的测试说明');
  assert.equal((await request('/plots', 'POST', { ...plotData, area: -1 })).status, 400);
  result = await request('/plots', 'POST', plotData);
  assert.equal(result.status, 201); plot = result.body; ids.plots.push(plot.id);
  const values = { code: `TEST-${suffix}`, herbId: herb.id, plotId: plot.id, plantedAt: day(-10), expectedAt: day(110), quantity: 500 };
  assert.equal((await request('/batches', 'POST', { ...values, expectedAt: day(-20) })).status, 400);
  assert.equal((await request('/batches', 'POST', { ...values, plantedAt: day(1) })).status, 400);
  const missingFk = await request('/batches', 'POST', { ...values, herbId: 2147483647 });
  assert.equal(missingFk.status, 404);
  assert.match(missingFk.body.message ?? '', /关联.*不存在/);
  // Asia/Shanghai calendar "today" as YYYY-MM-DD must be accepted (not treated as future UTC midnight).
  const todayOnly = await request('/batches', 'POST', {
    ...values, code: `TEST-TODAY-${suffix}`, plantedAt: calendarDay(), expectedAt: calendarDay(Date.now() + 90 * 86400000),
  });
  assert.equal(todayOnly.status, 201, todayOnly.body.message ?? 'today YYYY-MM-DD should create');
  ids.batches.push(todayOnly.body.id);
  result = await request('/batches', 'POST', values);
  assert.equal(result.status, 201); batch = result.body; ids.batches.push(batch.id);
  const originalPlanted = batch.plantedAt;
  const blockedDelete = await request(`/herbs/${herb.id}`, 'DELETE');
  assert.equal(blockedDelete.status, 409);
  assert.match(blockedDelete.body.message ?? '', /无法删除/);
  assert.equal((await request(`/plots/${plot.id}`, 'DELETE')).status, 409);
  // Editing notes with the same calendar day must not rewrite plantedAt DateTime.
  result = await request(`/batches/${batch.id}`, 'PUT', {
    ...values,
    plantedAt: calendarDay(batch.plantedAt),
    expectedAt: calendarDay(batch.expectedAt),
    notes: '修改后的种植备注',
  });
  assert.equal(result.status, 200); assert.equal(result.body.notes, '修改后的种植备注');
  assert.equal(result.body.plantedAt, originalPlanted);
});

test('模拟监测：异常触发预警、未处理预警去重、处理后允许再次触发', async () => {
  assert.equal((await request('/monitoring/simulate', 'POST', { plotId: plot.id }, farmer)).status, 403);
  let result = await request('/monitoring/simulate', 'POST', { plotId: plot.id, scenario: 'NORMAL' });
  assert.equal(result.status, 201); assert.equal(result.body.createdAlerts, 0); assert.equal(result.body.reading.simulated, true);
  result = await request('/monitoring/simulate', 'POST', { plotId: plot.id, scenario: 'DRY' });
  assert.equal(result.body.createdAlerts, 1);
  result = await request('/monitoring/simulate', 'POST', { plotId: plot.id, scenario: 'DRY' });
  assert.equal(result.body.createdAlerts, 0);
  const alert = await db.alert.findFirstOrThrow({ where: { batchId: batch.id, status: 'OPEN' } });
  assert.equal((await request(`/alerts/${alert.id}/resolve`, 'PATCH', { resolution: '   ' }, farmer)).status, 400);
  assert.equal((await request(`/alerts/${alert.id}/resolve`, 'PATCH', { resolution: '已检查并完成补水（测试）' }, farmer)).status, 200);
  assert.equal((await request(`/alerts/${alert.id}/resolve`, 'PATCH', { resolution: '重复处理' }, farmer)).status, 409);
  result = await request('/monitoring/simulate', 'POST', { plotId: plot.id, scenario: 'DRY' });
  assert.equal(result.body.createdAlerts, 1);
});

test('农事与采收：人员归属、任务不可重复完成、待办阻止采收', async () => {
  const task = { title: '权限及闭环测试', kind: 'INSPECT', batchId: batch.id, assigneeId: adminId, dueAt: day(1) };
  const created = await request('/tasks', 'POST', task);
  assert.equal(created.status, 201);
  assert.equal((await request(`/tasks/${created.body.id}/complete`, 'PATCH', { result: '测试完成' }, farmer)).status, 403);
  assert.equal((await request('/harvests', 'POST', { batchId: batch.id, harvestedAt: day(0), weight: 10, grade: '测试', destination: '测试库' })).status, 409);
  assert.equal((await request(`/tasks/${created.body.id}/complete`, 'PATCH', { result: '   ' })).status, 400);
  assert.equal((await request(`/tasks/${created.body.id}/complete`, 'PATCH', { result: '完成现场检查（测试）' })).status, 200);
  assert.equal((await request(`/tasks/${created.body.id}/complete`, 'PATCH', { result: '重复提交' })).status, 409);
  const mine = await request('/tasks', 'POST', { ...task, title: '种植人员执行测试', assigneeId: farmerId });
  assert.equal((await request(`/tasks/${mine.body.id}/complete`, 'PATCH', { result: '已执行本人任务' }, farmer)).status, 200);
});

test('采收事务及溯源：并发只允许一次采收，档案关联完整并受登录保护', async () => {
  const harvestData = { batchId: batch.id, harvestedAt: day(0), weight: 125.5, grade: '测试分级', destination: '测试仓库' };
  const lastTask = await db.farmTask.findFirstOrThrow({ where: { batchId: batch.id, status: 'DONE' }, orderBy: { completedAt: 'desc' } });
  assert.equal((await request('/harvests', 'POST', { ...harvestData, harvestedAt: new Date(lastTask.completedAt.getTime() - 1).toISOString() }, farmer)).status, 400);
  assert.equal((await request('/harvests', 'POST', { ...harvestData, harvestedAt: day(2) }, farmer)).status, 400);
  assert.equal((await request('/harvests', 'POST', { ...harvestData, harvestedAt: day(-20) }, farmer)).status, 400);
  const results = await Promise.all([request('/harvests', 'POST', harvestData, farmer), request('/harvests', 'POST', harvestData, farmer)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const saved = results.find((r) => r.status === 201).body;
  assert.equal((await db.batch.findUniqueOrThrow({ where: { id: batch.id } })).status, 'HARVESTED');
  assert.equal((await db.harvest.count({ where: { batchId: batch.id } })), 1);
  assert.equal((await request('/tasks', 'POST', { title: '采后非法农事', kind: 'INSPECT', batchId: batch.id, assigneeId: farmerId, dueAt: day(1) })).status, 409);
  const trace = await request(`/trace/${saved.traceCode}`, 'GET', undefined, farmer);
  assert.equal(trace.status, 200);
  assert.equal(trace.body.harvest.batch.herb.id, herb.id);
  assert.equal(trace.body.harvest.batch.plot.id, plot.id);
  assert.equal(trace.body.tasks.length, 2);
  assert.ok(trace.body.readings.length >= 4);
  assert.equal((await request(`/trace/${saved.traceCode}`, 'GET', undefined, null)).status, 401);
  assert.equal((await request('/trace/NOT-FOUND')).status, 404);
  assert.equal((await request('/dashboard')).status, 200);
});

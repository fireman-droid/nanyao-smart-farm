import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, closeSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import mysql from 'mysql2/promise';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, '.local');
const data = join(local, 'mysql');
const statePath = join(local, 'database.json');
const envPath = join(root, '.env');
const defaultWindowsBin = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe';
const binary = process.env.MYSQL_BIN ?? (process.platform === 'win32' ? defaultWindowsBin : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(local, { recursive: true });

function connect(password) {
  return mysql.createConnection({ host: '127.0.0.1', port: 3307, user: 'root', password, connectTimeout: 1000 });
}

async function main() {
  const stored = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
  if (process.argv[2] === 'stop') {
    if (!stored?.ready) throw new Error('没有本项目已初始化的数据库。');
    const connection = await connect(stored.rootPassword);
    await connection.query('SHUTDOWN');
    await connection.end();
    console.log('本项目 MySQL 已停止，数据保留在 .local/mysql。');
    return;
  }
  if (!binary || !existsSync(binary)) {
    const hint = process.platform === 'win32'
      ? '请设置 MYSQL_BIN 为 mysqld.exe 的绝对路径，或参照 README「自备 MySQL / Docker」配置。'
      : '一键独立 MySQL（db:local / 启动平台.cmd）面向 Windows + 本机 MySQL 8.4。当前非 Windows 环境请使用自备 MySQL，或 docker compose -f docker-compose.mysql.yml up -d 后按 README「自备 MySQL」配置 .env。';
    throw new Error(hint);
  }
  if (!stored && existsSync(envPath)) throw new Error('检测到已有 .env，不覆盖。请使用 db:generate、db:migrate、db:seed。');
  const state = stored ?? { rootPassword: randomBytes(24).toString('hex'), password: randomBytes(24).toString('hex'), ready: false };
  if (!stored) {
    if (existsSync(data)) throw new Error('.local/mysql 已存在，停止以保护已有数据。');
    mkdirSync(data);
    const result = spawnSync(binary, ['--no-defaults', '--initialize-insecure', `--basedir=${dirname(dirname(binary))}`, '--datadir=.'], { cwd: data, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('MySQL 初始化失败，请检查 .local/mysql 中的错误日志。');
    writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  }
  let connection;
  try { connection = await connect(state.ready ? state.rootPassword : ''); }
  catch (error) {
    if (error.code !== 'ECONNREFUSED') throw new Error(`3307 端口连接失败（${error.code}），未修改现有实例。`);
    const log = openSync(join(local, 'mysql.log'), 'a');
    const child = spawn(binary, [
      '--no-defaults', '--console', `--basedir=${dirname(dirname(binary))}`, '--datadir=.',
      '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=OFF',
      '--character-set-server=utf8mb4', '--collation-server=utf8mb4_0900_ai_ci',
    ], { cwd: data, detached: true, stdio: ['ignore', log, log], windowsHide: true });
    child.unref();
    closeSync(log);
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      try { connection = await connect(state.ready ? state.rootPassword : ''); break; }
      catch (error) { if (error.code !== 'ECONNREFUSED') throw error; }
    }
    if (!connection) throw new Error('MySQL 启动超时，请检查 .local/mysql.log。');
  }
  if (!state.ready) {
    await connection.query("ALTER USER 'root'@'localhost' IDENTIFIED BY ?", [state.rootPassword]);
    state.ready = true;
    writeFileSync(statePath, JSON.stringify(state), { mode: 0o600 });
  }
  await connection.query('CREATE DATABASE IF NOT EXISTS nanyao CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
  await connection.query("CREATE USER IF NOT EXISTS 'nanyao'@'127.0.0.1' IDENTIFIED BY ?", [state.password]);
  await connection.query("GRANT ALL PRIVILEGES ON nanyao.* TO 'nanyao'@'127.0.0.1'");
  await connection.end();
  if (!existsSync(envPath)) {
    const demoPassword = `Ny-${randomBytes(6).toString('hex')}`;
    writeFileSync(envPath, `DATABASE_URL="mysql://nanyao:${state.password}@127.0.0.1:3307/nanyao"\nJWT_SECRET="${randomBytes(36).toString('hex')}"\nDEMO_PASSWORD="${demoPassword}"\nPORT=3000\n`, { mode: 0o600 });
    writeFileSync(join(local, '演示账号.txt'), `仅限本地课程演示，请勿对外公开。\n管理员：admin\n种植人员：farmer\n两个账号的初始密码：${demoPassword}\n`, { mode: 0o600 });
  }
  console.log('独立 MySQL 已就绪：127.0.0.1:3307 / nanyao。演示账号见 .local/演示账号.txt。');
}
main().catch((error) => { console.error(error.code ?? error.message); process.exitCode = 1; });

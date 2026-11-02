import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
export const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('REPLACE_')) {
  throw new Error('请先完成数据库初始化，并在 .env 中设置至少 32 字符的 JWT_SECRET。');
}

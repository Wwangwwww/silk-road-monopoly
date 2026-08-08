/**
 * @silk-road-monopoly/env
 *
 * 带类型验证的环境变量管理（Node.js 专用）
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 确定项目根目录并加载 .env 文件
let __dirname = dirname(fileURLToPath(import.meta.url));
let projectRoot = resolve(__dirname, '../..');

if (__dirname.includes('dist')) {
  projectRoot = resolve(__dirname, '../../..');
} else {
  projectRoot = resolve(__dirname, '../..');
}

// 尝试从项目根目录加载 .env
const envPath = resolve(projectRoot, '.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  const parentEnvPath = resolve(projectRoot, '../.env');
  const parentResult = dotenv.config({ path: parentEnvPath });
  if (parentResult.parsed) {
    // 从父目录成功加载
  } else {
    dotenv.config();
  }
}

if (process.env.NODE_ENV !== 'production' && (envResult.parsed || process.env.SILKROAD_DOMAIN)) {
  console.log(`[env] Loaded .env file from: ${envPath}`);
}

/**
 * 获取环境变量值（核心函数）
 * @param key - 环境变量键名（大写，如 'SERVER_PORT'）
 * @param defaultValue - 可选的默认值
 * @returns 环境变量值（自动转换类型：端口号转为 number，布尔值转为 boolean）
 * @throws {Error} 如果变量未定义且未提供默认值
 */
export function env<T = string>(key: string, defaultValue?: T): T {
  const value = process.env[key];

  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`[@silk-road-monopoly/env] 环境变量 "${key}" 未定义。\n` + `请检查 .env 文件中是否配置了 ${key}。`);
  }

  // 端口号自动转换为 number
  if (key.includes('PORT')) {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error(`[@silk-road-monopoly/env] 端口号 "${value}" 无效（1-65535）`);
    }
    return port as T;
  }

  // 协议验证
  if (key === 'PROTOCOL') {
    if (value !== 'http' && value !== 'https') {
      throw new Error(`[@silk-road-monopoly/env] 协议 "${value}" 必须是 "http" 或 "https"`);
    }
    return value as T;
  }

  // 布尔值转换
  if (value.toLowerCase() === 'true') return true as T;
  if (value.toLowerCase() === 'false') return false as T;

  return value as T;
}

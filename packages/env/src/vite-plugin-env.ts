/**
 * @silk-road-monopoly/env
 *
 * Vite 插件，用于在构建时注入环境变量
 */

import { Plugin } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export interface EnvPluginOptions {
  include?: string[];
  exclude?: string[];
  envPath?: string;
}

const DEFAULT_EXCLUDE = [
  'MYSQL_PASSWORD',
  'TC_KEY',
  'SECRET',
  'PASSWORD',
  'TOKEN',
];

/**
 * Vite 插件，用于将环境变量注入到浏览器代码中
 */
export function envPlugin(options: EnvPluginOptions = {}): Plugin {
  const { exclude = DEFAULT_EXCLUDE, envPath } = options;
  let envVars: Record<string, string> = {};

  return {
    name: 'vite-plugin-universal-env',

    config(config, { mode }) {
      const projectRoot = config.root || process.cwd();

      let envFilePath: string;
      if (envPath) {
        envFilePath = resolve(projectRoot, envPath);
      } else {
        const modeEnvFile = resolve(projectRoot, `.env.${mode}`);
        if (fs.existsSync(modeEnvFile)) {
          envFilePath = modeEnvFile;
        } else {
          envFilePath = resolve(projectRoot, '.env');
        }
      }

      if (fs.existsSync(envFilePath)) {
        const envContent = fs.readFileSync(envFilePath, 'utf-8');
        const parsed = parseEnvFile(envContent);
        envVars = filterEnvVars(parsed, { exclude });
      }

      // 将环境变量注入为全局 define 常量
      return {
        define: {
          __ENV_VARS__: JSON.stringify(envVars),
        },
      };
    },

    transformIndexHtml() {
      // 同时在 HTML 中注入环境变量脚本（用于运行时覆盖）
      const envScript = `
<script>
  window.__ENV_VARS__ = ${JSON.stringify(envVars)};
  window.__RUNTIME_ENV__ = window.__RUNTIME_ENV__ || {};
</script>`;
      
      return [
        { tag: 'script', children: envScript, injectTo: 'head' },
      ];
    },
  };
}

/** 解析 .env 文件内容 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    result[key] = value;
  }
  
  return result;
}

/** 过滤敏感环境变量 */
function filterEnvVars(
  vars: Record<string, string>,
  options: { exclude: string[] }
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(vars)) {
    const shouldExclude = options.exclude.some(pattern => 
      key.toUpperCase().includes(pattern.toUpperCase())
    );
    if (!shouldExclude) {
      result[key] = value;
    }
  }
  
  return result;
}

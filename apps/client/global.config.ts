/**
 * Silk Road Monopoly 客户端全局配置
 * 通过 @silk-road-monopoly/env 读取环境变量
 */

import { env } from '@silk-road-monopoly/env';

export const ServerConfig = {
  /** API 服务器地址 */
  apiServer: env('API_BASE_URL', 'http://localhost:8081'),
  /** ICE 信令服务器地址 */
  iceServer: env('ICE_SERVER_URL', 'localhost:8082'),
  /** Admin 管理面板地址 */
  adminServer: env('ADMIN_URL', 'http://localhost:8083'),
  /** 腾讯云 COS 配置 */
  cos: {
    bucket: env('COS_BUCKET', ''),
    region: env('COS_REGION', 'ap-guangzhou'),
  },
};

export const GameConfig = {
  /** 默认初始银两 */
  defaultSilver: 15000,
  /** 经过起点奖励银两 */
  passStartReward: 2000,
  /** 最大玩家数 */
  maxPlayers: 6,
  /** 回合超时 (秒) */
  turnTimeout: 60,
};

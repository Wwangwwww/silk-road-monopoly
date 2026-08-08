/** 数据库相关类型定义 */

import type { GameMapInfo } from './item';

/** 数据库中的地图信息 */
export interface GameMapInDb {
  id: string;
  name: string;
  description: string;
  /** 加密存储的地图数据 */
  data: string;
  /** 地图版本 */
  version: string;
  /** 作者 */
  author?: string;
  /** 是否公开 */
  isPublic: boolean;
  /** 下载次数 */
  downloads: number;
  /** 评分 */
  rating: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 缩略图 */
  thumbnail?: string;
}

/** 游戏房间数据库记录 */
export interface GameRoomRecord {
  id: string;
  name: string;
  mapId: string;
  hostId: string;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  createdAt: string;
}

export enum RoomStatus {
  Waiting = 'waiting',
  Playing = 'playing',
  Finished = 'finished',
}

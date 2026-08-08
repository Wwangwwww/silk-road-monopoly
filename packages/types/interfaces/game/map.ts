import type { Port, ChanceCard, Role } from './item';

/** 游戏地图 (完整配置) */
export interface GameMap {
  id: string;
  name: string;
  description: string;
  /** 港口格子 */
  items: Port[];
  /** 机会卡 */
  chanceCards: ChanceCard[];
  /** 可选角色 */
  roles: Role[];
  /** 游戏事件 */
  events?: any[];
  /** 游戏阶段配置 */
  phases?: any[];
  /** UI模板 */
  uiTemplates?: any[];
  /** 修饰器模板 */
  modifierTemplates?: any[];
  /** 自定义UI */
  customUIs?: any[];
  /** 额外库 */
  extraLibs?: any[];
  version: string;
}

/** 游戏设置表单 */
export interface GameSettingForm {
  /** 地图ID */
  mapId: string;
  /** 最大玩家数 */
  maxPlayers: number;
  /** 初始银两 */
  initialSilver: number;
  /** 游戏结束条件 */
  gameOverRule: string;
  /** 回合时间限制 (秒) */
  turnTimeLimit: number;
  /** 是否启用航海事件 */
  enableEvents: boolean;
  /** 是否启用AI */
  enableAI: boolean;
}

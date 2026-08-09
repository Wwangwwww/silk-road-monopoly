/**
 * 海上丝绸之路大富翁 - 核心游戏类型定义
 *
 * 主题映射：
 * - 街道(Street) → 港口(Port)
 * - 地产(Property) → 商埠/贸易站(TradingPost)
 * - 房屋/酒店 → 仓库/商馆
 * - 金钱 → 银两(Silver)
 */

// ==================== 地图元素类型 ====================

/** 地图元素类型枚举 */
export enum MapItemType {
  /** 起点港口 (泉州) */
  StartPort = 'start_port',
  /** 普通港口 (可购买) */
  Port = 'port',
  /** 贸易站 (已开发的港口上的建筑) */
  TradingPost = 'trading_post',
  /** 机会卡 (航海事件) */
  Chance = 'chance',
  /** 命运卡 (贸易事件) */
  Fate = 'fate',
  /** 航海税 */
  Tax = 'tax',
  /** 监狱 (被海盗扣留) */
  Jail = 'jail',
  /** 自由停泊 */
  FreePort = 'free_port',
  /** 前往监狱 */
  GoToJail = 'go_to_jail',
}

/** 地图事件类型 (航海/贸易事件) */
export enum MapEventType {
  /** 台风 - 随机损坏船只/损失货物 */
  Typhoon = 'typhoon',
  /** 海盗 - 损失银两 */
  Pirates = 'pirates',
  /** 顺风 - 额外移动 */
  FairWind = 'fair_wind',
  /** 贸易繁荣 - 获得银两 */
  TradeBoom = 'trade_boom',
  /** 海市蜃楼 - 随机传送 */
  Mirage = 'mirage',
  /** 朝廷赏赐 - 获得银两 */
  ImperialReward = 'imperial_reward',
  /** 船舶维修 - 支付银两 */
  ShipRepair = 'ship_repair',
  /** 关税 - 支付银两 */
  CustomsDuty = 'customs_duty',
}

/** 港口等级 */
export enum PortLevel {
  /** 未开发 */
  Undeveloped = 0,
  /** 初级商埠 */
  TradingPost_L1 = 1,
  /** 中级商埠 */
  TradingPost_L2 = 2,
  /** 高级商馆 */
  TradingHouse = 3,
  /** 贸易中心 */
  TradeCenter = 4,
  /** 海上贸易帝国 */
  MaritimeEmpire = 5,
}

/** 港口地区文化主题（决定棋盘上的特色建筑风格） */
export enum PortTheme {
  /** 中国东南沿海 */
  Chinese = 'chinese',
  /** 东南亚 */
  SoutheastAsia = 'southeast_asia',
  /** 印度 / 南亚 */
  India = 'india',
  /** 阿拉伯半岛 */
  Arabia = 'arabia',
  /** 红海 */
  RedSea = 'red_sea',
  /** 地中海 */
  Mediterranean = 'mediterranean',
  /** 欧洲 */
  Europe = 'europe',
  /** 公海 / 海洋 */
  Ocean = 'ocean',
}

/** 特色地标建筑类型（海上丝绸之路沿线代表性建筑） */
export enum LandmarkType {
  /** 中式宝塔（泉州开元寺东西塔） */
  ChinesePagoda = 'chinese_pagoda',
  /** 中式光塔（广州怀圣寺光塔） */
  ChineseMinaret = 'chinese_minaret',
  /** 东南亚占婆塔（占城） */
  ChamTower = 'cham_tower',
  /** 东南亚清真寺（满剌加） */
  MalayMosque = 'malay_mosque',
  /** 印度佛塔（锡兰佛牙寺） */
  Stupa = 'stupa',
  /** 印度宫殿穹顶（古里卡利卡特） */
  PalaceDome = 'palace_dome',
  /** 阿拉伯宣礼塔（忽鲁谟斯） */
  ArabianMinaret = 'arabian_minaret',
  /** 红海火山灯塔（亚丁） */
  VolcanoLighthouse = 'volcano_lighthouse',
  /** 地中海法罗斯灯塔（亚历山大） */
  Pharos = 'pharos',
  /** 欧洲钟楼（威尼斯圣马可钟楼） */
  Campanile = 'campanile',
  /** 通用商馆（默认） */
  TradingHouse = 'trading_house',
}

/** 地图角色 (历史人物/船型) */
export interface Role {
  id: string;
  name: string;
  /** 角色描述 */
  description: string;
  /** 船型名称 */
  shipType: string;
  /** 3D模型路径 */
  modelPath?: string;
  /** 头像图标 */
  avatarIcon?: string;
  /** 初始银两 */
  initialSilver: number;
}

/** 港口节点 (地图上的格子) */
export interface Port {
  id: string;
  /** 港口名称 (如: 泉州港, 占城港, 满剌加港) */
  name: string;
  /** 所属地区 */
  region: string;
  /** 地图元素类型 */
  type: MapItemType;
  /** 当前位置在地图上的索引 */
  index: number;
  /** 3D位置 */
  position?: { x: number; y: number; z: number };
  /** 基础价格 (银两) */
  basePrice?: number;
  /** 过路费/贸易税 (基于等级) */
  tollFees?: number[];
  /** 建造费用 (每个等级) */
  upgradeCosts?: number[];
  /** 港口所属颜色组 */
  colorGroup?: string;
  /** 地区文化主题（决定棋盘上的特色建筑风格） */
  theme?: PortTheme;
  /** 特色地标建筑类型 */
  landmark?: LandmarkType;
  /** 港口描述 */
  description?: string;
  /** 港口特产 */
  specialty?: string;
}

/** 机会卡/命运卡 */
export interface ChanceCard {
  id: string;
  /** 卡片标题 */
  title: string;
  /** 卡片描述 */
  description: string;
  /** 卡片类型 */
  type: 'chance' | 'fate';
  /** 效果类型 */
  effect: MapEventType;
  /** 效果数值 (银两增减、移动步数等) */
  value: number;
}

/** 用户信息 */
export interface User {
  id: string;
  nickName: string;
  avatar?: string;
  /** 总游戏场次 */
  totalGames?: number;
  /** 胜场 */
  wins?: number;
  /** 累计银两 */
  totalSilver?: number;
}

/** 完整地图配置 */
export interface GameMapInfo {
  id: string;
  name: string;
  description: string;
  /** 港口列表 (地图格子) */
  ports: Port[];
  /** 机会卡牌堆 */
  chanceCards: ChanceCard[];
  /** 角色列表 */
  roles: Role[];
  /** 地图版本 */
  version: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 地图作者 */
  author?: string;
  /** 缩略图 */
  thumbnail?: string;
}

/** 地图事件 */
export interface MapEvent {
  id: string;
  type: MapEventType;
  title: string;
  description: string;
  /** 效果参数 */
  params?: Record<string, any>;
}

// 为了向后兼容, 导出别名
export type Street = Port;
export type MapItem = Port;

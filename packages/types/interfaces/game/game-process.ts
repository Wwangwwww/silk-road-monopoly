/**
 * 游戏流程核心类型定义
 */

import type { GameMap } from './map';
import type { Port } from './item';
import type { ICommandBus, IModifierManager, IBuffManager } from './action-system';

// ==================== 游戏数据 ====================

/** 游戏核心数据 */
export interface GameData {
  /** 游戏地图 */
  map: GameMap;
  /** 当前玩家列表 */
  players: PlayerInfo[];
  /** 港口资产信息 */
  properties: Map<string, PropertyInfo>;
  /** 当前回合 */
  currentRound: number;
  /** 当前玩家索引 */
  currentPlayerIndex: number;
  /** 游戏阶段 */
  phase: GamePhaseMark;
  /** 骰子结果 */
  diceResult?: DiceResult;
  /** 游戏日志 */
  logs: GameLog[];
}

/** 玩家信息 */
export interface PlayerInfo {
  id: string;
  name: string;
  /** 角色类型 */
  roleId: string;
  /** 银两 */
  silver: number;
  /** 当前位置 */
  position: number;
  /** 拥有的港口ID列表 */
  ports: string[];
  /** 持有卡片 */
  cards: string[];
  /** 是否在监狱 (被海盗扣留) */
  inJail: boolean;
  /** 监狱剩余回合 */
  jailTurns: number;
  /** 是否破产 */
  isBankrupt: boolean;
  /** 船队等级 */
  fleetLevel: number;
  /** 是否AI */
  isAI: boolean;
  /** 是否在线 */
  isOnline: boolean;
}

/** 港口资产信息 */
export interface PropertyInfo {
  /** 港口ID */
  portId: string;
  /** 拥有者ID */
  ownerId: string;
  /** 等级 */
  level: number;
  /** 是否抵押 */
  isMortgaged: boolean;
}

/** 骰子结果 */
export interface DiceResult {
  /** 骰子值数组 */
  values: number[];
  /** 总和 */
  total: number;
  /** 是否双骰 */
  isDouble: boolean;
}

/** 游戏日志 */
export interface GameLog {
  round: number;
  playerId: string;
  message: string;
  timestamp: number;
}

// ==================== 游戏阶段 ====================

/** 游戏阶段标记 */
export enum GamePhaseMark {
  /** 等待开始 */
  Waiting = 'waiting',
  /** 掷骰子阶段 */
  RollingDice = 'rolling_dice',
  /** 移动阶段 */
  Moving = 'moving',
  /** 港口操作阶段 */
  PortAction = 'port_action',
  /** 航海事件阶段 */
  Event = 'event',
  /** 回合结束 */
  TurnEnd = 'turn_end',
  /** 游戏结束 */
  GameOver = 'game_over',
}

/** 操作类型 */
export enum OperateType {
  /** 购买港口 */
  BuyPort = 'buy_port',
  /** 升级商埠 */
  Upgrade = 'upgrade',
  /** 抵押 */
  Mortgage = 'mortgage',
  /** 赎回 */
  Redeem = 'redeem',
  /** 支付过路费 */
  PayToll = 'pay_toll',
  /** 使用卡片 */
  UseCard = 'use_card',
  /** 交易 */
  Trade = 'trade',
  /** 投降/破产 */
  Surrender = 'surrender',
}

// ==================== 游戏接口 ====================

/** 游戏进程接口 */
export interface IGameProcess {
  /** 事件总线 */
  eventBus: any;
  /** 玩家信息映射 */
  players: Map<string, IPlayer>;
  /** 资产信息映射 */
  properties: Map<string, IProperty>;
  /** 游戏运行时栈 */
  gameRuntimeStack: any[];
  /** 命令总线 */
  commandBus: ICommandBus;
  /** 修饰器管理器 */
  modifierManager: IModifierManager;
  /** Buff管理器 */
  buffManager: IBuffManager;
  /** 初始化游戏 */
  init(gameData: GameData): Promise<void>;
  /** 开始回合 */
  startTurn(): Promise<void>;
  /** 掷骰子 */
  rollDice(): Promise<DiceResult>;
  /** 移动玩家 */
  movePlayer(playerId: string, steps: number): Promise<void>;
  /** 处理港口到达 */
  handlePortArrival(playerId: string, portId: string): Promise<void>;
  /** 结束回合 */
  endTurn(): Promise<void>;
  /** 获取游戏状态 */
  getState(): GameData;
}

/** 玩家接口 */
export interface IPlayer {
  id: string;
  name: string;
  silver: number;
  position: number;
  addSilver(amount: number): void;
  removeSilver(amount: number): boolean;
  buyPort(portId: string): boolean;
  upgradePort(portId: string): boolean;
  mortgagePort(portId: string): boolean;
  goToJail(): void;
  leaveJail(): void;
  bankrupt(): void;
}

/** 资产接口 */
export interface IProperty {
  portId: string;
  ownerId: string;
  level: number;
  getTollFee(): number;
  getUpgradeCost(): number;
  upgrade(): void;
  changeOwner(newOwnerId: string): void;
}

/** 游戏结束规则 */
export enum GameOverRule {
  /** 所有其他玩家破产 */
  AllBankrupt = 'all_bankrupt',
  /** 达到目标银两 */
  TargetSilver = 'target_silver',
  /** 固定回合数 */
  FixedRounds = 'fixed_rounds',
}

/** 玩家移动类型 */
export enum PlayerMoveType {
  /** 正常移动 */
  Normal = 'normal',
  /** 传送 */
  Teleport = 'teleport',
  /** 后退 */
  Backward = 'backward',
}

/** 目标选择类型 */
export enum TargetSelectType {
  /** 单个玩家 */
  SinglePlayer = 'single_player',
  /** 所有玩家 */
  AllPlayers = 'all_players',
  /** 单个港口 */
  SinglePort = 'single_port',
  /** 所有港口 */
  AllPorts = 'all_ports',
}

/** Action System - 命令/修饰器/Buff 系统类型定义 */

// ==================== 命令总线 ====================

/** 命令接口 */
export interface ICommand {
  type: string;
  params: Record<string, any>;
  execute(): Promise<void>;
  undo?(): Promise<void>;
}

/** 命令总线接口 */
export interface ICommandBus {
  /** 注册命令处理器 */
  register(type: string, handler: CommandHandler): void;
  /** 执行命令 */
  execute(command: ICommand): Promise<void>;
  /** 撤销命令 */
  undo(): Promise<void>;
  /** 获取命令历史 */
  getHistory(): ICommand[];
}

export type CommandHandler = (command: ICommand) => Promise<void>;

// ==================== 修饰器系统 ====================

/** 修饰器接口 */
export interface IModifier {
  id: string;
  type: string;
  /** 修饰器参数 */
  params: Record<string, any>;
  /** 优先级 */
  priority: number;
  /** 持续时间 (回合数, -1为永久) */
  duration: number;
  /** 应用修饰器 */
  apply(context: any): any;
  /** 移除修饰器 */
  remove(): void;
}

/** 修饰器管理器接口 */
export interface IModifierManager {
  /** 添加修饰器 */
  addModifier(modifier: IModifier): void;
  /** 移除修饰器 */
  removeModifier(id: string): void;
  /** 获取所有修饰器 */
  getModifiers(): IModifier[];
  /** 按类型获取修饰器 */
  getModifiersByType(type: string): IModifier[];
  /** 应用所有修饰器 */
  applyAll(context: any): any;
  /** 减少持续时间 */
  tick(): void;
}

// ==================== Buff系统 ====================

/** Buff 接口 */
export interface IBuff {
  id: string;
  name: string;
  description: string;
  /** Buff 效果 */
  effect: BuffEffect;
  /** 持续时间 (回合) */
  duration: number;
  /** 剩余回合 */
  remainingTurns: number;
  /** Buff 图标 */
  icon?: string;
}

/** Buff 效果 */
export interface BuffEffect {
  /** 银两倍率 */
  silverMultiplier?: number;
  /** 移动力加成 */
  moveBonus?: number;
  /** 过路费减免 */
  tollReduction?: number;
  /** 是否免疫海盗 */
  pirateImmunity?: boolean;
  /** 是否免疫台风 */
  typhoonImmunity?: boolean;
  /** 额外骰子 */
  extraDice?: number;
}

/** Buff 管理器接口 */
export interface IBuffManager {
  /** 添加Buff */
  addBuff(buff: IBuff): void;
  /** 移除Buff */
  removeBuff(id: string): void;
  /** 获取玩家所有Buff */
  getBuffs(): IBuff[];
  /** 减少Buff持续回合 */
  tick(): void;
  /** 清除所有Buff */
  clear(): void;
}

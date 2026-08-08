/** AI 决策系统类型定义 */

/** AI 决策场景 */
export interface AIDecisionScene {
  /** 场景ID */
  id: string;
  /** 场景类型 */
  type: AIDecisionType;
  /** 场景参数 */
  params: Record<string, any>;
  /** 可选策略 */
  strategies: AIStrategy[];
}

/** AI 决策类型 */
export enum AIDecisionType {
  /** 是否购买港口 */
  BuyPort = 'buy_port',
  /** 是否升级 */
  Upgrade = 'upgrade',
  /** 是否抵押 */
  Mortgage = 'mortgage',
  /** 是否使用卡片 */
  UseCard = 'use_card',
  /** 交易报价 */
  TradeOffer = 'trade_offer',
  /** 是否支付赎金出狱 */
  PayBail = 'pay_bail',
}

/** AI 策略定义 */
export interface AIStrategy {
  /** 策略名称 */
  name: string;
  /** 策略权重 */
  weight: number;
  /** 策略条件 */
  condition: (scene: AIDecisionScene) => boolean;
  /** 策略执行 */
  execute: (scene: AIDecisionScene) => Promise<any>;
  /** 策略描述 */
  description: string;
}

/** AI 玩家配置 */
export interface AIPlayerConfig {
  /** 攻击性 (0-1) */
  aggression: number;
  /** 风险偏好 (0-1) */
  riskTolerance: number;
  /** 贸易偏好 (0-1) */
  tradePreference: number;
  /** 策略类型 */
  strategyType: AIStrategyType;
}

export enum AIStrategyType {
  /** 激进型 */
  Aggressive = 'aggressive',
  /** 保守型 */
  Conservative = 'conservative',
  /** 均衡型 */
  Balanced = 'balanced',
  /** 贸易型 */
  Trader = 'trader',
}

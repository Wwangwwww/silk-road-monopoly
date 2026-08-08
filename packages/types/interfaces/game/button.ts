/** 按钮系统类型定义 */

/** 按钮配置 */
export interface ButtonConfig {
  id: string;
  /** 按钮文字 */
  label: string;
  /** 按钮图标 */
  icon?: string;
  /** 按钮类型 */
  type?: 'primary' | 'default' | 'danger';
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示 */
  visible?: boolean;
  /** 处理函数标识 */
  handler: string;
}

/** 按钮控制器 */
export interface ButtonController {
  /** 注册按钮 */
  register(config: ButtonConfig): void;
  /** 注销按钮 */
  unregister(id: string): void;
  /** 更新按钮状态 */
  update(id: string, updates: Partial<ButtonConfig>): void;
  /** 获取所有按钮 */
  getAll(): ButtonConfig[];
}

/** 按钮注册消息 */
export interface ButtonRegisterMessage {
  buttons: ButtonConfig[];
  clear?: boolean;
}

/** 工具类型定义 */

/** 骰子接口 */
export interface IDice {
  /** 掷骰子 */
  roll(): DiceInfo;
  /** 获取上一次结果 */
  getLastResult(): DiceInfo | null;
}

/** 骰子信息 */
export interface DiceInfo {
  values: number[];
  total: number;
  isDouble: boolean;
}

/** 表单 Schema */
export interface FormSchema {
  fields: FormField[];
  title?: string;
  submitText?: string;
}

/** 表单字段 */
export interface FormField {
  key: string;
  label: string;
  type: ComponentType;
  required?: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  rules?: any[];
}

/** 组件类型 */
export enum ComponentType {
  Input = 'input',
  Select = 'select',
  Switch = 'switch',
  Number = 'number',
  Textarea = 'textarea',
  Slider = 'slider',
}

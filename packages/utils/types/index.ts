/** 类型工具 */

/** 排除字符串键 */
export type ExcludeStringKeys<T> = {
  [K in keyof T as T[K] extends string ? never : K]: T[K];
};

/** 排除函数键 */
export type ExcludeFunctionKeys<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};

/** 深度部分 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

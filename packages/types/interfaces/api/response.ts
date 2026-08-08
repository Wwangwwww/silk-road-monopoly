/** API 响应类型 */

export interface ApiResponse<T = any> {
  status: number;
  msg: string;
  data?: T;
  /** 分页信息 */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

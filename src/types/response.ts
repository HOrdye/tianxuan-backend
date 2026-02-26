/**
 * 标准 API 响应类型定义
 * 确保前后端数据结构统一
 */

/**
 * 标准 API 响应接口
 * 所有 API 响应都应该遵循这个结构
 * 
 * @template T 响应数据的类型
 */
export interface ApiResponse<T = any> {
  /** 请求是否成功 */
  success: boolean;
  
  /** 成功或错误的消息提示（可选） */
  message?: string;
  
  /** 错误类型标识（可选，仅在失败时使用） */
  error?: string;
  
  /** 具体的数据负载（可选，成功时通常包含数据） */
  data?: T;
}

/**
 * 成功响应的辅助类型
 */
export type SuccessResponse<T = any> = Required<Pick<ApiResponse<T>, 'success' | 'data'>> & 
  Pick<ApiResponse<T>, 'message'>;

/**
 * 错误响应的辅助类型
 */
export type ErrorResponse = Required<Pick<ApiResponse, 'success' | 'error'>> & 
  Pick<ApiResponse, 'message'>;

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T = any> extends ApiResponse<{
  /** 数据列表 */
  items: T[];
  /** 分页信息 */
  pagination: {
    /** 当前页码（从1开始） */
    page: number;
    /** 每页数量 */
    pageSize: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    totalPages: number;
  };
}> {}

/**
 * 列表响应接口（简化版，用于不需要分页的场景）
 */
export interface ListResponse<T = any> extends ApiResponse<{
  /** 数据列表 */
  items: T[];
  /** 列表总数 */
  count: number;
}> {}

/**
 * 占卜历史记录相关 API
 * 处理占卜历史记录的保存、查询和删除
 */

import request from '../request';
import type { ApiResponse } from '@/types/api';

/**
 * 占卜历史记录类型（后端格式）
 */
export type DivinationHistoryType = 'yijing' | 'dilemma' | 'tarot' | 'jiaobei' | 'triple_analysis';

/**
 * 创建历史记录请求
 */
export interface CreateHistoryRequest {
  type: DivinationHistoryType;
  question?: string;
  result: any;
}

/**
 * 历史记录响应
 */
export interface DivinationHistoryRecord {
  id: string;
  user_id: string;
  type: DivinationHistoryType;
  question?: string;
  result: any;
  created_at: string;
}

/**
 * 查询历史记录请求参数
 */
export interface GetHistoryParams {
  page?: number;
  pageSize?: number;
  type?: DivinationHistoryType;
}

/**
 * 历史记录列表响应
 */
export interface HistoryListResponse {
  records: DivinationHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export const divinationHistoryApi = {
  /**
   * 创建历史记录
   * POST /api/divination/history
   */
  async create(data: CreateHistoryRequest): Promise<DivinationHistoryRecord> {
    const response = await request.post<ApiResponse<DivinationHistoryRecord>>(
      '/api/divination/history',
      data
    );
    return response.data.data;
  },

  /**
   * 获取历史记录列表
   * GET /api/divination/history
   */
  async getList(params?: GetHistoryParams): Promise<HistoryListResponse> {
    const response = await request.get<ApiResponse<HistoryListResponse>>(
      '/api/divination/history',
      { params }
    );
    return response.data.data;
  },

  /**
   * 删除历史记录
   * DELETE /api/divination/history/:id
   */
  async delete(id: string): Promise<void> {
    await request.delete<ApiResponse<void>>(`/api/divination/history/${id}`);
  },
};

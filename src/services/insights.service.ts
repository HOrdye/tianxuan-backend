import { pool } from '../config/database';

/**
 * 收藏洞察服务模块
 * 提供用户收藏洞察的CRUD功能
 */

export interface SavedInsight {
  id: string;
  user_id: string;
  insight_type: string;
  content: string;
  chart_id?: string | null;
  session_id?: string | null;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSavedInsightParams {
  userId: string;
  insightType: string;
  content: string;
  chartId?: string;
  sessionId?: string;
  metadata?: any;
}

export interface GetSavedInsightsParams {
  userId: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * 保存收藏洞察
 * 
 * @param params 创建参数
 * @returns Promise<SavedInsight>
 */
export async function saveInsight(
  params: CreateSavedInsightParams
): Promise<SavedInsight> {
  try {
    const { userId, insightType, content, chartId, sessionId, metadata } = params;

    const result = await pool.query(
      `INSERT INTO public.saved_insights 
       (user_id, insight_type, content, chart_id, session_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, insight_type, content, chart_id, session_id, metadata, created_at, updated_at`,
      [userId, insightType, content, chartId || null, sessionId || null, metadata || {}]
    );

    return {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      insight_type: result.rows[0].insight_type,
      content: result.rows[0].content,
      chart_id: result.rows[0].chart_id,
      session_id: result.rows[0].session_id,
      metadata: result.rows[0].metadata || {},
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at,
    };
  } catch (error: any) {
    console.error('[Insights Service] 保存收藏失败:', {
      userId: params.userId,
      insightType: params.insightType,
      error: error.message,
    });
    throw new Error(`保存收藏失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取收藏列表
 * 
 * @param params 查询参数
 * @returns Promise<SavedInsight[]>
 */
export async function getSavedInsights(
  params: GetSavedInsightsParams
): Promise<SavedInsight[]> {
  try {
    const { userId, type, search, limit = 50, offset = 0 } = params;

    let query = `
      SELECT id, user_id, insight_type, content, chart_id, session_id, metadata, created_at, updated_at
      FROM public.saved_insights
      WHERE user_id = $1
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND insight_type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (search) {
      query += ` AND content ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      insight_type: row.insight_type,
      content: row.content,
      chart_id: row.chart_id,
      session_id: row.session_id,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('[Insights Service] 获取收藏列表失败:', {
      userId: params.userId,
      error: error.message,
    });
    throw new Error(`获取收藏列表失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 删除收藏
 * 
 * @param userId 用户ID
 * @param insightId 收藏ID
 * @returns Promise<void>
 */
export async function deleteInsight(
  userId: string,
  insightId: string
): Promise<void> {
  try {
    const result = await pool.query(
      `DELETE FROM public.saved_insights 
       WHERE id = $1 AND user_id = $2`,
      [insightId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('收藏不存在或无权访问');
    }
  } catch (error: any) {
    console.error('[Insights Service] 删除收藏失败:', {
      userId,
      insightId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 批量删除收藏
 * 
 * @param userId 用户ID
 * @param insightIds 收藏ID数组
 * @returns Promise<number> 删除的记录数
 */
export async function batchDeleteInsights(
  userId: string,
  insightIds: string[]
): Promise<number> {
  try {
    if (!insightIds || insightIds.length === 0) {
      return 0;
    }

    const result = await pool.query(
      `DELETE FROM public.saved_insights 
       WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [insightIds, userId]
    );

    return result.rowCount || 0;
  } catch (error: any) {
    console.error('[Insights Service] 批量删除收藏失败:', {
      userId,
      insightIds,
      error: error.message,
    });
    throw new Error(`批量删除收藏失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 统计收藏数量
 * 
 * @param userId 用户ID
 * @returns Promise<number>
 */
export async function getSavedInsightsCount(userId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM public.saved_insights 
       WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error: any) {
    console.error('[Insights Service] 统计收藏数量失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`统计收藏数量失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查是否已收藏
 * 
 * @param userId 用户ID
 * @param options 查询选项
 * @param options.type 收藏类型（可选）
 * @param options.sessionId 会话ID（可选）
 * @param options.chartId 命盘ID（可选）
 * @returns Promise<{ isSaved: boolean }>
 */
export async function checkIfSaved(
  userId: string,
  options?: {
    type?: string;
    sessionId?: string;
    chartId?: string;
  }
): Promise<{ isSaved: boolean }> {
  try {
    let query = `
      SELECT COUNT(*) as count 
      FROM public.saved_insights 
      WHERE user_id = $1
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (options?.type) {
      query += ` AND insight_type = $${paramIndex}`;
      queryParams.push(options.type);
      paramIndex++;
    }

    if (options?.sessionId) {
      query += ` AND session_id = $${paramIndex}`;
      queryParams.push(options.sessionId);
      paramIndex++;
    }

    if (options?.chartId) {
      query += ` AND chart_id = $${paramIndex}`;
      queryParams.push(options.chartId);
      paramIndex++;
    }

    // 至少需要一个查询条件（除了user_id）
    if (paramIndex === 2) {
      // 如果没有提供任何查询条件，返回false（避免查询所有收藏）
      return { isSaved: false };
    }

    const result = await pool.query(query, queryParams);
    const count = parseInt(result.rows[0].count, 10);

    return { isSaved: count > 0 };
  } catch (error: any) {
    console.error('[Insights Service] 检查是否已收藏失败:', {
      userId,
      options,
      error: error.message,
    });
    throw new Error(`检查是否已收藏失败: ${error.message || '未知错误'}`);
  }
}

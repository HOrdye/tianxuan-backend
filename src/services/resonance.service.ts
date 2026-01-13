import { pool } from '../config/database';

/**
 * 共振反馈服务模块
 * 提供反馈提交、状态查询、统计等功能
 */

/**
 * 反馈结果接口
 */
export interface SubmitFeedbackResult {
  success: boolean;
  message?: string;
  feedback_id?: string;
}

/**
 * 反馈状态接口
 */
export interface FeedbackStatus {
  feedback_id: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  reviewed_at?: Date;
  reviewed_by?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * 反馈统计接口
 */
export interface FeedbackStats {
  total_count: number;
  pending_count: number;
  reviewed_count: number;
  resolved_count: number;
  rejected_count: number;
  average_rating: number | null;
  by_type: Record<string, number>;
}

/**
 * 提交反馈
 * 
 * @param userId 用户ID
 * @param feedbackType 反馈类型
 * @param content 反馈内容
 * @param rating 评分（可选，1-5分）
 * @param metadata 元数据（可选）
 * @returns Promise<SubmitFeedbackResult> 提交结果
 * 
 * @throws Error 如果提交失败
 */
export async function submitFeedback(
  userId: string,
  feedbackType: string,
  content: string,
  rating?: number,
  metadata?: any
): Promise<SubmitFeedbackResult> {
  // 参数验证
  if (!userId || !feedbackType || !content) {
    throw new Error('参数错误：用户ID、反馈类型和反馈内容必须有效');
  }

  // 验证评分范围
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new Error('参数错误：评分必须在1-5之间');
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.resonance_feedback 
       (user_id, feedback_type, content, rating, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [
        userId,
        feedbackType,
        content,
        rating || null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return {
      success: true,
      message: '反馈提交成功',
      feedback_id: result.rows[0].id,
    };
  } catch (error: any) {
    console.error('提交反馈失败:', {
      userId,
      feedbackType,
      error: error.message,
    });

    // 处理数据库错误
    if (error.code === '23503') {
      throw new Error('用户不存在');
    }

    throw new Error(`提交反馈失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查反馈状态
 * 
 * @param userId 用户ID
 * @param feedbackId 反馈ID
 * @returns Promise<FeedbackStatus | null> 反馈状态或 null（不存在）
 */
export async function checkFeedbackStatus(
  userId: string,
  feedbackId: string
): Promise<FeedbackStatus | null> {
  // 参数验证
  if (!userId || !feedbackId) {
    throw new Error('参数错误：用户ID和反馈ID必须有效');
  }

  try {
    const result = await pool.query(
      `SELECT 
        id,
        status,
        reviewed_at,
        reviewed_by,
        created_at,
        updated_at
      FROM public.resonance_feedback
      WHERE id = $1 AND user_id = $2`,
      [feedbackId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      feedback_id: row.id,
      status: row.status,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('查询反馈状态失败:', {
      userId,
      feedbackId,
      error: error.message,
    });
    throw new Error(`查询反馈状态失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取反馈统计
 * 
 * @param userId 用户ID（可选，如果提供则只统计该用户的反馈）
 * @returns Promise<FeedbackStats> 反馈统计
 */
export async function getFeedbackStats(
  userId?: string
): Promise<FeedbackStats> {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        AVG(rating) as average_rating
      FROM public.resonance_feedback
    `;
    const params: any[] = [];

    if (userId) {
      query += ` WHERE user_id = $1`;
      params.push(userId);
    }

    const statsResult = await pool.query(query, params);
    const stats = statsResult.rows[0];

    // 按类型统计
    let typeQuery = `
      SELECT 
        feedback_type,
        COUNT(*) as count
      FROM public.resonance_feedback
    `;
    if (userId) {
      typeQuery += ` WHERE user_id = $1`;
    }
    typeQuery += ` GROUP BY feedback_type`;

    const typeResult = await pool.query(typeQuery, userId ? [userId] : []);
    const byType: Record<string, number> = {};
    typeResult.rows.forEach((row) => {
      byType[row.feedback_type] = parseInt(row.count, 10);
    });

    return {
      total_count: parseInt(stats.total_count, 10),
      pending_count: parseInt(stats.pending_count, 10),
      reviewed_count: parseInt(stats.reviewed_count, 10),
      resolved_count: parseInt(stats.resolved_count, 10),
      rejected_count: parseInt(stats.rejected_count, 10),
      average_rating: stats.average_rating ? parseFloat(stats.average_rating) : null,
      by_type: byType,
    };
  } catch (error: any) {
    console.error('获取反馈统计失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取反馈统计失败: ${error.message || '未知错误'}`);
  }
}

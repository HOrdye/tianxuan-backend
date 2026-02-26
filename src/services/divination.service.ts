import { pool } from '../config/database';
import { randomUUID } from 'crypto';

export type DivinationHistoryType = 'yijing' | 'dilemma' | 'tarot' | 'jiaobei' | 'triple_analysis';

export interface DivinationHistoryRecord {
  id: string;
  user_id: string;
  type: DivinationHistoryType;
  question?: string;
  result: any;
  created_at: string;
}

export interface CreateHistoryParams {
  userId: string;
  type: DivinationHistoryType;
  question?: string;
  result: any;
}

export interface GetHistoryParams {
  userId: string;
  page?: number;
  pageSize?: number;
  type?: DivinationHistoryType;
}

export interface HistoryListResult {
  records: DivinationHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export async function createHistory(
  params: CreateHistoryParams
): Promise<DivinationHistoryRecord> {
  const { userId, type, question, result } = params;

  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!type || !['yijing', 'dilemma', 'tarot', 'jiaobei', 'triple_analysis'].includes(type)) {
    throw new Error('参数错误：占卜类型必须有效');
  }

  if (!result) {
    throw new Error('参数错误：占卜结果必须提供');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const recordId = randomUUID();
    
    await client.query(
      `INSERT INTO public.divination_history (
        id,
        user_id,
        type,
        question,
        result,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        recordId,
        userId,
        type,
        question || null,
        JSON.stringify(result),
      ]
    );

    await client.query('COMMIT');

    const recordResult = await client.query(
      `SELECT 
        id,
        user_id,
        type,
        question,
        result,
        created_at
      FROM public.divination_history
      WHERE id = $1`,
      [recordId]
    );

    const row = recordResult.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      question: row.question,
      result: row.result,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('创建占卜历史记录失败:', {
      userId,
      type,
      error: error.message,
    });
    throw new Error(`创建占卜历史记录失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

export async function getHistoryList(
  params: GetHistoryParams
): Promise<HistoryListResult> {
  const { userId, page = 1, pageSize = 50, type } = params;

  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (page < 1) {
    throw new Error('参数错误：页码必须大于0');
  }

  if (pageSize < 1 || pageSize > 100) {
    throw new Error('参数错误：每页数量必须在1-100之间');
  }

  try {
    const offset = (page - 1) * pageSize;

    let query = `
      SELECT 
        id,
        user_id,
        type,
        question,
        result,
        created_at
      FROM public.divination_history
      WHERE user_id = $1
    `;
    
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(pageSize, offset);

    const recordsResult = await pool.query(query, queryParams);

    const countQuery = type
      ? `SELECT COUNT(*) as total FROM public.divination_history WHERE user_id = $1 AND type = $2`
      : `SELECT COUNT(*) as total FROM public.divination_history WHERE user_id = $1`;
    
    const countParams = type ? [userId, type] : [userId];
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const records: DivinationHistoryRecord[] = recordsResult.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      question: row.question,
      result: row.result,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    }));

    return {
      records,
      total,
      page,
      pageSize,
    };
  } catch (error: any) {
    console.error('查询占卜历史记录失败:', {
      userId,
      page,
      pageSize,
      type,
      error: error.message,
    });
    throw new Error(`查询占卜历史记录失败: ${error.message || '未知错误'}`);
  }
}

export async function deleteHistory(
  userId: string,
  recordId: string
): Promise<void> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!recordId) {
    throw new Error('参数错误：记录ID必须有效');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const checkResult = await client.query(
      `SELECT id, user_id 
       FROM public.divination_history 
       WHERE id = $1 AND user_id = $2`,
      [recordId, userId]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('记录不存在或不属于当前用户');
    }

    await client.query(
      `DELETE FROM public.divination_history 
       WHERE id = $1 AND user_id = $2`,
      [recordId, userId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('删除占卜历史记录失败:', {
      userId,
      recordId,
      error: error.message,
    });
    
    if (error.message?.includes('不存在') || error.message?.includes('不属于')) {
      throw error;
    }
    
    throw new Error(`删除占卜历史记录失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

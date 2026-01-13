import { pool } from '../config/database';

/**
 * 时空导航缓存服务模块
 * 提供缓存获取、保存、清除等功能
 */

/**
 * 缓存数据接口
 */
export interface TimespaceCache {
  id: string;
  user_id: string;
  profile_id: string;
  dimension: string;
  cache_key: string;
  cache_data: any; // JSONB 类型
  period_start: string; // date 类型
  period_end: string; // date 类型
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 保存缓存结果接口
 */
export interface SaveCacheResult {
  success: boolean;
  message?: string;
  cache_id?: string;
}

/**
 * 获取缓存数据
 * 
 * @param userId 用户ID
 * @param dimension 维度（可选）
 * @param cacheKey 缓存键（可选）
 * @returns Promise<TimespaceCache | null> 缓存数据或 null（不存在或已过期）
 */
export async function getTimespaceCache(
  userId: string,
  dimension?: string,
  cacheKey?: string
): Promise<TimespaceCache | null> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    let query = `
      SELECT 
        id, user_id, profile_id, dimension, cache_key, cache_data, 
        period_start, period_end, expires_at, created_at, updated_at
      FROM public.timespace_cache
      WHERE user_id = $1
        AND expires_at > NOW()
    `;
    const params: any[] = [userId];

    if (dimension) {
      query += ` AND dimension = $${params.length + 1}`;
      params.push(dimension);
    }

    if (cacheKey) {
      query += ` AND cache_key = $${params.length + 1}`;
      params.push(cacheKey);
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      dimension: row.dimension,
      cache_key: row.cache_key,
      cache_data: typeof row.cache_data === 'string' ? JSON.parse(row.cache_data) : row.cache_data,
      period_start: row.period_start,
      period_end: row.period_end,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('查询缓存失败:', { userId, dimension, cacheKey, error: error.message });
    throw new Error(`查询缓存失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 保存缓存数据
 * 
 * @param userId 用户ID
 * @param profileId 用户profile ID
 * @param dimension 维度
 * @param cacheKey 缓存键
 * @param cacheData 缓存数据（JSONB）
 * @param periodStart 时间段开始日期（YYYY-MM-DD）
 * @param periodEnd 时间段结束日期（YYYY-MM-DD）
 * @param expiresAt 过期时间
 * @returns Promise<SaveCacheResult> 保存结果
 */
export async function saveTimespaceCache(
  userId: string,
  profileId: string,
  dimension: string,
  cacheKey: string,
  cacheData: any,
  periodStart: string,
  periodEnd: string,
  expiresAt: Date
): Promise<SaveCacheResult> {
  // 参数验证
  if (!userId || !profileId) {
    throw new Error('参数错误：用户ID和profile ID必须有效');
  }

  if (!dimension || !cacheKey || !cacheData) {
    throw new Error('参数错误：维度、缓存键和缓存数据必须有效');
  }

  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(periodStart) || !dateRegex.test(periodEnd)) {
    throw new Error('参数错误：日期格式必须为 YYYY-MM-DD');
  }

  try {
    // 使用 UPSERT 操作（唯一约束是 user_id, profile_id, dimension, period_start）
    const result = await pool.query(
      `INSERT INTO public.timespace_cache 
       (user_id, profile_id, dimension, cache_key, cache_data, period_start, period_end, expires_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id, profile_id, dimension, period_start) 
       DO UPDATE SET 
         cache_key = EXCLUDED.cache_key,
         cache_data = EXCLUDED.cache_data,
         period_end = EXCLUDED.period_end,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()
       RETURNING id`,
      [
        userId,
        profileId,
        dimension,
        cacheKey,
        JSON.stringify(cacheData),
        periodStart,
        periodEnd,
        expiresAt,
      ]
    );

    return {
      success: true,
      message: '缓存保存成功',
      cache_id: result.rows[0].id,
    };
  } catch (error: any) {
    console.error('保存缓存失败:', {
      userId,
      profileId,
      dimension,
      cacheKey,
      error: error.message,
    });

    // 处理数据库错误
    if (error.code === '23503') {
      throw new Error('用户不存在');
    }

    throw new Error(`保存缓存失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 清除缓存数据
 * 
 * @param userId 用户ID
 * @param dimension 维度（可选，如果提供则只清除该维度的缓存）
 * @param cacheKey 缓存键（可选，如果提供则只清除该键的缓存）
 * @returns Promise<number> 清除的记录数
 */
export async function clearTimespaceCache(
  userId: string,
  dimension?: string,
  cacheKey?: string
): Promise<number> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    let query = `
      DELETE FROM public.timespace_cache
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (dimension) {
      query += ` AND dimension = $${params.length + 1}`;
      params.push(dimension);
    }

    if (cacheKey) {
      query += ` AND cache_key = $${params.length + 1}`;
      params.push(cacheKey);
    }

    const result = await pool.query(query, params);

    return result.rowCount || 0;
  } catch (error: any) {
    console.error('清除缓存失败:', { userId, dimension, cacheKey, error: error.message });
    throw new Error(`清除缓存失败: ${error.message || '未知错误'}`);
  }
}

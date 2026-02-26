import { pool } from '../config/database';
import * as coinsService from './coins.service';
import * as llmService from './llm.service';
import { randomUUID } from 'crypto';

/**
 * 紫微斗数服务模块
 * 提供命盘存档、时空资产解锁、缓存查询等功能
 */

/**
 * 命盘结构接口
 */
export interface StarChart {
  profile_id: string;
  chart_structure: any; // JSONB 类型，存储命盘结构数据
  brief_analysis_cache?: any; // JSONB 类型，存储简要分析缓存
  created_at: Date;
  updated_at: Date;
}

/**
 * 保存/更新命盘结果接口
 */
export interface SaveStarChartResult {
  success: boolean;
  message?: string;
  error?: string;
  profile_id?: string;
}

/**
 * 时空资产接口
 */
export interface UnlockedTimeAsset {
  id: string;
  user_id: string;
  profile_id: string;
  dimension: string;
  period_start: string; // date 类型
  period_end: string; // date 类型
  period_type: string;
  unlocked_at: Date;
  expires_at: Date;
  cost_coins: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 解锁时空资产结果接口
 */
export interface UnlockTimeAssetResult {
  success: boolean;
  message?: string;
  error?: string;
  asset_id?: string;
  remaining_balance?: number;
}

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
 * 保存/更新缓存结果接口
 */
export interface SaveCacheResult {
  success: boolean;
  message?: string;
  error?: string;
  cache_id?: string;
}

/**
 * 保存或更新命盘结构
 * 
 * @param userId 用户ID（同时也是profile ID）
 * @param chartStructure 命盘结构数据（JSONB）
 * @param briefAnalysisCache 简要分析缓存（可选，JSONB）
 * @returns Promise<SaveStarChartResult> 保存结果
 * 
 * @throws Error 如果保存失败
 */
export async function saveStarChart(
  userId: string,
  chartStructure: any,
  briefAnalysisCache?: any
): Promise<SaveStarChartResult> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!chartStructure) {
    throw new Error('参数错误：命盘结构数据必须有效');
  }

  const client = await pool.connect();
  
  // 在 try 块外声明 profileId，以便在 catch 块中使用
  let profileId = userId;

  try {
    await client.query('BEGIN');

    // 1. 获取或自动创建 profile_id
    // 🔍 修复：不再只是单纯报错，而是尝试自动修复缺失的 Profile
    // ⚠️ 关键：必须在事务中使用同一个 client 查询，确保事务一致性
    const profileCheck = await client.query(
      'SELECT id FROM public.profiles WHERE id = $1',
      [userId]
    );

    console.log('Profile 检查结果:', {
      userId,
      profileExists: profileCheck.rows.length > 0,
      profileId: profileCheck.rows.length > 0 ? profileCheck.rows[0].id : null,
    });

    if (profileCheck.rows.length === 0) {
      console.log(`⚠️ 用户 ${userId} 缺少 Profile，正在自动修复...`);
      
      // 尝试获取用户邮箱
      let email = `user_${userId.substring(0, 8)}@example.com`;
      let username = `user_${userId.substring(0, 8)}`;
      
      try {
        const userRes = await client.query('SELECT email FROM auth.users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].email) {
          email = userRes.rows[0].email;
          username = email.split('@')[0];
        }
      } catch (userError: any) {
        console.warn(`无法从 auth.users 获取邮箱，使用默认值: ${userError.message}`);
      }

      // 自动插入 Profile 记录
      try {
        await client.query(
          `INSERT INTO public.profiles (id, email, username, role, tier, tianji_coins_balance, created_at, updated_at)
           VALUES ($1, $2, $3, 'user', 'explorer', 0, NOW(), NOW())`,
          [userId, email, username]
        );
        console.log(`✅ 用户 ${userId} Profile 自动修复完成`);
        
        // 验证 Profile 是否真的创建成功
        const verifyCheck = await client.query(
          'SELECT id FROM public.profiles WHERE id = $1',
          [userId]
        );
        if (verifyCheck.rows.length === 0) {
          throw new Error('Profile 创建后验证失败');
        }
      } catch (profileError: any) {
        console.error(`❌ Profile 创建失败:`, {
          userId,
          email,
          username,
          error: profileError.message,
          code: profileError.code,
        });
        // 如果是唯一约束错误，说明 Profile 已经存在（可能是并发创建）
        if (profileError.code === '23505') {
          console.log(`⚠️ Profile 已存在（可能是并发创建），继续执行...`);
        } else {
          // 其他错误，抛出异常
          throw new Error(`无法创建 Profile: ${profileError.message}`);
        }
      }
    }

    // 2. 检查是否已存在命盘记录 (Upsert 逻辑)
    const existing = await client.query(
      'SELECT profile_id FROM public.star_charts WHERE profile_id = $1',
      [profileId]
    );

    if (existing.rows.length > 0) {
      // 更新
      await client.query(
        `UPDATE public.star_charts 
         SET chart_structure = $1, 
             brief_analysis_cache = COALESCE($2, brief_analysis_cache),
             updated_at = NOW()
         WHERE profile_id = $3`,
        [JSON.stringify(chartStructure), briefAnalysisCache ? JSON.stringify(briefAnalysisCache) : null, profileId]
      );
    } else {
      // 插入前再次验证 profileId 是否存在（在事务中）
      const finalProfileCheck = await client.query(
        'SELECT id FROM public.profiles WHERE id = $1',
        [profileId]
      );
      
      if (finalProfileCheck.rows.length === 0) {
        throw new Error(`Profile 不存在：profileId=${profileId}, userId=${userId}`);
      }
      
      console.log('准备插入 star_charts:', {
        profileId,
        profileExists: finalProfileCheck.rows.length > 0,
      });
      
      // 插入
      await client.query(
        `INSERT INTO public.star_charts (profile_id, chart_structure, brief_analysis_cache, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [profileId, JSON.stringify(chartStructure), briefAnalysisCache ? JSON.stringify(briefAnalysisCache) : null]
      );
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: '命盘保存成功',
      profile_id: profileId,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('保存命盘失败:', {
      userId,
      profileId,
      error: error.message,
      errorCode: error.code,
      errorDetail: error.detail,
      errorConstraint: error.constraint,
    });

    // 处理数据库错误
    if (error.code === '23503') {
      // 外键约束违反 - 检查是否是 profile_id 外键问题
      console.error('外键约束违反，检查 profiles 记录:', {
        userId,
        profileId,
        constraint: error.constraint,
      });
      
      // 再次验证 profiles 记录是否存在
      const finalCheck = await pool.query(
        'SELECT id FROM public.profiles WHERE id = $1',
        [profileId]
      );
      
      if (finalCheck.rows.length === 0) {
        throw new Error('用户不存在：profiles 记录不存在');
      } else {
        throw new Error(`外键约束违反：${error.constraint || '未知约束'} - ${error.detail || error.message}`);
      }
    }

    throw new Error(`保存命盘失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 查询命盘结构
 * 
 * @param profileId 用户profile ID
 * @returns Promise<StarChart | null> 命盘数据或 null（不存在）
 */
export async function getStarChart(profileId: string): Promise<StarChart | null> {
  try {
    const result = await pool.query(
      `SELECT 
        profile_id,
        chart_structure,
        brief_analysis_cache,
        created_at,
        updated_at
      FROM public.star_charts
      WHERE profile_id = $1`,
      [profileId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      profile_id: row.profile_id,
      chart_structure: typeof row.chart_structure === 'string' 
        ? JSON.parse(row.chart_structure) 
        : row.chart_structure,
      brief_analysis_cache: row.brief_analysis_cache
        ? (typeof row.brief_analysis_cache === 'string'
            ? JSON.parse(row.brief_analysis_cache)
            : row.brief_analysis_cache)
        : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('查询命盘失败:', {
      profileId,
      error: error.message,
    });
    throw new Error(`查询命盘失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 更新简要分析缓存
 * 
 * @param profileId 用户profile ID
 * @param briefAnalysisCache 简要分析缓存数据（JSONB）
 * @returns Promise<SaveStarChartResult> 更新结果
 * 
 * @throws Error 如果更新失败
 */
export async function updateBriefAnalysisCache(
  profileId: string,
  briefAnalysisCache: any
): Promise<SaveStarChartResult> {
  // 参数验证
  if (!profileId) {
    throw new Error('参数错误：profile ID必须有效');
  }

  if (!briefAnalysisCache) {
    throw new Error('参数错误：简要分析缓存数据必须有效');
  }

  try {
    const result = await pool.query(
      `UPDATE public.star_charts
       SET brief_analysis_cache = $1, updated_at = NOW()
       WHERE profile_id = $2
       RETURNING profile_id`,
      [JSON.stringify(briefAnalysisCache), profileId]
    );

    if (result.rows.length === 0) {
      throw new Error('命盘不存在，请先保存命盘');
    }

    return {
      success: true,
      message: '简要分析缓存更新成功',
      profile_id: result.rows[0].profile_id,
    };
  } catch (error: any) {
    console.error('更新简要分析缓存失败:', {
      profileId,
      error: error.message,
    });

    if (error.message?.includes('命盘不存在')) {
      throw error;
    }

    throw new Error(`更新简要分析缓存失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 解锁时空资产（需要扣费）
 * 
 * @param userId 用户ID
 * @param profileId 用户profile ID
 * @param dimension 维度（如 'year', 'month', 'day' 等）
 * @param periodStart 时间段开始日期（YYYY-MM-DD）
 * @param periodEnd 时间段结束日期（YYYY-MM-DD）
 * @param periodType 时间段类型（如 'year', 'month', 'day' 等）
 * @param expiresAt 过期时间
 * @param costCoins 消耗的天机币数量（可选，默认10）
 * @returns Promise<UnlockTimeAssetResult> 解锁结果
 * 
 * @throws Error 如果解锁失败（余额不足、已解锁等）
 */
export async function unlockTimeAsset(
  userId: string,
  profileId: string,
  dimension: 'daily' | 'monthly' | 'yearly', // 只允许这三个值
  periodStart: string,
  periodEnd: string,
  periodType: 'day' | 'month' | 'year', // 只允许这三个值
  expiresAt: Date,
  costCoins: number = 10
): Promise<UnlockTimeAssetResult> {
  // 参数验证
  if (!userId || !profileId) {
    throw new Error('参数错误：用户ID和profile ID必须有效');
  }

  if (!dimension || !periodStart || !periodEnd || !periodType) {
    throw new Error('参数错误：维度、时间段和类型必须有效');
  }

  if (costCoins <= 0) {
    throw new Error('参数错误：消耗的天机币数量必须大于0');
  }

  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(periodStart) || !dateRegex.test(periodEnd)) {
    throw new Error('参数错误：日期格式必须为 YYYY-MM-DD');
  }

  // 检查用户是否存在
  const userCheck = await pool.query(
    'SELECT id FROM public.profiles WHERE id = $1 AND id = $2',
    [profileId, userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('用户不存在或profile ID不匹配');
  }

  // 检查是否已经解锁（相同维度、时间段）
  const existingCheck = await pool.query(
    `SELECT id FROM public.unlocked_time_assets
     WHERE user_id = $1 
       AND profile_id = $2
       AND dimension = $3
       AND period_start = $4
       AND period_end = $5
       AND is_active = true`,
    [userId, profileId, dimension, periodStart, periodEnd]
  );

  if (existingCheck.rows.length > 0) {
    throw new Error('该时间段已解锁');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 扣费（调用天机币服务）
    const deductResult = await coinsService.deductCoins(
      userId,
      'time_asset_unlock',
      costCoins
    );

    if (!deductResult.success) {
      await client.query('ROLLBACK');
      throw new Error(deductResult.message || '扣费失败');
    }

    // 2. 创建解锁记录
    const insertResult = await client.query(
      `INSERT INTO public.unlocked_time_assets 
       (user_id, profile_id, dimension, period_start, period_end, period_type, expires_at, cost_coins, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING id`,
      [userId, profileId, dimension, periodStart, periodEnd, periodType, expiresAt, costCoins]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: '时空资产解锁成功',
      asset_id: insertResult.rows[0].id,
      remaining_balance: deductResult.remaining_balance,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    console.error('解锁时空资产失败:', {
      userId,
      profileId,
      dimension,
      periodStart,
      periodEnd,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('已解锁') ||
        error.message?.includes('余额不足') ||
        error.message?.includes('扣费失败') ||
        error.message?.includes('参数错误')) {
      throw error;
    }

    // 处理数据库唯一约束错误
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      throw new Error('该时间段已解锁');
    }

    throw new Error(`解锁时空资产失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 查询已解锁的时空资产
 * 
 * @param userId 用户ID
 * @param profileId 用户profile ID（可选，如果提供则只查询该profile的资产）
 * @param dimension 维度（可选，如果提供则只查询该维度的资产）
 * @param limit 返回记录数限制（可选，默认50）
 * @param offset 偏移量（可选，默认0）
 * @returns Promise<UnlockedTimeAsset[]> 已解锁的时空资产列表
 */
export async function getUnlockedTimeAssets(
  userId: string,
  profileId?: string,
  dimension?: string,
  limit: number = 50,
  offset: number = 0
): Promise<UnlockedTimeAsset[]> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (limit < 1 || limit > 100) {
    throw new Error('参数错误：limit 必须在 1-100 之间');
  }

  if (offset < 0) {
    throw new Error('参数错误：offset 不能为负数');
  }

  try {
    let query = `
      SELECT 
        id,
        user_id,
        profile_id,
        dimension,
        period_start,
        period_end,
        period_type,
        unlocked_at,
        expires_at,
        cost_coins,
        is_active,
        created_at,
        updated_at
      FROM public.unlocked_time_assets
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (profileId) {
      query += ` AND profile_id = $${paramIndex}`;
      params.push(profileId);
      paramIndex++;
    }

    if (dimension) {
      query += ` AND dimension = $${paramIndex}`;
      params.push(dimension);
      paramIndex++;
    }

    // 只查询激活的资产
    query += ` AND is_active = true`;

    // 按解锁时间倒序排列
    query += ` ORDER BY unlocked_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      dimension: row.dimension,
      period_start: row.period_start,
      period_end: row.period_end,
      period_type: row.period_type,
      unlocked_at: row.unlocked_at,
      expires_at: row.expires_at,
      cost_coins: row.cost_coins,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('查询已解锁时空资产失败:', {
      userId,
      profileId,
      dimension,
      error: error.message,
    });
    throw new Error(`查询已解锁时空资产失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查某个时间段是否已解锁
 * 
 * @param userId 用户ID
 * @param profileId 用户profile ID
 * @param dimension 维度
 * @param periodStart 时间段开始日期（YYYY-MM-DD）
 * @param periodEnd 时间段结束日期（YYYY-MM-DD）
 * @returns Promise<boolean> 是否已解锁
 */
export async function isTimeAssetUnlocked(
  userId: string,
  profileId: string,
  dimension: string,
  periodStart: string,
  periodEnd: string
): Promise<boolean> {
  // 参数验证
  if (!userId || !profileId || !dimension || !periodStart || !periodEnd) {
    return false;
  }

  try {
    const result = await pool.query(
      `SELECT id FROM public.unlocked_time_assets
       WHERE user_id = $1 
         AND profile_id = $2
         AND dimension = $3
         AND period_start = $4
         AND period_end = $5
         AND is_active = true
         AND expires_at > NOW()`,
      [userId, profileId, dimension, periodStart, periodEnd]
    );

    return result.rows.length > 0;
  } catch (error: any) {
    console.error('检查时空资产解锁状态失败:', {
      userId,
      profileId,
      dimension,
      periodStart,
      periodEnd,
      error: error.message,
    });
    return false;
  }
}

/**
 * 保存或更新缓存数据
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
 * 
 * @throws Error 如果保存失败
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
 * 查询缓存数据
 * 
 * @param userId 用户ID
 * @param profileId 用户profile ID（保留参数以兼容接口，但实际查询中不使用）
 * @param dimension 维度
 * @param cacheKey 缓存键
 * @param periodStart 时间段开始日期（YYYY-MM-DD，可选）
 * @param periodEnd 时间段结束日期（YYYY-MM-DD，可选）
 * @returns Promise<TimespaceCache | null> 缓存数据或 null（不存在或已过期）
 */
export async function getTimespaceCache(
  userId: string,
  profileId: string,
  dimension: string,
  cacheKey: string,
  periodStart?: string,
  periodEnd?: string
): Promise<TimespaceCache | null> {
  // 参数验证
  if (!userId || !dimension || !cacheKey) {
    throw new Error('参数错误：用户ID、维度和缓存键必须有效');
  }

  try {
    // 🔍 修复：移除 AND profile_id = $2 条件
    // 原因：user_id 已经确定了归属，profile_id 通常等于 user_id，双重检查容易因为微小差异导致查不到
    let query = `
      SELECT 
        id, user_id, profile_id, dimension, cache_key, cache_data, 
        period_start, period_end, expires_at, created_at, updated_at
      FROM public.timespace_cache
      WHERE user_id = $1
        AND dimension = $2
        AND cache_key = $3
    `;

    // 参数只需 user_id, dimension, cache_key
    // 注意：这里去掉了 profileId 参数的使用，因为它是多余的
    const params: any[] = [userId, dimension, cacheKey];

    if (periodStart) {
      // 🔍 修复：强制转换日期类型，防止字符串比对失败
      query += ` AND period_start = $${params.length + 1}::date`; 
      params.push(periodStart);
    }

    if (periodEnd) {
      query += ` AND period_end = $${params.length + 1}::date`;
      params.push(periodEnd);
    }

    // 确保不过期
    query += ` AND expires_at > NOW()`;
    query += ` ORDER BY created_at DESC LIMIT 1`;

    // 🔍 调试日志：记录查询参数
    console.log('查询缓存参数:', {
      userId,
      dimension,
      cacheKey,
      periodStart,
      periodEnd,
      queryParams: params,
    });

    const result = await pool.query(query, params);

    // 🔍 调试日志：记录查询结果
    console.log('查询缓存结果:', {
      rowCount: result.rows.length,
      firstRow: result.rows.length > 0 ? {
        id: result.rows[0].id,
        expires_at: result.rows[0].expires_at,
        now: new Date(),
        isExpired: result.rows[0].expires_at ? new Date(result.rows[0].expires_at) <= new Date() : false,
      } : null,
    });

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
      // 处理 JSON 字段可能的字符串情况
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
 * 删除过期缓存（清理任务）
 * 
 * @returns Promise<number> 删除的记录数
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const result = await pool.query(
      `DELETE FROM public.timespace_cache
       WHERE expires_at < NOW()`
    );

    return result.rowCount || 0;
  } catch (error: any) {
    console.error('清理过期缓存失败:', error.message);
    throw new Error(`清理过期缓存失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 关系类型
 * ⚠️ 重要：'self' 是特殊标记，表示"我的命盘"，每个用户只能有一个
 */
export type RelationshipType = 
  | 'self'         // 我的命盘（特殊标记）
  | 'lover'        // 爱人
  | 'child'        // 孩子
  | 'parent'       // 父母
  | 'bestie'       // 闺蜜
  | 'sibling'      // 兄弟
  | 'friend'       // 朋友
  | 'colleague'    // 同事
  | 'celebrity'    // 名人
  | 'custom';      // 自定义

/**
 * 命盘存档接口（完整数据）
 * ⚠️ 注意：列表查询返回摘要（ChartArchiveSummary），详情查询返回完整数据（ChartArchive）
 */
export interface ChartArchive {
  id: string;
  user_id: string;                      // ✅ 统一使用 snake_case
  chart: any;                          // 完整命盘数据（ZiweiChart）
  name: string;
  relationship_type: RelationshipType;   // ✅ 统一使用 snake_case
  custom_label?: string;                // ✅ 统一使用 snake_case
  notes?: string;
  tags?: string[];
  created_at: Date | string;            // ✅ 统一使用 snake_case
  updated_at: Date | string;            // ✅ 统一使用 snake_case
}

/**
 * 命盘存档摘要接口（列表查询使用，不包含完整命盘数据）
 * ⚠️ 性能优化：列表查询只返回摘要，不包含完整命盘数据
 */
export interface ChartArchiveSummary {
  id: string;
  user_id: string;                      // ✅ 统一使用 snake_case
  name: string;
  relationship_type: RelationshipType;   // ✅ 统一使用 snake_case
  custom_label?: string;                // ✅ 统一使用 snake_case
  birth_info: any;                      // ✅ 统一使用 snake_case，只包含出生信息，不包含完整命盘
  notes?: string;
  tags?: string[];
  created_at: Date | string;            // ✅ 统一使用 snake_case
  updated_at: Date | string;            // ✅ 统一使用 snake_case
}

/**
 * 保存命盘存档结果接口
 */
export interface SaveArchiveResult {
  success: boolean;
  message?: string;
  error?: string;
  archive_id?: string;                  // ✅ 统一使用 snake_case
}

/**
 * 分析会话接口
 */
export interface AnalysisSession {
  id: string;
  user_id: string;
  profile_id: string;
  session_data: any; // JSONB 类型，存储分析会话数据
  created_at: Date;
  updated_at: Date;
}

/**
 * 保存分析会话结果接口
 */
export interface SaveAnalysisSessionResult {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

/**
 * 查询命盘存档列表（返回摘要，不包含完整命盘数据）
 * ⚠️ 性能优化：只返回摘要信息，不包含完整命盘数据
 * 
 * @param userId 用户ID
 * @param relationshipType 关系类型筛选（可选）
 * @param keyword 搜索关键词（匹配名称、备注、标签）（可选）
 * @param limit 分页大小（可选，默认50，最大100）
 * @param offset 分页偏移（可选，默认0）
 * @returns Promise<{ archives: ChartArchiveSummary[], total: number }> 存档摘要列表与总数
 * 
 * @throws Error 如果查询失败
 */
export async function getChartArchives(
  userId: string,
  relationshipType?: RelationshipType,
  keyword?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ archives: ChartArchiveSummary[]; total: number }> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (limit < 1 || limit > 100) {
    throw new Error('参数错误：limit 必须在 1-100 范围内');
  }
  if (offset < 0) {
    throw new Error('参数错误：offset 必须 >= 0');
  }

  try {
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ziwei_chart_archives'
      )`
    );

    if (!tableExists.rows[0].exists) {
      console.warn('ziwei_chart_archives 表不存在，返回空列表');
      return { archives: [], total: 0 };
    }

    // 构建查询条件
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramIndex = 2;

    // 关系类型筛选
    if (relationshipType) {
      conditions.push(`relationship_type = $${paramIndex}`);
      params.push(relationshipType);
      paramIndex++;
    }

    // 关键词搜索（匹配名称、备注、标签）
    if (keyword && keyword.trim()) {
      const keywordPattern = `%${keyword.trim()}%`;
      conditions.push(`(
        name ILIKE $${paramIndex} OR 
        notes ILIKE $${paramIndex} OR 
        custom_label ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(tags) AS tag 
          WHERE tag ILIKE $${paramIndex}
        )
      )`);
      params.push(keywordPattern);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.ziwei_chart_archives ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        name,
        relationship_type,
        custom_label,
        birth_info,
        notes,
        tags,
        created_at,
        updated_at
      FROM public.ziwei_chart_archives
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const archives = result.rows.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,              // ✅ 统一使用 snake_case
      name: row.name,
      relationship_type: row.relationship_type as RelationshipType,  // ✅ 统一使用 snake_case
      custom_label: row.custom_label || undefined,  // ✅ 统一使用 snake_case
      birth_info: typeof row.birth_info === 'string'   // ✅ 统一使用 snake_case
        ? JSON.parse(row.birth_info) 
        : row.birth_info,
      notes: row.notes || undefined,
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : undefined,
      created_at: row.created_at,        // ✅ 统一使用 snake_case
      updated_at: row.updated_at,        // ✅ 统一使用 snake_case
    }));
    return { archives, total };
  } catch (error: any) {
    console.error('查询命盘存档失败:', {
      userId,
      relationshipType,
      keyword,
      error: error.message,
    });
    throw new Error(`查询命盘存档失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 验证 BirthInfo 数据
 * ⚠️ 重要：hour 是时辰索引（0-11），不是24小时制！
 */
function validateBirthInfo(birthInfo: any): void {
  if (!birthInfo) {
    throw new Error('参数错误：出生信息 (birthInfo) 必须提供');
  }

  // 验证必填字段
  if (typeof birthInfo.year !== 'number' || birthInfo.year < 1800 || birthInfo.year > 2100) {
    throw new Error('参数错误：出生年份必须在 1800-2100 范围内');
  }

  if (typeof birthInfo.month !== 'number' || birthInfo.month < 1 || birthInfo.month > 12) {
    throw new Error('参数错误：出生月份必须在 1-12 范围内');
  }

  if (typeof birthInfo.day !== 'number' || birthInfo.day < 1 || birthInfo.day > 31) {
    throw new Error('参数错误：出生日期必须在 1-31 范围内');
  }

  // ⚠️ 关键验证：hour 是时辰索引（0-11），不是24小时制！
  if (typeof birthInfo.hour !== 'number' || birthInfo.hour < 0 || birthInfo.hour > 11) {
    throw new Error('参数错误：时辰索引 (hour) 必须在 0-11 范围内（0=子时, 1=丑时, ..., 11=亥时）');
  }

  if (!['male', 'female'].includes(birthInfo.gender)) {
    throw new Error('参数错误：性别必须是 "male" 或 "female"');
  }
}

/**
 * 从命盘数据中提取出生信息
 */
function extractBirthInfo(chart: any): any {
  if (!chart || !chart.birthInfo) {
    throw new Error('参数错误：命盘数据必须包含出生信息 (birthInfo)');
  }
  return chart.birthInfo;
}

/**
 * 保存命盘存档
 * ⚠️ 重要：如果 relationshipType === 'self'，每个用户只能有一个，创建时应该更新而不是新建
 * 
 * @param userId 用户ID
 * @param profileId Profile ID
 * @param chart 完整命盘数据（ZiweiChart）
 * @param name 存档名称（必填，需要 trim）
 * @param relationshipType 关系类型（必填）
 * @param customLabel 自定义标签（可选）
 * @param notes 备注（可选）
 * @param tags 标签列表（可选）
 * @returns Promise<SaveArchiveResult> 保存结果
 * 
 * @throws Error 如果保存失败
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveChartArchive(
  userId: string,
  profileId: string,
  chart: any,
  name: string,
  relationshipType: RelationshipType,
  customLabel?: string,
  notes?: string,
  tags?: string[],
  id?: string
): Promise<SaveArchiveResult> {
  if (!userId || !profileId || !chart || !name || !relationshipType) {
    throw new Error('参数错误：用户ID、Profile ID、命盘数据、存档名称和关系类型必须有效');
  }
  if (id !== undefined && id !== null && id !== '' && !UUID_REGEX.test(id)) {
    throw new Error('参数错误：id 必须是有效的 UUID 格式');
  }
  const requestedId = id && UUID_REGEX.test(id) ? id : null;

  // 验证关系类型
  const validRelationshipTypes: RelationshipType[] = [
    'self', 'lover', 'child', 'parent', 'bestie', 
    'sibling', 'friend', 'colleague', 'celebrity', 'custom'
  ];
  if (!validRelationshipTypes.includes(relationshipType)) {
    throw new Error(`参数错误：关系类型必须是以下之一: ${validRelationshipTypes.join(', ')}`);
  }

  // 验证并提取出生信息
  const birthInfo = extractBirthInfo(chart);
  validateBirthInfo(birthInfo);

  // 验证名称（trim 后不能为空）
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('参数错误：存档名称不能为空');
  }

  // 如果 relationshipType === 'custom'，建议提供 customLabel
  if (relationshipType === 'custom' && !customLabel) {
    console.warn('建议：relationshipType 为 "custom" 时，提供 customLabel 以便识别');
  }

  const client = await pool.connect();
  let archiveId: string = '';
  try {
    await client.query('BEGIN');

    // 检查表是否存在，如果不存在则创建
    const tableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ziwei_chart_archives'
      )`
    );

    if (!tableExists.rows[0].exists) {
      // 创建表（按照规范文档的表结构）
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.ziwei_chart_archives (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          name TEXT NOT NULL,
          relationship_type TEXT NOT NULL,
          custom_label TEXT,
          notes TEXT,
          tags JSONB DEFAULT '[]'::jsonb,
          birth_info JSONB NOT NULL,
          chart_structure JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT ziwei_chart_archives_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
          -- ⚠️ 唯一约束：每个用户只能有一个"我的命盘"
          CONSTRAINT unique_self_archive UNIQUE (user_id, relationship_type) 
            WHERE relationship_type = 'self'
        )
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_archives_user_id 
        ON public.ziwei_chart_archives(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_archives_relationship_type 
        ON public.ziwei_chart_archives(relationship_type)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_archives_created_at 
        ON public.ziwei_chart_archives(created_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_archives_tags 
        ON public.ziwei_chart_archives USING GIN(tags)
      `);
    }

    // ⚠️ 关键逻辑："我的命盘"特殊处理
    // 如果 relationshipType === 'self'，检查是否已存在，存在则更新，不存在则创建
    if (relationshipType === 'self') {
      const existingResult = await client.query(
        `SELECT id FROM public.ziwei_chart_archives
         WHERE user_id = $1 AND relationship_type = 'self'
         FOR UPDATE`,
        [userId]
      );

      if (existingResult.rows.length > 0) {
        // 更新现有记录
        const existingId = existingResult.rows[0].id;
        await client.query(
          `UPDATE public.ziwei_chart_archives
           SET name = $1,
               custom_label = $2,
               notes = $3,
               tags = $4,
               birth_info = $5,
               chart_structure = $6,
               updated_at = NOW()
           WHERE id = $7`,
          [
            trimmedName,
            customLabel || null,
            notes || null,
            JSON.stringify(tags || []),
            JSON.stringify(birthInfo),
            JSON.stringify(chart),
            existingId,
          ]
        );

        await client.query('COMMIT');

        return {
          success: true,
          message: '我的命盘更新成功',
          archive_id: existingId,        // ✅ 统一使用 snake_case
        };
      }
    }

    archiveId = requestedId || randomUUID();
    await client.query(
      `INSERT INTO public.ziwei_chart_archives 
       (id, user_id, name, relationship_type, custom_label, notes, tags, birth_info, chart_structure, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        archiveId,
        userId,
        trimmedName,
        relationshipType,
        customLabel || null,
        notes || null,
        JSON.stringify(tags || []),
        JSON.stringify(birthInfo),
        JSON.stringify(chart),
      ]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: '命盘存档保存成功',
      archive_id: archiveId,             // ✅ 统一使用 snake_case
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505' && error.constraint === 'ziwei_chart_archives_pkey') {
      return {
        success: true,
        message: '命盘存档已存在',
        archive_id: archiveId,
      };
    }
    if (error.code === '23505' && error.constraint === 'unique_self_archive') {
      // 如果是因为唯一约束冲突，尝试更新
      if (relationshipType === 'self') {
        try {
          await client.query('BEGIN');
          const updateResult = await client.query(
            `UPDATE public.ziwei_chart_archives
             SET name = $1,
                 custom_label = $2,
                 notes = $3,
                 tags = $4,
                 birth_info = $5,
                 chart_structure = $6,
                 updated_at = NOW()
             WHERE user_id = $7 AND relationship_type = 'self'
             RETURNING id`,
            [
              trimmedName,
              customLabel || null,
              notes || null,
              JSON.stringify(tags || []),
              JSON.stringify(birthInfo),
              JSON.stringify(chart),
              userId,
            ]
          );
          await client.query('COMMIT');
          
          if (updateResult.rows.length > 0) {
            return {
              success: true,
              message: '我的命盘更新成功',
              archive_id: updateResult.rows[0].id,  // ✅ 统一使用 snake_case
            };
          }
        } catch (updateError: any) {
          await client.query('ROLLBACK');
          throw updateError;
        }
      }
    }

    console.error('保存命盘存档失败:', {
      userId,
      profileId,
      relationshipType,
      error: error.message,
      code: error.code,
    });
    throw new Error(`保存命盘存档失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 查询单个命盘存档（返回完整数据）
 * 
 * @param userId 用户ID
 * @param archiveId 存档ID
 * @returns Promise<ChartArchive | null> 存档数据或 null（不存在）
 * 
 * @throws Error 如果查询失败
 */
export async function getChartArchive(
  userId: string,
  archiveId: string
): Promise<ChartArchive | null> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和存档ID必须有效');
  }

  try {
    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        name,
        relationship_type,
        custom_label,
        notes,
        tags,
        chart_structure,
        created_at,
        updated_at
      FROM public.ziwei_chart_archives
      WHERE id = $1 AND user_id = $2`,
      [archiveId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,              // ✅ 统一使用 snake_case
      chart: typeof row.chart_structure === 'string' 
        ? JSON.parse(row.chart_structure) 
        : row.chart_structure,
      name: row.name,
      relationship_type: row.relationship_type as RelationshipType,  // ✅ 统一使用 snake_case
      custom_label: row.custom_label || undefined,  // ✅ 统一使用 snake_case
      notes: row.notes || undefined,
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : undefined,
      created_at: row.created_at,        // ✅ 统一使用 snake_case
      updated_at: row.updated_at,        // ✅ 统一使用 snake_case
    };
  } catch (error: any) {
    console.error('查询命盘存档失败:', {
      userId,
      archiveId,
      error: error.message,
    });
    throw new Error(`查询命盘存档失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 更新命盘存档
 * 
 * @param userId 用户ID
 * @param archiveId 存档ID
 * @param updates 更新数据（部分字段）
 * @returns Promise<ChartArchive> 更新后的存档数据
 * 
 * @throws Error 如果更新失败
 */
export async function updateChartArchive(
  userId: string,
  archiveId: string,
  updates: {
    name?: string;
    relationship_type?: RelationshipType;  // ✅ 统一使用 snake_case（同时支持 relationshipType 以兼容）
    relationshipType?: RelationshipType;   // 兼容旧代码
    custom_label?: string;                // ✅ 统一使用 snake_case（同时支持 customLabel 以兼容）
    customLabel?: string;                 // 兼容旧代码
    notes?: string;
    tags?: string[];
    chart?: any;  // 可选：更新命盘数据
  }
): Promise<ChartArchive> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和存档ID必须有效');
  }

  // 验证关系类型（如果提供，支持两种格式）
  const relationshipType = updates.relationship_type || updates.relationshipType;
  if (relationshipType) {
    const validRelationshipTypes: RelationshipType[] = [
      'self', 'lover', 'child', 'parent', 'bestie', 
      'sibling', 'friend', 'colleague', 'celebrity', 'custom'
    ];
    if (!validRelationshipTypes.includes(relationshipType)) {
      throw new Error(`参数错误：关系类型必须是以下之一: ${validRelationshipTypes.join(', ')}`);
    }
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 先查询现有记录，验证权限
    const existingResult = await client.query(
      `SELECT * FROM public.ziwei_chart_archives
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [archiveId, userId]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('存档不存在或无权更新');
    }

    const existing = existingResult.rows[0];
    const existingChart = typeof existing.chart_structure === 'string' 
      ? JSON.parse(existing.chart_structure) 
      : existing.chart_structure;
    const existingBirthInfo = typeof existing.birth_info === 'string' 
      ? JSON.parse(existing.birth_info) 
      : existing.birth_info;

    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('参数错误：存档名称不能为空');
      }
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(trimmedName);
      paramIndex++;
    }

    // 支持两种格式：snake_case 和 camelCase（兼容）
    const relationshipType = updates.relationship_type || updates.relationshipType;
    if (relationshipType !== undefined) {
      updateFields.push(`relationship_type = $${paramIndex}`);
      updateValues.push(relationshipType);
      paramIndex++;
    }

    const customLabel = updates.custom_label || updates.customLabel;
    if (customLabel !== undefined) {
      updateFields.push(`custom_label = $${paramIndex}`);
      updateValues.push(customLabel || null);
      paramIndex++;
    }

    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(updates.notes || null);
      paramIndex++;
    }

    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.tags));
      paramIndex++;
    }

    // 如果更新命盘数据，需要同时更新 birth_info
    if (updates.chart !== undefined) {
      const birthInfo = extractBirthInfo(updates.chart);
      validateBirthInfo(birthInfo);
      
      updateFields.push(`chart_structure = $${paramIndex}`);
      updateValues.push(JSON.stringify(updates.chart));
      paramIndex++;
      
      updateFields.push(`birth_info = $${paramIndex}`);
      updateValues.push(JSON.stringify(birthInfo));
      paramIndex++;
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('参数错误：至少需要提供一个更新字段');
    }

    // 添加 updated_at
    updateFields.push(`updated_at = NOW()`);

    // 执行更新
    updateValues.push(archiveId, userId);
    await client.query(
      `UPDATE public.ziwei_chart_archives
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
      updateValues
    );

    // 重新查询更新后的数据
    const updatedResult = await client.query(
      `SELECT * FROM public.ziwei_chart_archives
       WHERE id = $1 AND user_id = $2`,
      [archiveId, userId]
    );

    await client.query('COMMIT');

    const row = updatedResult.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,              // ✅ 统一使用 snake_case
      chart: typeof row.chart_structure === 'string' 
        ? JSON.parse(row.chart_structure) 
        : row.chart_structure,
      name: row.name,
      relationship_type: row.relationship_type as RelationshipType,  // ✅ 统一使用 snake_case
      custom_label: row.custom_label || undefined,  // ✅ 统一使用 snake_case
      notes: row.notes || undefined,
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : undefined,
      created_at: row.created_at,        // ✅ 统一使用 snake_case
      updated_at: row.updated_at,        // ✅ 统一使用 snake_case
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('更新命盘存档失败:', {
      userId,
      archiveId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 删除命盘存档
 * ⚠️ 重要：如果删除的是"我的命盘"（relationshipType === 'self'），需要同时清理相关数据源
 * 
 * @param userId 用户ID
 * @param archiveId 存档ID
 * @returns Promise<{ success: boolean; message?: string }> 删除结果
 * 
 * @throws Error 如果删除失败
 */
export async function deleteChartArchive(
  userId: string,
  archiveId: string
): Promise<{ success: boolean; message?: string }> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和存档ID必须有效');
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 先查询存档信息，确认是否存在且有权删除
    const archiveResult = await client.query(
      `SELECT relationship_type FROM public.ziwei_chart_archives
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [archiveId, userId]
    );

    if (archiveResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('存档不存在或无权删除');
    }

    const relationshipType = archiveResult.rows[0].relationship_type;

    // 删除存档
    await client.query(
      `DELETE FROM public.ziwei_chart_archives
       WHERE id = $1 AND user_id = $2`,
      [archiveId, userId]
    );

    // ⚠️ 特殊处理：如果删除的是"我的命盘"，需要同时清理相关数据源
    if (relationshipType === 'self') {
      // 1. 清除 star_charts 表
      await client.query(
        `DELETE FROM public.star_charts WHERE profile_id = $1`,
        [userId]
      );

      // 2. 清除 unlocked_time_assets 表
      await client.query(
        `DELETE FROM public.unlocked_time_assets WHERE user_id = $1`,
        [userId]
      );

      // 3. 清除 timespace_cache 表
      await client.query(
        `DELETE FROM public.timespace_cache WHERE user_id = $1`,
        [userId]
      );

      // 4. 清除 analysis_sessions 表（如果存在）
      const analysisTableExists = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'analysis_sessions'
        )`
      );
      if (analysisTableExists.rows[0].exists) {
        await client.query(
          `DELETE FROM public.analysis_sessions WHERE user_id = $1`,
          [userId]
        );
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: relationshipType === 'self' 
        ? '我的命盘及相关数据已删除' 
        : '命盘存档删除成功',
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('删除命盘存档失败:', {
      userId,
      archiveId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 清除命盘数据（清除多个数据源）
 * 
 * @param userId 用户ID
 * @returns Promise<{ success: boolean; message?: string; cleared: string[] }> 清除结果
 * 
 * @throws Error 如果清除失败
 */
export async function clearChartData(
  userId: string
): Promise<{ success: boolean; message?: string; cleared: string[] }> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  const client = await pool.connect();
  const cleared: string[] = [];

  try {
    await client.query('BEGIN');

    // 1. 清除 star_charts 表
    const starChartResult = await client.query(
      `DELETE FROM public.star_charts WHERE profile_id = $1`,
      [userId]
    );
    if (starChartResult.rowCount && starChartResult.rowCount > 0) {
      cleared.push(`star_charts (${starChartResult.rowCount} 条记录)`);
    }

    // 2. 清除 ziwei_chart_archives 表（如果存在）
    const archiveTableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ziwei_chart_archives'
      )`
    );
    if (archiveTableExists.rows[0].exists) {
      const archiveResult = await client.query(
        `DELETE FROM public.ziwei_chart_archives WHERE user_id = $1`,
        [userId]
      );
      if (archiveResult.rowCount && archiveResult.rowCount > 0) {
        cleared.push(`ziwei_chart_archives (${archiveResult.rowCount} 条记录)`);
      }
    }

    // 3. 清除 unlocked_time_assets 表
    const timeAssetResult = await client.query(
      `DELETE FROM public.unlocked_time_assets WHERE user_id = $1`,
      [userId]
    );
    if (timeAssetResult.rowCount && timeAssetResult.rowCount > 0) {
      cleared.push(`unlocked_time_assets (${timeAssetResult.rowCount} 条记录)`);
    }

    // 4. 清除 timespace_cache 表
    const cacheResult = await client.query(
      `DELETE FROM public.timespace_cache WHERE user_id = $1`,
      [userId]
    );
    if (cacheResult.rowCount && cacheResult.rowCount > 0) {
      cleared.push(`timespace_cache (${cacheResult.rowCount} 条记录)`);
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: '命盘数据清除成功',
      cleared,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('清除命盘数据失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`清除命盘数据失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 保存分析会话
 * 
 * @param userId 用户ID
 * @param profileId 命盘ID（对应存档或档案）
 * @param sessionData 分析会话数据（JSONB）
 * @returns Promise<SaveAnalysisSessionResult> 保存结果
 * 
 * @throws Error 如果保存失败
 */
export async function saveAnalysisSession(
  userId: string,
  profileId: string,
  sessionData: any
): Promise<SaveAnalysisSessionResult> {
  // 参数验证
  if (!userId || !profileId) {
    throw new Error('参数错误：用户ID和命盘ID必须有效');
  }

  if (!sessionData) {
    throw new Error('参数错误：分析会话数据必须有效');
  }

  // 从 sessionData 中提取 targetScope（支持 camelCase 和 snake_case）
  const targetScope = sessionData?.targetScope || sessionData?.target_scope;
  
  if (!targetScope) {
    throw new Error('参数错误：sessionData.targetScope 或 sessionData.target_scope 不能为空');
  }

  const profileCheck = await pool.query(
    'SELECT id FROM public.profiles WHERE id = $1',
    [profileId]
  );
  if (profileCheck.rows.length === 0) {
    if (profileId === userId) {
      let email = `user_${userId.substring(0, 8)}@example.com`;
      let username = `user_${userId.substring(0, 8)}`;
      try {
        const userRes = await pool.query('SELECT email FROM auth.users WHERE id = $1', [userId]);
        if (userRes.rows.length > 0 && userRes.rows[0].email) {
          email = userRes.rows[0].email;
          username = email.split('@')[0];
        }
      } catch (_) {}
      try {
        await pool.query(
          `INSERT INTO public.profiles (id, email, username, role, tier, tianji_coins_balance, created_at, updated_at)
           VALUES ($1, $2, $3, 'user', 'explorer', 0, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [userId, email, username]
        );
      } catch (e: any) {
        if (e.code !== '23505') throw e;
      }
    } else {
      throw new Error(`参数错误：命盘ID不存在（profileId: ${profileId}）。提示：如果这是"我的命盘"，请使用 userId 作为 profileId`);
    }
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 检查表是否存在，如果不存在则创建
    const tableExists = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analysis_sessions'
      )`
    );

    if (!tableExists.rows[0].exists) {
      // 创建表（包含 target_scope 字段）
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.analysis_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          profile_id UUID NOT NULL,
          target_scope VARCHAR(255) NOT NULL,
          session_data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      // 创建索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id 
        ON public.analysis_sessions(user_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analysis_sessions_profile_id 
        ON public.analysis_sessions(profile_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at 
        ON public.analysis_sessions(created_at DESC)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_analysis_sessions_target_scope 
        ON public.analysis_sessions(target_scope)
      `);
    } else {
      // 表已存在，检查并添加缺失的字段
      
      // 检查 session_data 字段
      const sessionDataExists = await client.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'analysis_sessions' 
            AND column_name = 'session_data'
        )`
      );

      if (!sessionDataExists.rows[0].exists) {
        // 添加缺失的 session_data 字段
        await client.query(`
          ALTER TABLE public.analysis_sessions 
          ADD COLUMN session_data JSONB NOT NULL DEFAULT '{}'::jsonb
        `);
        
        // 移除默认值
        await client.query(`
          ALTER TABLE public.analysis_sessions 
          ALTER COLUMN session_data DROP DEFAULT
        `);
      }

      // 检查 target_scope 字段
      const targetScopeExists = await client.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'analysis_sessions' 
            AND column_name = 'target_scope'
        )`
      );

      if (!targetScopeExists.rows[0].exists) {
        // 添加缺失的 target_scope 字段
        await client.query(`
          ALTER TABLE public.analysis_sessions 
          ADD COLUMN target_scope VARCHAR(255) NOT NULL DEFAULT ''
        `);
        
        // 移除默认值（因为字段应该是必填的）
        await client.query(`
          ALTER TABLE public.analysis_sessions 
          ALTER COLUMN target_scope DROP DEFAULT
        `);

        // 创建索引
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_analysis_sessions_target_scope 
          ON public.analysis_sessions(target_scope)
        `);
      }
    }

    // 插入新记录（包含 target_scope 字段）
    const result = await client.query(
      `INSERT INTO public.analysis_sessions (user_id, profile_id, target_scope, session_data)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, profileId, targetScope, JSON.stringify(sessionData)]
    );

    const sessionId = result.rows[0].id;

    await client.query('COMMIT');

    return {
      success: true,
      message: '分析会话保存成功',
      sessionId,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('保存分析会话失败:', {
      userId,
      profileId,
      error: error.message,
    });
    throw new Error(`保存分析会话失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 查询分析会话列表
 * 
 * @param userId 用户ID
 * @param profileId 命盘ID（可选，如果提供则只查询该命盘的会话）
 * @returns Promise<AnalysisSession[]> 分析会话列表
 * 
 * @throws Error 如果查询失败
 */
export async function getAnalysisSessions(
  userId: string,
  profileId?: string
): Promise<AnalysisSession[]> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    let query: string;
    let params: any[];

    if (profileId) {
      // 查询特定命盘的所有会话
      query = `
        SELECT 
          id,
          user_id,
          profile_id,
          session_data,
          created_at,
          updated_at
        FROM public.analysis_sessions
        WHERE user_id = $1 AND profile_id = $2
        ORDER BY created_at DESC
      `;
      params = [userId, profileId];
    } else {
      // 查询用户的所有会话
      query = `
        SELECT 
          id,
          user_id,
          profile_id,
          session_data,
          created_at,
          updated_at
        FROM public.analysis_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      profile_id: row.profile_id,
      session_data: typeof row.session_data === 'string' 
        ? JSON.parse(row.session_data) 
        : row.session_data,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('查询分析会话失败:', {
      userId,
      profileId,
      error: error.message,
    });
    throw new Error(`查询分析会话失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 删除命盘的所有分析会话
 * 
 * @param userId 用户ID
 * @param profileId 命盘ID
 * @returns Promise<{ success: boolean; message?: string; deletedCount?: number }> 删除结果
 * 
 * @throws Error 如果删除失败
 */
export async function deleteAnalysisSessionsByProfile(
  userId: string,
  profileId: string
): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
  if (!userId || !profileId) {
    throw new Error('参数错误：用户ID和命盘ID必须有效');
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 先查询要删除的记录数
    const countResult = await client.query(
      `SELECT COUNT(*) as count
       FROM public.analysis_sessions
       WHERE user_id = $1 AND profile_id = $2`,
      [userId, profileId]
    );

    const deletedCount = parseInt(countResult.rows[0].count, 10);

    // 删除记录
    await client.query(
      `DELETE FROM public.analysis_sessions
       WHERE user_id = $1 AND profile_id = $2`,
      [userId, profileId]
    );

    await client.query('COMMIT');

    return {
      success: true,
      message: `成功删除 ${deletedCount} 个分析会话`,
      deletedCount,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('删除分析会话失败:', {
      userId,
      profileId,
      error: error.message,
    });
    throw new Error(`删除分析会话失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

export interface CompatibilityArchiveRow {
  id: string;
  user_id: string;
  chart_a: unknown;
  chart_b: unknown;
  name: string;
  notes: string | null;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  rectification_method?: string | null;
  inferred_hour?: string | null;
  confidence?: number | null;
  inference_data?: unknown;
  meta_data?: Record<string, unknown> | null;
}

export type RectificationInput = {
  method?: 'triangulation' | 'mbti' | 'manual' | null;
  inferredHour?: string | null;
  inferred_hour?: string | null;
  confidence?: number | null;
  inferenceData?: unknown;
  inference_data?: unknown;
} | null;

export type CompatibilityMetaData = Record<string, unknown> | null;

export async function createCompatibilityArchive(
  userId: string,
  chartA: unknown,
  chartB: unknown,
  name: string,
  notes?: string | null,
  tags?: string[] | null,
  rectification?: RectificationInput,
  metaData?: CompatibilityMetaData
): Promise<{ id: string; user_id: string; name: string; created_at: string }> {
  if (!userId || !chartA || !chartB || !name || !name.trim()) {
    throw new Error('参数错误：user_id、chart_a、chart_b、name 必填');
  }
  const trimmedName = name.trim();
  const tagsArr = Array.isArray(tags) ? tags : [];
  const method = rectification?.method ?? null;
  const validMethods = ['triangulation', 'mbti', 'manual'];
  const rectMethod = method && validMethods.includes(method) ? method : null;
  const inferredHour = rectification?.inferredHour ?? rectification?.inferred_hour ?? null;
  const confidence = rectification?.confidence != null ? Math.min(100, Math.max(0, Number(rectification.confidence))) : null;
  const inferenceData = rectification?.inferenceData ?? rectification?.inference_data ?? null;
  const metaDataVal = metaData && typeof metaData === 'object' ? JSON.stringify(metaData) : '{}';

  const result = await pool.query(
    `INSERT INTO compatibility_archives (user_id, chart_a, chart_b, name, notes, tags, rectification_method, inferred_hour, confidence, inference_data, meta_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
     RETURNING id, user_id, name, created_at`,
    [userId, JSON.stringify(chartA), JSON.stringify(chartB), trimmedName, notes ?? null, tagsArr, rectMethod, inferredHour, confidence, inferenceData != null ? JSON.stringify(inferenceData) : null, metaDataVal]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at,
  };
}

export async function getCompatibilityArchives(
  userId: string,
  limit: number,
  offset: number,
  keyword?: string | null
): Promise<{ archives: Array<{ id: string; name: string; tags: string[]; created_at: string }>; total: number }> {
  if (!userId) throw new Error('参数错误：user_id 必填');
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);
  const hasKeyword = typeof keyword === 'string' && keyword.trim().length > 0;
  const likePattern = hasKeyword ? `%${keyword.trim().replace(/%/g, '\\%').replace(/_/g, '\\_')}%` : null;

  const countResult = await pool.query(
    hasKeyword
      ? `SELECT COUNT(*)::int AS total FROM compatibility_archives
         WHERE user_id = $1 AND (name ILIKE $2 OR notes ILIKE $2 OR EXISTS (
           SELECT 1 FROM unnest(tags) t WHERE t ILIKE $2
         ))`
      : `SELECT COUNT(*)::int AS total FROM compatibility_archives WHERE user_id = $1`,
    hasKeyword ? [userId, likePattern] : [userId]
  );
  const total = countResult.rows[0]?.total ?? 0;

  const listResult = await pool.query(
    hasKeyword
      ? `SELECT id, name, tags, created_at FROM compatibility_archives
         WHERE user_id = $1 AND (name ILIKE $2 OR notes ILIKE $2 OR EXISTS (
           SELECT 1 FROM unnest(tags) t WHERE t ILIKE $2
         ))
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`
      : `SELECT id, name, tags, created_at FROM compatibility_archives
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    hasKeyword ? [userId, likePattern, safeLimit, safeOffset] : [userId, safeLimit, safeOffset]
  );

  const archives = listResult.rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    tags: r.tags ?? [],
    created_at: r.created_at,
  }));

  return { archives, total };
}

export async function getCompatibilityArchive(
  userId: string,
  id: string
): Promise<CompatibilityArchiveRow | null> {
  if (!userId || !id) return null;
  const result = await pool.query(
    `SELECT id, user_id, chart_a, chart_b, name, notes, tags, created_at, updated_at,
            rectification_method, inferred_hour, confidence, inference_data, meta_data
     FROM compatibility_archives WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id,
    user_id: r.user_id,
    chart_a: r.chart_a,
    chart_b: r.chart_b,
    name: r.name,
    notes: r.notes,
    tags: r.tags ?? [],
    created_at: r.created_at,
    updated_at: r.updated_at,
    rectification_method: r.rectification_method ?? undefined,
    inferred_hour: r.inferred_hour ?? undefined,
    confidence: r.confidence ?? undefined,
    inference_data: r.inference_data ?? undefined,
    meta_data: r.meta_data ?? undefined,
  };
}

export async function deleteCompatibilityArchive(userId: string, id: string): Promise<boolean> {
  if (!userId || !id) return false;
  const result = await pool.query(
    `DELETE FROM compatibility_archives WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

const ANALYZE_TASK_TTL_MS = 10 * 60 * 1000;
const analyzeTaskStore = new Map<string, { userId: string; chartA: unknown; chartB: unknown; relationshipType?: string; relationshipGoal?: string; createdAt: number }>();

export function createAnalyzeTask(userId: string, chartA: unknown, chartB: unknown, relationshipType?: string, relationshipGoal?: string): string {
  const taskId = randomUUID();
  analyzeTaskStore.set(taskId, {
    userId,
    chartA,
    chartB,
    relationshipType,
    relationshipGoal: relationshipGoal ?? '',
    createdAt: Date.now(),
  });
  return taskId;
}

export function consumeAnalyzeTask(taskId: string): { userId: string; chartA: unknown; chartB: unknown; relationshipType?: string; relationshipGoal?: string } | null {
  const task = analyzeTaskStore.get(taskId);
  if (!task) return null;
  if (Date.now() - task.createdAt > ANALYZE_TASK_TTL_MS) {
    analyzeTaskStore.delete(taskId);
    return null;
  }
  analyzeTaskStore.delete(taskId);
  return { userId: task.userId, chartA: task.chartA, chartB: task.chartB, relationshipType: task.relationshipType, relationshipGoal: task.relationshipGoal };
}

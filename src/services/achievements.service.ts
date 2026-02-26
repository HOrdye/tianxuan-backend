import { pool } from '../config/database';

/**
 * 成就系统服务模块
 * 提供用户成就查询、检查等功能
 */

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  metadata: any;
  created_at: Date;
}

/**
 * 检查用户是否拥有指定类型的成就
 * 
 * @param userId 用户ID
 * @param achievementType 成就类型
 * @returns Promise<{ exists: boolean, achievementId?: string, metadata?: any }>
 */
export async function checkAchievement(
  userId: string,
  achievementType: string
): Promise<{ exists: boolean; achievementId?: string; metadata?: any }> {
  try {
    const result = await pool.query(
      `SELECT id, metadata 
       FROM public.user_achievements 
       WHERE user_id = $1 AND achievement_type = $2 
       LIMIT 1`,
      [userId, achievementType]
    );

    if (result.rows.length === 0) {
      return { exists: false };
    }

    const achievement = result.rows[0];
    return {
      exists: true,
      achievementId: achievement.id,
      metadata: achievement.metadata || {},
    };
  } catch (error: any) {
    console.error('[Achievements Service] 检查成就失败:', {
      userId,
      achievementType,
      error: error.message,
    });
    throw new Error(`检查成就失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取用户的所有成就
 * 
 * @param userId 用户ID
 * @returns Promise<UserAchievement[]>
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, achievement_type, metadata, created_at
       FROM public.user_achievements 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      achievement_type: row.achievement_type,
      metadata: row.metadata || {},
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('[Achievements Service] 获取用户成就失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取用户成就失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 授予用户成就（内部使用，用于系统自动授予成就）
 * 
 * @param userId 用户ID
 * @param achievementType 成就类型
 * @param metadata 成就元数据（可选）
 * @returns Promise<UserAchievement>
 */
export async function grantAchievement(
  userId: string,
  achievementType: string,
  metadata?: any
): Promise<UserAchievement> {
  try {
    const result = await pool.query(
      `INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, achievement_type) 
       DO UPDATE SET metadata = EXCLUDED.metadata, created_at = NOW()
       RETURNING id, user_id, achievement_type, metadata, created_at`,
      [userId, achievementType, metadata || {}]
    );

    return {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      achievement_type: result.rows[0].achievement_type,
      metadata: result.rows[0].metadata || {},
      created_at: result.rows[0].created_at,
    };
  } catch (error: any) {
    console.error('[Achievements Service] 授予成就失败:', {
      userId,
      achievementType,
      error: error.message,
    });
    throw new Error(`授予成就失败: ${error.message || '未知错误'}`);
  }
}

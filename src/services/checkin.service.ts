import { pool } from '../config/database';

/**
 * 签到服务模块
 * 提供每日签到、查询签到记录、查询连续签到天数等功能
 */

/**
 * 签到结果接口
 */
export interface CheckInResult {
  success: boolean;
  message?: string;
  error?: string;
  coins_earned?: number;
  consecutive_days?: number;
  check_in_date?: string;
}

/**
 * 签到记录接口
 */
export interface CheckInLog {
  id: string;
  user_id: string;
  check_in_date: string;
  coins_earned: number;
  consecutive_days: number;
  tier: string | null;
  created_at: Date;
}

/**
 * 签到状态接口
 */
export interface CheckInStatus {
  last_check_in_date: string | null;
  consecutive_check_in_days: number;
  can_check_in_today: boolean;
  today_date: string;
}

/**
 * 每日签到（调用数据库函数 handle_daily_check_in）
 * 
 * @param userId 用户ID
 * @returns Promise<CheckInResult> 签到结果
 * 
 * @throws Error 如果签到失败（今日已签到、用户不存在等）
 */
export async function dailyCheckIn(userId: string): Promise<CheckInResult> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 1. 先查询用户当前签到状态
    const statusResult = await pool.query(
      `SELECT 
        last_check_in_date,
        consecutive_check_in_days
      FROM public.profiles
      WHERE id = $1`,
      [userId]
    );

    if (statusResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const profile = statusResult.rows[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastCheckInDate = profile.last_check_in_date
      ? new Date(profile.last_check_in_date).toISOString().split('T')[0]
      : null;

    // 2. 检查今天是否已经签到
    if (lastCheckInDate === today) {
      throw new Error('今日已签到，请明天再来');
    }

    // 3. 计算连续签到天数
    let consecutiveDays = 1;
    if (lastCheckInDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastCheckInDate === yesterdayStr) {
        // 昨天签到了，连续天数+1
        consecutiveDays = (profile.consecutive_check_in_days || 0) + 1;
      }
      // 否则重置为1（已经设置）
    }

    // 4. 计算奖励（根据连续天数，可以自定义奖励规则）
    // 基础奖励：10 天机币
    // 连续签到奖励：每连续7天额外奖励10天机币
    const baseReward = 10;
    const bonusReward = Math.floor(consecutiveDays / 7) * 10;
    const totalReward = baseReward + bonusReward;

    // 5. 调用数据库函数 handle_daily_check_in
    // 函数签名: handle_daily_check_in(p_user_id uuid, p_coins integer, p_consecutive_days integer, p_date date)
    const result = await pool.query(
      'SELECT handle_daily_check_in($1, $2, $3, $4) as result',
      [userId, totalReward, consecutiveDays, today]
    );

    const data = result.rows[0].result;

    // 6. 检查函数返回结果
    if (!data || !data.success) {
      throw new Error(data?.error || '签到失败');
    }

    return {
      success: true,
      message: data.message || '签到成功',
      coins_earned: totalReward,
      consecutive_days: consecutiveDays,
      check_in_date: today,
    };
  } catch (error: any) {
    // 记录错误日志
    console.error('签到失败:', {
      userId,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('今日已签到') || 
        error.message?.includes('用户不存在') ||
        error.message?.includes('签到失败')) {
      throw error;
    }

    // 处理数据库唯一约束错误（重复签到）
    if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      throw new Error('今日已签到，请明天再来');
    }

    // 其他错误，包装后抛出
    throw new Error(`签到操作失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 查询用户签到状态
 * 
 * @param userId 用户ID
 * @returns Promise<CheckInStatus | null> 签到状态或 null（用户不存在）
 */
export async function getCheckInStatus(userId: string): Promise<CheckInStatus | null> {
  try {
    const result = await pool.query(
      `SELECT 
        last_check_in_date,
        consecutive_check_in_days
      FROM public.profiles
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const lastCheckInDate = row.last_check_in_date
      ? new Date(row.last_check_in_date).toISOString().split('T')[0]
      : null;

    return {
      last_check_in_date: lastCheckInDate,
      consecutive_check_in_days: row.consecutive_check_in_days || 0,
      can_check_in_today: lastCheckInDate !== today,
      today_date: today,
    };
  } catch (error: any) {
    console.error('查询签到状态失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`查询签到状态失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 查询用户签到记录
 * 
 * @param userId 用户ID
 * @param limit 返回记录数限制（可选，默认30）
 * @param offset 偏移量（可选，默认0）
 * @returns Promise<CheckInLog[]> 签到记录列表
 */
export async function getCheckInLogs(
  userId: string,
  limit: number = 30,
  offset: number = 0
): Promise<CheckInLog[]> {
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
    const result = await pool.query(
      `SELECT 
        id,
        user_id,
        check_in_date,
        coins_earned,
        consecutive_days,
        tier,
        created_at
      FROM public.check_in_logs
      WHERE user_id = $1
      ORDER BY check_in_date DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      check_in_date: row.check_in_date,
      coins_earned: row.coins_earned,
      consecutive_days: row.consecutive_days,
      tier: row.tier,
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('查询签到记录失败:', {
      userId,
      limit,
      offset,
      error: error.message,
    });
    throw new Error(`查询签到记录失败: ${error.message || '未知错误'}`);
  }
}

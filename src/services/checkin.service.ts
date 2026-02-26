import { pool } from '../config/database';

/**
 * 签到服务模块
 * 提供每日签到、查询签到记录、查询连续签到天数等功能
 */

/**
 * 会员等级类型（与数据库实际值一致）
 */
export type Tier = 'guest' | 'explorer' | 'basic' | 'premium' | 'vip';

/**
 * 签到奖励配置表（7天循环奖励机制）
 * 根据连续签到天数（1-7循环）从奖励表中取值
 * 数组索引对应：第1天=索引0，第2天=索引1，...，第7天=索引6
 */
const REWARD_TABLE: Record<Tier, number[]> = {
  guest: [0, 0, 0, 0, 0, 0, 0],           // 游客：0 天机币（无法签到）
  explorer: [2, 3, 3, 4, 4, 5, 5],        // 探索者：平均3.4币/天
  basic: [45, 48, 50, 52, 55, 58, 70],    // 开悟者：平均54币/天
  premium: [500, 500, 500, 500, 500, 500, 600], // 天命师：平均514币/天
  vip: [500, 500, 500, 500, 500, 500, 600],     // 玄机大师：与天命师相同（待开发）
};

/**
 * 计算签到奖励（根据会员等级和连续签到天数，使用7天循环机制）
 * 
 * @param tier 会员等级
 * @param consecutiveDays 连续签到天数
 * @returns 奖励金额
 */
export function calculateCheckinReward(tier: Tier, consecutiveDays: number): number {
  // 确保等级有效，默认为 explorer
  const validTiers: Tier[] = ['guest', 'explorer', 'basic', 'premium', 'vip'];
  const validTier = (validTiers.includes(tier) 
    ? tier 
    : 'explorer') as Tier;
  
  // ✅ 调试日志：如果等级无效，记录警告
  if (!validTiers.includes(tier)) {
    console.warn('[签到奖励计算] 无效的等级值:', {
      tier,
      validTier,
      consecutiveDays,
    });
  }
  
  // 获取该等级的奖励表
  const rewardTable = REWARD_TABLE[validTier];
  
  // 计算7天循环中的位置（1-7天对应索引0-6）
  // 连续天数对7取模，得到0-6的索引
  // 如果连续天数为0，使用第1天的奖励（索引0）
  const dayIndex = consecutiveDays > 0 ? ((consecutiveDays - 1) % 7) : 0;
  
  // 从奖励表中获取对应天数的奖励
  const reward = rewardTable[dayIndex];
  
  // ✅ 调试日志：记录奖励计算详情
  console.log('[签到奖励计算] 奖励计算详情:', {
    tier,
    validTier,
    consecutiveDays,
    dayIndex: dayIndex + 1, // 显示为第几天（1-7）
    reward,
    rewardTable,
  });
  
  return reward;
}

/**
 * 获取服务器本地时区的当前日期字符串
 * 使用服务器本地时区的今天日期（YYYY-MM-DD格式）
 * 
 * @returns 日期字符串，格式：YYYY-MM-DD
 */
function getServerLocalDateString(): string {
  // ✅ 使用服务器本地时区的今天开始时间
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0); // 服务器本地时间的 00:00:00
  
  // ✅ 格式化为 YYYY-MM-DD 格式（使用服务器本地时区）
  const year = todayStart.getFullYear();
  const month = String(todayStart.getMonth() + 1).padStart(2, '0');
  const day = String(todayStart.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 格式化日期为 YYYY-MM-DD 格式（使用服务器本地时区）
 * 
 * @param date Date 对象或日期字符串
 * @returns 日期字符串，格式：YYYY-MM-DD
 */
function formatDateString(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  tier?: string; // 用户等级
  today_coins_earned?: number; // 今天已获得的奖励（如果今天已签到）
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
    // 1. 先查询用户是否存在，并获取用户等级
    const profileResult = await pool.query(
      `SELECT 
        last_check_in_date,
        consecutive_check_in_days,
        tier
      FROM public.profiles
      WHERE id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const profile = profileResult.rows[0];
    
    // 获取用户等级，默认为 explorer
    const rawTier = profile.tier;
    const validTiers: Tier[] = ['guest', 'explorer', 'basic', 'premium', 'vip'];
    
    // ✅ 处理tier值：确保正确识别用户等级
    let userTier: Tier = 'explorer'; // 默认值
    
    if (rawTier) {
      const tierLower = rawTier.toLowerCase().trim();
      if (validTiers.includes(tierLower as Tier)) {
        userTier = tierLower as Tier;
      } else {
        // 如果tier值不在有效列表中，记录警告
        console.warn('[签到服务] 无效的tier值:', {
          userId,
          rawTier,
          tierLower,
          '使用默认值explorer': true,
        });
      }
    } else {
      // 如果tier为null或undefined，使用默认值
      console.warn('[签到服务] tier值为空，使用默认值explorer:', {
        userId,
        rawTier,
      });
    }
    
    // ✅ 调试日志：记录用户等级信息
    console.log('[签到服务] 用户等级信息:', {
      userId,
      rawTier,
      userTier,
      isValidTier: validTiers.includes(userTier),
    });
    
    // 2. ✅ 使用 PostgreSQL 的 CURRENT_DATE 函数（服务器本地时区）
    // 这样无论服务器在哪个时区，都会使用数据库服务器的时区设置
    const todayCheckInResult = await pool.query(
      `SELECT 1
       FROM public.check_in_logs
       WHERE user_id = $1
         AND check_in_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    );
    
    // 获取今天的日期字符串（用于后续使用）
    const todayStr = getServerLocalDateString();

    // 4. 如果今天已签到，直接返回错误（以 check_in_logs 表为准）
    if (todayCheckInResult.rows.length > 0) {
      throw new Error('今日已签到，请明天再来');
    }

    // 4. 获取最后一次签到日期（用于计算连续天数）
    const lastCheckInResult = await pool.query(
      `SELECT check_in_date
       FROM public.check_in_logs
       WHERE user_id = $1
       ORDER BY check_in_date DESC
       LIMIT 1`,
      [userId]
    );

    // ✅ 格式化日期为 YYYY-MM-DD（确保格式统一）
    const lastCheckInDate = lastCheckInResult.rows.length > 0
      ? formatDateString(lastCheckInResult.rows[0].check_in_date)
      : (profile.last_check_in_date
          ? formatDateString(profile.last_check_in_date)
          : null);

    // 3. 计算连续签到天数
    let consecutiveDays = 1;
    if (lastCheckInDate) {
      // ✅ 使用服务器本地时区计算昨天日期
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStr = formatDateString(yesterday);
      
      if (lastCheckInDate === yesterdayStr) {
        // 昨天签到了，连续天数+1
        consecutiveDays = (profile.consecutive_check_in_days || 0) + 1;
      }
      // 否则重置为1（已经设置）
    }

    // 4. 计算奖励（根据用户等级和连续签到天数，使用7天循环奖励机制）
    const totalReward = calculateCheckinReward(userTier, consecutiveDays);
    
    // ✅ 调试日志：记录最终奖励
    console.log('[签到服务] 最终奖励计算:', {
      userId,
      userTier,
      consecutiveDays,
      totalReward,
    });

    // 5. 调用数据库函数 handle_daily_check_in
    // 函数签名: handle_daily_check_in(p_user_id uuid, p_coins integer, p_consecutive_days integer, p_date date)
    // ✅ 使用 PostgreSQL 的 CURRENT_DATE（服务器本地时区）
    const result = await pool.query(
      'SELECT handle_daily_check_in($1, $2, $3, CURRENT_DATE) as result',
      [userId, totalReward, consecutiveDays]
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
      check_in_date: todayStr, // ✅ 返回北京时间日期
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
 * 
 * ✅ 修复：直接查询 check_in_logs 表作为事实来源，避免时区问题
 */
export async function getCheckInStatus(userId: string): Promise<CheckInStatus | null> {
  try {
    // 1. 查询用户基本信息
    const profileResult = await pool.query(
      `SELECT 
        last_check_in_date,
        consecutive_check_in_days,
        tier
      FROM public.profiles
      WHERE id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return null;
    }

    const profile = profileResult.rows[0];
    
    // 2. ✅ 使用 PostgreSQL 的 CURRENT_DATE 函数（服务器本地时区）
    // 直接查询 check_in_logs 表检查今天是否已签到
    // 使用 check_in_date 字段进行比较（DATE 类型，只比较日期部分）
    const todayCheckInResult = await pool.query(
      `SELECT check_in_date, coins_earned, consecutive_days
       FROM public.check_in_logs
       WHERE user_id = $1
         AND check_in_date = CURRENT_DATE
       LIMIT 1`,
      [userId]
    );
    
    // 获取今天的日期字符串（用于返回）
    const todayStr = getServerLocalDateString();

    // 4. 判断今天是否已签到（以 check_in_logs 表为准）
    const hasCheckedInToday = todayCheckInResult.rows.length > 0;
    const todayCoinsEarned = hasCheckedInToday ? todayCheckInResult.rows[0].coins_earned : undefined;
    
    // 5. 获取最后一次签到日期（从 check_in_logs 表获取，更准确）
    let lastCheckInDate: string | null = null;
    if (hasCheckedInToday) {
      // 如果今天已签到，使用今天的日期（服务器本地时区）
      lastCheckInDate = todayStr;
    } else {
      // 如果今天未签到，查询最后一次签到日期
      const lastCheckInResult = await pool.query(
        `SELECT check_in_date
         FROM public.check_in_logs
         WHERE user_id = $1
         ORDER BY check_in_date DESC
         LIMIT 1`,
        [userId]
      );
      
      if (lastCheckInResult.rows.length > 0) {
        // ✅ 格式化日期为 YYYY-MM-DD（确保格式统一）
        lastCheckInDate = formatDateString(lastCheckInResult.rows[0].check_in_date);
      } else {
        // 如果没有签到记录，使用 profiles 表的数据（兼容旧数据）
        lastCheckInDate = profile.last_check_in_date
          ? formatDateString(profile.last_check_in_date)
          : null;
      }
    }

    return {
      last_check_in_date: lastCheckInDate,
      consecutive_check_in_days: profile.consecutive_check_in_days || 0,
      can_check_in_today: !hasCheckedInToday, // ✅ 以 check_in_logs 表为准
      today_date: todayStr, // ✅ 返回北京时间日期
      tier: profile.tier || 'explorer',
      today_coins_earned: todayCoinsEarned, // 今天已获得的奖励（如果今天已签到）
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
      ORDER BY check_in_date ASC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      check_in_date: formatDateString(row.check_in_date), // ✅ 统一格式化为 YYYY-MM-DD
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

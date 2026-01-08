import { pool } from '../config/database';

/**
 * 用户资料服务模块
 * 提供用户资料查询、更新等功能
 */

export interface Profile {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  birthday: string | null;
  gender: string | null;
  phone: string | null;
  website: string | null;
  preferences: any;
  role: string | null;
  tier: string | null;
  subscription_status: string | null;
  subscription_end_at: Date | null;
  tianji_coins_balance: number | null;
  daily_coins_grant: number | null;
  activity_coins_grant: number | null;
  daily_coins_grant_expires_at: Date | null;
  activity_coins_grant_expires_at: Date | null;
  last_coins_reset_at: Date | null;
  last_check_in_date: string | null;
  consecutive_check_in_days: number | null;
  registration_bonus_granted: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface UpdateProfileData {
  username?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  birthday?: string;
  gender?: string;
  phone?: string;
  website?: string;
  preferences?: any;
}

/**
 * 获取用户资料
 * 
 * @param userId 用户ID
 * @returns Promise<Profile | null> 用户资料或 null
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const result = await pool.query(
    `SELECT 
      id, email, username, avatar_url, bio, location, birthday, gender,
      phone, website, preferences, role, tier, subscription_status,
      subscription_end_at, tianji_coins_balance, daily_coins_grant,
      activity_coins_grant, daily_coins_grant_expires_at,
      activity_coins_grant_expires_at, last_coins_reset_at,
      last_check_in_date, consecutive_check_in_days,
      registration_bonus_granted, created_at, updated_at
    FROM public.profiles
    WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Profile;
}

/**
 * 更新用户资料
 * 
 * @param userId 用户ID
 * @param data 要更新的数据
 * @returns Promise<Profile> 更新后的用户资料
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<Profile> {
  // 构建更新字段
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // 处理可更新字段
  const allowedFields = [
    'username',
    'avatar_url',
    'bio',
    'location',
    'birthday',
    'gender',
    'phone',
    'website',
    'preferences',
  ];

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key) && value !== undefined) {
      if (key === 'preferences' && typeof value === 'object') {
        // preferences 是 JSONB，需要转换为 JSON 字符串
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    // 如果没有要更新的字段，直接返回当前资料
    const profile = await getProfile(userId);
    if (!profile) {
      throw new Error('用户不存在');
    }
    return profile;
  }

  // 添加 updated_at
  updateFields.push(`updated_at = NOW()`);
  values.push(userId);

  // 执行更新
  const updateQuery = `
    UPDATE public.profiles
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING 
      id, email, username, avatar_url, bio, location, birthday, gender,
      phone, website, preferences, role, tier, subscription_status,
      subscription_end_at, tianji_coins_balance, daily_coins_grant,
      activity_coins_grant, daily_coins_grant_expires_at,
      activity_coins_grant_expires_at, last_coins_reset_at,
      last_check_in_date, consecutive_check_in_days,
      registration_bonus_granted, created_at, updated_at
  `;

  const result = await pool.query(updateQuery, values);

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  return result.rows[0] as Profile;
}

/**
 * 获取用户等级
 * 
 * @param userId 用户ID
 * @returns Promise<string | null> 用户等级或 null
 */
export async function getUserTier(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT tier FROM public.profiles WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].tier || null;
}

/**
 * 检查用户是否存在
 * 
 * @param userId 用户ID
 * @returns Promise<boolean> 用户是否存在
 */
export async function userExists(userId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM public.profiles WHERE id = $1',
    [userId]
  );

  return result.rows.length > 0;
}

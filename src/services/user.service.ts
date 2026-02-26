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
  // 支持前端发送的 user_metadata 对象格式
  user_metadata?: {
    username?: string;
    avatar_url?: string;
    birthday?: string;
    gender?: string;
    bio?: string;
    location?: string;
    website?: string;
    phone?: string;
    [key: string]: any; // 允许其他扩展字段
  };
}

/**
 * 前端期望的用户资料格式（包含 user_metadata）
 */
export interface UserProfileForFrontend {
  id: string;
  email: string | null;
  username: string | null;
  avatar_url: string | null;
  user_metadata: {
    username: string | null;
    avatar_url: string | null;
    birthday?: string | null;
    gender?: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    phone?: string | null;
    [key: string]: any; // 允许其他扩展字段
  };
  // 其他字段保持不变
  bio?: string | null;
  location?: string | null;
  birthday?: string | null;
  gender?: string | null;
  phone?: string | null;
  website?: string | null;
  preferences?: any;
  role?: string | null;
  tier?: string | null;
  subscription_status?: string | null;
  subscription_end_at?: Date | null;
  tianji_coins_balance?: number | null;
  daily_coins_grant?: number | null;
  activity_coins_grant?: number | null;
  daily_coins_grant_expires_at?: Date | null;
  activity_coins_grant_expires_at?: Date | null;
  last_coins_reset_at?: Date | null;
  last_check_in_date?: string | null;
  consecutive_check_in_days?: number | null;
  registration_bonus_granted?: boolean | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}

/**
 * 清理 avatar_url：如果是 Base64 编码，返回 null（只返回 URL）
 * 
 * @param avatarUrl 头像 URL 或 Base64 编码
 * @returns 清理后的 URL 或 null
 */
function sanitizeAvatarUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) {
    return null;
  }
  
  // 检测是否是 Base64 编码（data:image/ 开头或超长字符串）
  if (avatarUrl.startsWith('data:image/') || avatarUrl.length > 1000) {
    console.warn('[sanitizeAvatarUrl] 检测到 Base64 编码的头像，已过滤:', {
      length: avatarUrl.length,
      preview: avatarUrl.substring(0, 50) + '...'
    });
    return null;
  }
  
  // 验证是否是有效的 URL
  try {
    new URL(avatarUrl);
    return avatarUrl;
  } catch {
    // 如果不是有效 URL，返回 null
    console.warn('[sanitizeAvatarUrl] 无效的 URL 格式，已过滤:', avatarUrl.substring(0, 50));
    return null;
  }
}

/**
 * 将数据库的 Profile 格式转换为前端期望的格式（包含 user_metadata）
 * 
 * @param profile 数据库中的用户资料
 * @returns 前端期望的用户资料格式
 */
export function formatProfileForFrontend(profile: Profile): UserProfileForFrontend {
  const sanitizedAvatarUrl = sanitizeAvatarUrl(profile.avatar_url);
  
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    avatar_url: sanitizedAvatarUrl,
    // 构建 user_metadata 对象，包含所有前端需要的字段
    // 注意：包含所有字段，包括 null 值，确保前端能正确读取
    user_metadata: {
      username: profile.username,
      avatar_url: sanitizedAvatarUrl,
      // 包含所有字段，即使值为 null
      birthday: profile.birthday ?? null,
      gender: profile.gender ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      phone: profile.phone ?? null,
    },
    // 保留其他字段以兼容性
    bio: profile.bio,
    location: profile.location,
    birthday: profile.birthday,
    gender: profile.gender,
    phone: profile.phone,
    website: profile.website,
    preferences: profile.preferences,
    role: profile.role,
    tier: profile.tier,
    subscription_status: profile.subscription_status,
    subscription_end_at: profile.subscription_end_at,
    tianji_coins_balance: profile.tianji_coins_balance,
    daily_coins_grant: profile.daily_coins_grant,
    activity_coins_grant: profile.activity_coins_grant,
    daily_coins_grant_expires_at: profile.daily_coins_grant_expires_at,
    activity_coins_grant_expires_at: profile.activity_coins_grant_expires_at,
    last_coins_reset_at: profile.last_coins_reset_at,
    last_check_in_date: profile.last_check_in_date,
    consecutive_check_in_days: profile.consecutive_check_in_days,
    registration_bonus_granted: profile.registration_bonus_granted,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

/**
 * 获取用户资料
 * 
 * @param userId 用户ID
 * @param formatForFrontend 是否转换为前端格式（默认 true）
 * @returns Promise<Profile | UserProfileForFrontend | null> 用户资料或 null
 */
export async function getProfile(
  userId: string,
  formatForFrontend: boolean = true
): Promise<Profile | UserProfileForFrontend | null> {
  const result = await pool.query(
    `SELECT 
      id, email, username, avatar_url, bio, location, birthday, gender,
      phone, website, preferences, role, tier, subscription_status,
      subscription_end_at, tianji_coins_balance, daily_coins_grant,
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

  const profile = result.rows[0] as Profile;
  const preferences = profile.preferences || {};
  const userContext = preferences.userContext || {};
  let completeness = 0;
  try {
    const { calculateCompleteness } = await import('./user-digital-twin.service');
    completeness = calculateCompleteness(userContext, profile.birthday);
  } catch (e) {
    console.warn('[getProfile] 数字分身完整度计算失败，使用默认值 0:', e);
  }
  if (formatForFrontend) {
    const formatted = formatProfileForFrontend(profile);
    return {
      ...formatted,
      completeness,
    } as any;
  }
  return {
    ...profile,
    completeness,
  } as any;
}

/**
 * 更新用户资料
 * 
 * @param userId 用户ID
 * @param data 要更新的数据
 * @param formatForFrontend 是否转换为前端格式（默认 true）
 * @returns Promise<Profile | UserProfileForFrontend> 更新后的用户资料
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
  formatForFrontend: boolean = true
): Promise<Profile | UserProfileForFrontend> {
  // 🔧 修复：处理前端发送的 user_metadata 对象
  // 如果数据中包含 user_metadata，将其中的字段提取出来
  const processedData: UpdateProfileData = { ...data };
  
  // 🐛 Debug: 记录接收到的原始数据
  console.log('[updateProfile] 接收到的原始数据:', JSON.stringify(data, null, 2));
  
  if (data.user_metadata && typeof data.user_metadata === 'object') {
    // 将 user_metadata 中的字段提取到顶层
    const metadata = data.user_metadata;
    
    console.log('[updateProfile] 提取 user_metadata 中的字段:', JSON.stringify(metadata, null, 2));
    
    // 只提取白名单中的字段
    // 注意：user_metadata 中的字段优先级高于顶层字段（如果同时存在）
    if (metadata.username !== undefined) {
      processedData.username = metadata.username;
    }
    if (metadata.avatar_url !== undefined) {
      // 拒绝 Base64 编码的头像，只接受 URL
      if (metadata.avatar_url && (metadata.avatar_url.startsWith('data:image/') || metadata.avatar_url.length > 1000)) {
        console.warn('[updateProfile] 拒绝 Base64 编码的头像，请使用 URL');
        throw new Error('头像必须是 URL 格式，不支持 Base64 编码');
      }
      processedData.avatar_url = metadata.avatar_url;
    }
    if (metadata.birthday !== undefined) {
      processedData.birthday = metadata.birthday;
    }
    if (metadata.gender !== undefined) {
      processedData.gender = metadata.gender;
    }
    if (metadata.bio !== undefined) {
      processedData.bio = metadata.bio;
    }
    if (metadata.location !== undefined) {
      processedData.location = metadata.location;
    }
    if (metadata.website !== undefined) {
      processedData.website = metadata.website;
    }
    if (metadata.phone !== undefined) {
      processedData.phone = metadata.phone;
    }
    
    // 移除 user_metadata，因为我们已经提取了其中的字段
    delete processedData.user_metadata;
  }
  
  console.log('[updateProfile] 处理后的数据:', JSON.stringify(processedData, null, 2));

  // 构建更新字段
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // ✅ 安全修复：定义严格的白名单，防止列名注入攻击
  // 只允许用户修改这些字段，禁止修改敏感字段（如 role, tier, tianji_coins_balance 等）
  const ALLOWED_FIELDS = [
    'username',
    'avatar_url',
    'bio',
    'location',
    'birthday',
    'gender',
    'phone',
    'website',
    'preferences',
  ] as const;

  // ✅ 额外安全：验证字段名格式（只允许字母、数字、下划线）
  const isValidFieldName = (fieldName: string): boolean => {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName);
  };

  // 遍历传入的数据
  for (const [key, value] of Object.entries(processedData)) {
    // 跳过 undefined 值
    if (value === undefined) {
      continue;
    }

    // 🛡️ 安全检查1：验证字段名格式（防止特殊字符注入）
    if (!isValidFieldName(key)) {
      console.warn(`[安全警告] 尝试使用非法字段名格式: ${key}，已拒绝`);
      continue;
    }

    // 🛡️ 安全检查2：只允许修改白名单里的字段
    if (!ALLOWED_FIELDS.includes(key as any)) {
      console.warn(`[安全警告] 尝试修改非法字段: ${key}，已拒绝`);
      continue; // 跳过非法字段，不抛出错误（避免泄露白名单信息）
    }

    // ✅ 字段在白名单中，可以安全更新
    // 🛡️ 特殊验证：avatar_url 必须是 URL，不能是 Base64
    if (key === 'avatar_url' && typeof value === 'string') {
      if (value.startsWith('data:image/') || value.length > 1000) {
        console.warn('[updateProfile] 拒绝 Base64 编码的头像，请使用 URL');
        throw new Error('头像必须是 URL 格式，不支持 Base64 编码');
      }
      // 验证是否是有效的 URL
      try {
        new URL(value);
      } catch {
        console.warn('[updateProfile] 无效的 URL 格式:', value.substring(0, 50));
        throw new Error('头像必须是有效的 URL 格式');
      }
    }
    
    if (key === 'preferences' && typeof value === 'object') {
      // 🛡️ 安全过滤：禁止用户更新 implicit_traits
      const sanitizedPreferences = { ...value };
      if (sanitizedPreferences.implicit_traits !== undefined) {
        delete sanitizedPreferences.implicit_traits;
        console.warn(`[安全警告] 用户尝试更新 implicit_traits，已过滤`);
      }
      
      // preferences 是 JSONB，需要转换为 JSON 字符串
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(JSON.stringify(sanitizedPreferences));
    } else {
      updateFields.push(`${key} = $${paramIndex}`);
      values.push(value);
    }
    paramIndex++;
  }

  if (updateFields.length === 0) {
    // 如果没有要更新的字段，直接返回当前资料
    const profile = await getProfile(userId, formatForFrontend);
    if (!profile) {
      throw new Error('用户不存在');
    }
    return profile;
  }

  // 添加 updated_at
  updateFields.push(`updated_at = NOW()`);
  values.push(userId);

  // 🐛 Debug: 记录要执行的 SQL 更新
  console.log('[updateProfile] 要更新的字段:', updateFields);
  console.log('[updateProfile] 更新值:', values.slice(0, -1)); // 排除最后的 userId

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

  const updatedProfile = result.rows[0] as Profile;
  console.log('[updateProfile] 数据库更新后的数据:', {
    birthday: updatedProfile.birthday,
    gender: updatedProfile.gender,
    bio: updatedProfile.bio,
    location: updatedProfile.location,
    username: updatedProfile.username,
  });
  const preferences = updatedProfile.preferences || {};
  const userContext = preferences.userContext || {};
  let completeness = 0;
  try {
    const { calculateCompleteness } = await import('./user-digital-twin.service');
    completeness = calculateCompleteness(userContext, updatedProfile.birthday);
  } catch (e) {
    console.warn('[updateProfile] 数字分身完整度计算失败，使用默认值 0:', e);
  }
  if (formatForFrontend) {
    const formatted = formatProfileForFrontend(updatedProfile);
    return {
      ...formatted,
      completeness,
    } as any;
  }
  return {
    ...updatedProfile,
    completeness,
  } as any;
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

/**
 * 批量查询用户等级
 * 
 * @param userIds 用户ID数组
 * @returns Promise<Record<string, string>> userId -> tier映射
 */
export async function batchGetUserTiers(
  userIds: string[]
): Promise<Record<string, string>> {
  try {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const result = await pool.query(
      `SELECT id, tier 
       FROM public.profiles 
       WHERE id = ANY($1::uuid[])`,
      [userIds]
    );

    const tierMap: Record<string, string> = {};
    result.rows.forEach((row) => {
      tierMap[row.id] = row.tier || 'explorer';
    });

    return tierMap;
  } catch (error: any) {
    console.error('[User Service] 批量查询用户等级失败:', {
      userIds,
      error: error.message,
    });
    throw new Error(`批量查询用户等级失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取用户档案数量
 * 
 * @param userId 用户ID
 * @returns Promise<number> 档案数量
 */
export async function getArchivesCount(userId: string): Promise<number> {
  try {
    // 检查表是否存在
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles_archives'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      return 0;
    }

    // 直接查询COUNT，不涉及任何列
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM public.profiles_archives 
       WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count, 10);
  } catch (error: any) {
    console.error('[User Service] 获取档案数量失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取档案数量失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 删除用户账户（原子性删除所有相关数据）
 * 
 * @param userId 用户ID
 * @returns Promise<void>
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. 删除用户的所有档案
    await client.query(
      'DELETE FROM public.profiles_archives WHERE user_id = $1',
      [userId]
    );

    // 2. 删除用户的所有成就
    await client.query(
      'DELETE FROM public.user_achievements WHERE user_id = $1',
      [userId]
    );

    // 3. 删除用户的所有收藏洞察
    await client.query(
      'DELETE FROM public.saved_insights WHERE user_id = $1',
      [userId]
    );

    // 4. 删除用户的任务记录
    await client.query(
      'DELETE FROM public.user_tasks WHERE user_id = $1',
      [userId]
    );

    // 5. 删除用户的命盘存档
    await client.query(
      'DELETE FROM public.star_charts WHERE profile_id = $1',
      [userId]
    );

    // 6. 删除用户的命盘档案
    await client.query(
      'DELETE FROM public.ziwei_chart_archives WHERE user_id = $1',
      [userId]
    );

    // 7. 删除用户的解锁时空资产
    await client.query(
      'DELETE FROM public.unlocked_time_assets WHERE user_id = $1',
      [userId]
    );

    // 8. 删除用户的交易记录（保留订单记录，但标记为已删除）
    // 注意：这里不删除交易记录，因为可能需要审计

    // 9. 删除用户的profile记录（会级联删除相关数据）
    await client.query(
      'DELETE FROM public.profiles WHERE id = $1',
      [userId]
    );

    // 10. 删除auth.users记录（最后删除，因为可能有外键约束）
    await client.query(
      'DELETE FROM auth.users WHERE id = $1',
      [userId]
    );

    await client.query('COMMIT');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[User Service] 删除用户账户失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`删除用户账户失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

/**
 * 用户档案存档相关接口和函数
 */

/**
 * 档案存档数据结构
 */
export interface ProfileArchive {
  id: string;
  user_id: string;
  name: string;
  birth_data: any; // JSONB
  identity_tag: string | null;
  energy_level: 'strong' | 'weak' | 'balanced' | null;
  latest_luck: string | null;
  private_note: string | null;
  element_color: string | null;
  is_pinned: boolean;
  relationship_type: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * 创建档案请求数据
 */
export interface CreateProfileArchiveRequest {
  name: string;
  birth_data: any; // JSONB
  identity_tag?: string;
  energy_level?: 'strong' | 'weak' | 'balanced';
  private_note?: string;
  relationship_type?: string;
}

/**
 * 更新档案请求数据（所有字段可选）
 */
export interface UpdateProfileArchiveRequest {
  name?: string;
  identity_tag?: string;
  energy_level?: 'strong' | 'weak' | 'balanced';
  latest_luck?: string;
  private_note?: string;
  element_color?: string;
  is_pinned?: boolean;
  relationship_type?: string;
}

/**
 * 获取用户的所有档案
 * 按置顶状态和更新时间排序
 * 
 * @param userId 用户ID
 * @returns Promise<ProfileArchive[]> 档案列表
 */
export async function getArchives(userId: string): Promise<ProfileArchive[]> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 检查 latest_luck 列是否存在
    const columnCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles_archives' 
        AND column_name = 'latest_luck'
      )`
    );

    const hasLatestLuck = columnCheck.rows[0].exists;
    
    // 根据列是否存在动态构建查询
    const columns = hasLatestLuck
      ? `id, user_id, name, birth_data, identity_tag, energy_level,
         latest_luck, private_note, element_color, is_pinned,
         relationship_type, created_at, updated_at`
      : `id, user_id, name, birth_data, identity_tag, energy_level,
         private_note, element_color, is_pinned,
         relationship_type, created_at, updated_at`;

    const result = await pool.query(
      `SELECT ${columns}
       FROM public.profiles_archives
       WHERE user_id = $1
       ORDER BY is_pinned DESC, updated_at DESC`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      birth_data: typeof row.birth_data === 'string' 
        ? JSON.parse(row.birth_data) 
        : row.birth_data,
      identity_tag: row.identity_tag,
      energy_level: row.energy_level,
      latest_luck: hasLatestLuck ? row.latest_luck : null,
      private_note: row.private_note,
      element_color: row.element_color,
      is_pinned: row.is_pinned || false,
      relationship_type: row.relationship_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('查询用户档案列表失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`查询用户档案列表失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 根据ID获取单个档案
 * 
 * @param userId 用户ID（用于权限验证）
 * @param archiveId 档案ID
 * @returns Promise<ProfileArchive | null> 档案数据或 null（不存在或无权访问）
 */
export async function getArchiveById(
  userId: string,
  archiveId: string
): Promise<ProfileArchive | null> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和档案ID必须有效');
  }

  try {
    // 检查 latest_luck 列是否存在
    const columnCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles_archives' 
        AND column_name = 'latest_luck'
      )`
    );

    const hasLatestLuck = columnCheck.rows[0].exists;
    
    // 根据列是否存在动态构建查询
    const columns = hasLatestLuck
      ? `id, user_id, name, birth_data, identity_tag, energy_level,
         latest_luck, private_note, element_color, is_pinned,
         relationship_type, created_at, updated_at`
      : `id, user_id, name, birth_data, identity_tag, energy_level,
         private_note, element_color, is_pinned,
         relationship_type, created_at, updated_at`;

    const result = await pool.query(
      `SELECT ${columns}
       FROM public.profiles_archives
       WHERE id = $1 AND user_id = $2`,
      [archiveId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      birth_data: typeof row.birth_data === 'string' 
        ? JSON.parse(row.birth_data) 
        : row.birth_data,
      identity_tag: row.identity_tag,
      energy_level: row.energy_level,
      latest_luck: hasLatestLuck ? row.latest_luck : null,
      private_note: row.private_note,
      element_color: row.element_color,
      is_pinned: row.is_pinned || false,
      relationship_type: row.relationship_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('查询档案失败:', {
      userId,
      archiveId,
      error: error.message,
    });
    throw new Error(`查询档案失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 创建新档案
 * 
 * @param userId 用户ID
 * @param data 档案数据
 * @returns Promise<ProfileArchive> 创建的档案数据
 */
export async function createArchive(
  userId: string,
  data: CreateProfileArchiveRequest
): Promise<ProfileArchive> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  // 🛡️ 安全加固：清理 data 对象中可能存在的恶意字段
  // 确保 user_id 只能从函数参数传入，不能从请求体中覆盖
  const sanitizedData: CreateProfileArchiveRequest = {
    name: data.name,
    birth_data: data.birth_data,
    identity_tag: data.identity_tag,
    energy_level: data.energy_level,
    private_note: data.private_note,
    relationship_type: data.relationship_type,
  };
  // 明确排除任何可能的 user_id 字段（即使 TypeScript 类型中没有定义）
  // 这是双重保险，防止恶意请求尝试覆盖 user_id

  // 参数验证
  if (!sanitizedData.name || !sanitizedData.birth_data) {
    throw new Error('参数错误：档案名称和出生数据必须提供');
  }

  // 验证 energy_level（如果提供）
  if (sanitizedData.energy_level && !['strong', 'weak', 'balanced'].includes(sanitizedData.energy_level)) {
    throw new Error('参数错误：energy_level 必须是 strong、weak 或 balanced 之一');
  }

  // 验证名称（trim 后不能为空）
  const trimmedName = sanitizedData.name.trim();
  if (!trimmedName) {
    throw new Error('参数错误：档案名称不能为空');
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.profiles_archives (
        user_id, name, birth_data, identity_tag, energy_level,
        private_note, relationship_type, is_pinned, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING 
        id, user_id, name, birth_data, identity_tag, energy_level,
        latest_luck, private_note, element_color, is_pinned,
        relationship_type, created_at, updated_at`,
      [
        userId, // ✅ 使用函数参数中的 userId，确保不会被请求体覆盖
        trimmedName,
        typeof sanitizedData.birth_data === 'string' 
          ? sanitizedData.birth_data 
          : JSON.stringify(sanitizedData.birth_data),
        sanitizedData.identity_tag || null,
        sanitizedData.energy_level || null,
        sanitizedData.private_note || null,
        sanitizedData.relationship_type || null,
        false, // is_pinned 默认为 false
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      birth_data: typeof row.birth_data === 'string' 
        ? JSON.parse(row.birth_data) 
        : row.birth_data,
      identity_tag: row.identity_tag,
      energy_level: row.energy_level,
      latest_luck: row.latest_luck,
      private_note: row.private_note,
      element_color: row.element_color,
      is_pinned: row.is_pinned || false,
      relationship_type: row.relationship_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('创建档案失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`创建档案失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 更新档案
 * 
 * @param userId 用户ID（用于权限验证）
 * @param archiveId 档案ID
 * @param data 更新数据（部分字段）
 * @returns Promise<ProfileArchive> 更新后的档案数据
 */
export async function updateArchive(
  userId: string,
  archiveId: string,
  data: UpdateProfileArchiveRequest
): Promise<ProfileArchive> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和档案ID必须有效');
  }

  // 🛡️ 安全加固：清理 data 对象中可能存在的恶意字段
  // 确保 user_id 和 id 等敏感字段不能被更新
  // 只允许更新白名单中的字段
  const sanitizedData: UpdateProfileArchiveRequest = {
    name: data.name,
    identity_tag: data.identity_tag,
    energy_level: data.energy_level,
    latest_luck: data.latest_luck,
    private_note: data.private_note,
    element_color: data.element_color,
    is_pinned: data.is_pinned,
    relationship_type: data.relationship_type,
  };
  // 明确排除任何可能的 user_id、id 等字段（即使 TypeScript 类型中没有定义）
  // 这是双重保险，防止恶意请求尝试修改敏感字段

  // 验证 energy_level（如果提供）
  if (sanitizedData.energy_level && !['strong', 'weak', 'balanced'].includes(sanitizedData.energy_level)) {
    throw new Error('参数错误：energy_level 必须是 strong、weak 或 balanced 之一');
  }

  // 验证名称（如果提供）
  if (sanitizedData.name !== undefined) {
    const trimmedName = sanitizedData.name.trim();
    if (!trimmedName) {
      throw new Error('参数错误：档案名称不能为空');
    }
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 先查询现有记录，验证权限
    const existingResult = await client.query(
      `SELECT * FROM public.profiles_archives
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [archiveId, userId]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('存档不存在或无权访问');
    }

    // 构建更新字段
    // ✅ 使用白名单方式，只允许更新特定字段，防止 SQL 注入和字段覆盖攻击
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    // ✅ 安全：使用 sanitizedData，确保只处理白名单中的字段
    if (sanitizedData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(sanitizedData.name.trim());
      paramIndex++;
    }

    if (sanitizedData.identity_tag !== undefined) {
      updateFields.push(`identity_tag = $${paramIndex}`);
      updateValues.push(sanitizedData.identity_tag || null);
      paramIndex++;
    }

    if (sanitizedData.energy_level !== undefined) {
      updateFields.push(`energy_level = $${paramIndex}`);
      updateValues.push(sanitizedData.energy_level || null);
      paramIndex++;
    }

    if (sanitizedData.latest_luck !== undefined) {
      updateFields.push(`latest_luck = $${paramIndex}`);
      updateValues.push(sanitizedData.latest_luck || null);
      paramIndex++;
    }

    if (sanitizedData.private_note !== undefined) {
      updateFields.push(`private_note = $${paramIndex}`);
      updateValues.push(sanitizedData.private_note || null);
      paramIndex++;
    }

    if (sanitizedData.element_color !== undefined) {
      updateFields.push(`element_color = $${paramIndex}`);
      updateValues.push(sanitizedData.element_color || null);
      paramIndex++;
    }

    if (sanitizedData.is_pinned !== undefined) {
      updateFields.push(`is_pinned = $${paramIndex}`);
      updateValues.push(sanitizedData.is_pinned);
      paramIndex++;
    }

    if (sanitizedData.relationship_type !== undefined) {
      updateFields.push(`relationship_type = $${paramIndex}`);
      updateValues.push(sanitizedData.relationship_type || null);
      paramIndex++;
    }

    // 如果没有要更新的字段，直接返回现有记录
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      const existing = existingResult.rows[0];
      return {
        id: existing.id,
        user_id: existing.user_id,
        name: existing.name,
        birth_data: typeof existing.birth_data === 'string' 
          ? JSON.parse(existing.birth_data) 
          : existing.birth_data,
        identity_tag: existing.identity_tag,
        energy_level: existing.energy_level,
        latest_luck: existing.latest_luck,
        private_note: existing.private_note,
        element_color: existing.element_color,
        is_pinned: existing.is_pinned || false,
        relationship_type: existing.relationship_type,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      };
    }

    // 添加 updated_at
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(archiveId);
    updateValues.push(userId);

    // 执行更新
    const updateQuery = `
      UPDATE public.profiles_archives
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING 
        id, user_id, name, birth_data, identity_tag, energy_level,
        latest_luck, private_note, element_color, is_pinned,
        relationship_type, created_at, updated_at
    `;

    const result = await client.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('更新失败');
    }

    await client.query('COMMIT');

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      birth_data: typeof row.birth_data === 'string' 
        ? JSON.parse(row.birth_data) 
        : row.birth_data,
      identity_tag: row.identity_tag,
      energy_level: row.energy_level,
      latest_luck: row.latest_luck,
      private_note: row.private_note,
      element_color: row.element_color,
      is_pinned: row.is_pinned || false,
      relationship_type: row.relationship_type,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('更新档案失败:', {
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
 * 删除档案
 * 
 * @param userId 用户ID（用于权限验证）
 * @param archiveId 档案ID
 * @returns Promise<{ success: boolean }> 删除结果
 */
export async function deleteArchive(
  userId: string,
  archiveId: string
): Promise<{ success: boolean }> {
  if (!userId || !archiveId) {
    throw new Error('参数错误：用户ID和档案ID必须有效');
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 先查询存档信息，确认是否存在且有权删除
    const archiveResult = await client.query(
      `SELECT id FROM public.profiles_archives
       WHERE id = $1 AND user_id = $2
       FOR UPDATE`,
      [archiveId, userId]
    );

    if (archiveResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('存档不存在或无权访问');
    }

    // 执行删除
    await client.query(
      `DELETE FROM public.profiles_archives
       WHERE id = $1 AND user_id = $2`,
      [archiveId, userId]
    );

    await client.query('COMMIT');

    return { success: true };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('删除档案失败:', {
      userId,
      archiveId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

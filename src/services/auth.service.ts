import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { pool, queryWithTimeout } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password';
import { sendPasswordResetEmail } from './email.service';

/**
 * 认证服务模块
 * 提供用户注册、登录、Token 验证等功能
 */

export interface User {
  id: string;
  email: string;
  encrypted_password: string;
  created_at: Date;
}

export interface RegisterResult {
  userId: string;
  email: string;
  username: string;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * 用户注册
 * 在一个事务中同时创建 auth.users 和 profiles 记录
 * 
 * @param email 用户邮箱
 * @param password 明文密码
 * @param username 用户名（可选，默认使用邮箱前缀）
 * @returns Promise<RegisterResult> 注册结果
 */
export async function register(
  email: string,
  password: string,
  username?: string
): Promise<RegisterResult> {
  // 验证输入
  if (!email || !email.includes('@')) {
    throw new Error('邮箱格式不正确');
  }

  if (!password || password.length < 8) {
    throw new Error('密码长度至少 8 位');
  }

  // 生成用户名（如果没有提供）
  const finalUsername = username || email.split('@')[0];

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 检查用户是否已存在
    const existingUser = await client.query(
      'SELECT id FROM auth.users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error('该邮箱已被注册');
    }

    // 2. 加密密码（兼容 Supabase bcrypt 格式）
    const passwordHash = await hashPassword(password);

    // 3. 生成用户ID（使用 Node.js 内置的 crypto.randomUUID）
    const userId = randomUUID();

    // 4. 创建 auth.users 记录
    await client.query(
      `INSERT INTO auth.users (
        id, 
        email, 
        encrypted_password, 
        raw_user_meta_data, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [
        userId,
        email.toLowerCase(),
        passwordHash,
        JSON.stringify({
          username: finalUsername,
        }),
      ]
    );

    // 5. 🔥 关键修复：创建 profiles 记录（在同一事务中）
    // 移除 ON CONFLICT DO NOTHING，确保创建失败时抛出错误
    // 添加创建后验证，确保 Profile 真的创建成功
    const profileInsertResult = await client.query(
      `INSERT INTO public.profiles (
        id, 
        email, 
        role, 
        username, 
        tier,
        preferences, 
        registration_bonus_granted, 
        last_check_in_date, 
        consecutive_check_in_days,
        tianji_coins_balance,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NULL, 0, 0, NOW(), NOW())`,
      [
        userId,
        email.toLowerCase(),
        'user', // 默认角色
        finalUsername,
        'explorer', // 默认等级
        JSON.stringify({
          theme: 'default',
          language: 'zh-CN',
          notifications: true,
        }),
      ]
    );

    // 验证 Profile 是否真的创建成功
    const profileVerifyResult = await client.query(
      'SELECT id FROM public.profiles WHERE id = $1',
      [userId]
    );

    if (profileVerifyResult.rows.length === 0) {
      throw new Error('Profile 创建失败：创建后验证未找到记录');
    }

    // 6. 发放注册奖励（如果数据库中有 grant_registration_bonus 函数）
    try {
      await client.query('SELECT grant_registration_bonus($1, $2)', [
        userId,
        20, // 20 个天机币
      ]);
    } catch (error) {
      // 如果函数不存在，记录警告但不影响注册流程
      console.warn('注册奖励发放失败（函数可能不存在）:', error);
    }

    // 提交事务
    await client.query('COMMIT');

    return {
      userId,
      email: email.toLowerCase(),
      username: finalUsername,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    // 处理已知错误
    if (error.message === '该邮箱已被注册') {
      throw error;
    }

    // 处理数据库约束错误
    if (error.code === '23505') {
      // 唯一约束违反
      throw new Error('该邮箱或用户名已被使用');
    }

    // 其他错误
    console.error('用户注册失败:', error);
    throw new Error('注册失败，请稍后重试');
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 用户登录
 * 验证邮箱和密码，生成 JWT Token
 * 
 * @param email 用户邮箱
 * @param password 明文密码
 * @returns Promise<LoginResult> 登录结果（包含用户信息和 Token）
 */
export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  // 验证输入
  if (!email || !password) {
    throw new Error('邮箱和密码不能为空');
  }

  try {
    console.log(`[Auth Service] 开始查询用户: ${email}`);
    // 查询用户（使用带超时的查询）
    const result = await queryWithTimeout(
      'SELECT id, email, encrypted_password FROM auth.users WHERE email = $1',
      [email.toLowerCase()],
      5000 // 5秒超时
    );
    console.log(`[Auth Service] 用户查询完成，找到 ${result.rows.length} 条记录`);

    if (result.rows.length === 0) {
      console.log(`[Auth Service] 用户不存在: ${email}`);
      throw new Error('邮箱或密码错误');
    }

    const user = result.rows[0];

    // 验证密码（兼容 Supabase bcrypt 格式）
    console.log(`[Auth Service] 开始验证密码`);
    const isValid = await verifyPassword(password, user.encrypted_password);

    if (!isValid) {
      console.log(`[Auth Service] 密码验证失败: ${email}`);
      throw new Error('邮箱或密码错误');
    }
    console.log(`[Auth Service] 密码验证成功`);

    // 生成 JWT Token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[Auth Service] JWT_SECRET 未配置');
      throw new Error('JWT_SECRET 未配置');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    console.log(`[Auth Service] 开始生成 JWT Token`);
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn: expiresIn,
      } as jwt.SignOptions
    );
    console.log(`[Auth Service] JWT Token 生成成功`);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      token,
    };
  } catch (error: any) {
    // 如果是已知的业务错误，直接抛出
    if (
      error.message === '邮箱和密码不能为空' ||
      error.message === '邮箱或密码错误' ||
      error.message === 'JWT_SECRET 未配置'
    ) {
      throw error;
    }

    // 数据库查询错误
    if (error.message?.includes('数据库查询超时') || error.code === 'ETIMEDOUT') {
      console.error('[Auth Service] 数据库查询超时:', {
        email,
        error: error.message,
        code: error.code,
      });
      throw new Error('数据库连接超时，请稍后重试');
    }

    // 数据库连接错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('[Auth Service] 数据库连接失败:', {
        email,
        error: error.message,
        code: error.code,
      });
      throw new Error('数据库连接失败，请稍后重试');
    }

    // 其他未知错误
    console.error('[Auth Service] 登录过程发生未知错误:', {
      email,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
    });
    throw new Error('登录失败，请稍后重试');
  }
}

/**
 * 验证 JWT Token
 * 解析并验证 Token 的有效性
 * 
 * @param token JWT Token 字符串
 * @returns Promise<TokenPayload> Token 载荷（包含用户信息）
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 未配置');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token 已过期');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token 格式错误');
    } else {
      throw new Error('Token 验证失败');
    }
  }
}

/**
 * 根据用户ID获取用户信息
 * 
 * @param userId 用户ID
 * @returns Promise<User | null> 用户信息或 null
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, encrypted_password, created_at FROM auth.users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as User;
}

/**
 * 根据邮箱获取用户信息
 * 
 * @param email 用户邮箱
 * @returns Promise<User | null> 用户信息或 null
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, email, encrypted_password, created_at FROM auth.users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as User;
}

/**
 * 请求密码重置
 * 验证邮箱是否存在，生成密码重置 Token，并发送重置邮件
 * 
 * @param email 用户邮箱
 * @returns Promise<{ success: boolean; message: string }> 请求结果
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  // 验证输入
  if (!email || !email.includes('@')) {
    throw new Error('邮箱格式不正确');
  }

  // 查询用户是否存在
  const user = await getUserByEmail(email);

  // 为了安全，无论用户是否存在都返回成功消息（防止邮箱枚举攻击）
  // 但实际只在用户存在时发送邮件
  if (!user) {
    // 用户不存在，但仍返回成功消息（安全考虑）
    console.log(`⚠️  密码重置请求：邮箱 ${email} 不存在，但返回成功消息（安全考虑）`);
    return {
      success: true,
      message: '如果该邮箱已注册，密码重置链接已发送到您的邮箱',
    };
  }

  // 生成密码重置 Token（JWT，有效期 1 小时）
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 未配置');
  }

  // 生成重置 Token，包含用户ID和邮箱，有效期 1 小时
  const resetToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: 'password_reset', // 标记为密码重置 Token
    },
    jwtSecret,
    {
      expiresIn: '1h', // 1 小时有效期
    } as jwt.SignOptions
  );

  // 发送密码重置邮件
  const emailSent = await sendPasswordResetEmail(email, resetToken, '');

  if (!emailSent) {
    // 如果邮件发送失败，记录错误但为了安全仍返回成功消息
    console.error(`❌ 密码重置邮件发送失败：${email}`);
    // 在生产环境中，如果邮件服务配置了但发送失败，应该抛出错误
    // 但在开发环境中，允许继续（因为可能只是日志模式）
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      throw new Error('邮件发送失败，请稍后重试');
    }
  }

  return {
    success: true,
    message: '如果该邮箱已注册，密码重置链接已发送到您的邮箱',
  };
}

/**
 * 合并游客数据到正式用户账号
 * 将游客产生的数据（命盘、解读结果、档案）合并到正式用户账号下
 * 
 * @param targetUserId 目标用户ID（正式用户）
 * @param guestUserId 游客用户ID
 * @param options 合并选项
 * @returns Promise<{ merged: { charts: number, insights: number, profiles: number } }>
 */
export async function mergeGuestData(
  targetUserId: string,
  guestUserId: string,
  options?: {
    profileId?: string;
    chartId?: string;
    sessionIds?: string[];
  }
): Promise<{ merged: { charts: number; insights: number; profiles: number } }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 验证目标用户和游客用户是否存在
    const targetUserCheck = await client.query(
      'SELECT 1 FROM public.profiles WHERE id = $1',
      [targetUserId]
    );
    if (targetUserCheck.rows.length === 0) {
      throw new Error('目标用户不存在');
    }

    const guestUserCheck = await client.query(
      'SELECT 1 FROM public.profiles WHERE id = $1',
      [guestUserId]
    );
    if (guestUserCheck.rows.length === 0) {
      throw new Error('游客用户不存在');
    }

    let chartsMerged = 0;
    let insightsMerged = 0;
    let profilesMerged = 0;

    // 1. 合并命盘存档（star_charts）
    if (options?.chartId) {
      const chartResult = await client.query(
        `UPDATE public.star_charts 
         SET profile_id = $1 
         WHERE profile_id = $2 AND id = $3`,
        [targetUserId, guestUserId, options.chartId]
      );
      chartsMerged = chartResult.rowCount || 0;
    } else {
      // 合并所有命盘
      const chartResult = await client.query(
        `UPDATE public.star_charts 
         SET profile_id = $1 
         WHERE profile_id = $2`,
        [targetUserId, guestUserId]
      );
      chartsMerged = chartResult.rowCount || 0;
    }

    // 2. 合并命盘档案（ziwei_chart_archives）
    const archiveResult = await client.query(
      `UPDATE public.ziwei_chart_archives 
       SET user_id = $1 
       WHERE user_id = $2`,
      [targetUserId, guestUserId]
    );
    chartsMerged += archiveResult.rowCount || 0;

    // 3. 合并收藏洞察（saved_insights）
    if (options?.sessionIds && options.sessionIds.length > 0) {
      const insightResult = await client.query(
        `UPDATE public.saved_insights 
         SET user_id = $1 
         WHERE user_id = $2 AND session_id = ANY($3::uuid[])`,
        [targetUserId, guestUserId, options.sessionIds]
      );
      insightsMerged = insightResult.rowCount || 0;
    } else {
      // 合并所有收藏洞察
      const insightResult = await client.query(
        `UPDATE public.saved_insights 
         SET user_id = $1 
         WHERE user_id = $2`,
        [targetUserId, guestUserId]
      );
      insightsMerged = insightResult.rowCount || 0;
    }

    // 4. 合并档案（profiles_archives）
    if (options?.profileId) {
      const profileResult = await client.query(
        `UPDATE public.profiles_archives 
         SET user_id = $1 
         WHERE user_id = $2 AND id = $3`,
        [targetUserId, guestUserId, options.profileId]
      );
      profilesMerged = profileResult.rowCount || 0;
    } else {
      // 合并所有档案
      const profileResult = await client.query(
        `UPDATE public.profiles_archives 
         SET user_id = $1 
         WHERE user_id = $2`,
        [targetUserId, guestUserId]
      );
      profilesMerged = profileResult.rowCount || 0;
    }

    // 5. 合并解锁时空资产（unlocked_time_assets）
    await client.query(
      `UPDATE public.unlocked_time_assets 
       SET user_id = $1 
       WHERE user_id = $2`,
      [targetUserId, guestUserId]
    );

    // 6. 合并任务记录（user_tasks）
    await client.query(
      `UPDATE public.user_tasks 
       SET user_id = $1 
       WHERE user_id = $2`,
      [targetUserId, guestUserId]
    );

    // 7. 合并成就（user_achievements）
    // 使用 INSERT ... ON CONFLICT 避免重复成就
    await client.query(
      `INSERT INTO public.user_achievements (user_id, achievement_type, metadata)
       SELECT $1, achievement_type, metadata
       FROM public.user_achievements
       WHERE user_id = $2
       ON CONFLICT (user_id, achievement_type) DO NOTHING`,
      [targetUserId, guestUserId]
    );

    await client.query('COMMIT');

    return {
      merged: {
        charts: chartsMerged,
        insights: insightsMerged,
        profiles: profilesMerged,
      },
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('[Auth Service] 合并游客数据失败:', {
      targetUserId,
      guestUserId,
      error: error.message,
    });
    throw new Error(`合并游客数据失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

import { pool } from '../config/database';
import { adminAdjustCoins } from './coins.service';

/**
 * 管理员服务模块
 * 提供用户管理、交易流水查询、数据统计等功能
 */

/**
 * 用户列表查询参数接口
 */
export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string; // 搜索关键词（邮箱、用户名）
  role?: string; // 角色筛选
  tier?: string; // 等级筛选
  sortBy?: string; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
}

/**
 * 用户信息接口（列表）
 */
export interface UserListItem {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  tier: string | null;
  tianji_coins_balance: number | null;
  created_at: Date | null;
  last_check_in_date: string | null;
  consecutive_check_in_days: number | null;
}

/**
 * 用户详情接口
 */
export interface UserDetail extends UserListItem {
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  birthday: string | null;
  gender: string | null;
  phone: string | null;
  website: string | null;
  preferences: any;
  subscription_status: string | null;
  subscription_end_at: Date | null;
  daily_coins_grant: number | null;
  activity_coins_grant: number | null;
  daily_coins_grant_expires_at: Date | null;
  activity_coins_grant_expires_at: Date | null;
  last_coins_reset_at: Date | null;
  registration_bonus_granted: boolean | null;
  updated_at: Date | null;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 交易流水查询参数接口
 */
export interface TransactionListParams {
  page?: number;
  pageSize?: number;
  userId?: string; // 用户ID筛选
  startDate?: string; // 开始日期（ISO格式）
  endDate?: string; // 结束日期（ISO格式）
  type?: string; // 交易类型筛选
  status?: string; // 状态筛选
}

/**
 * 天机币交易记录接口
 */
export interface CoinTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  coins_amount: number | null;
  item_type: string | null;
  pack_type: string | null;
  description: string | null;
  operator_id: string | null;
  status: string | null;
  paid_at: Date | null;
  payment_provider: string | null;
  is_first_purchase: boolean | null;
  created_at: Date;
  // 关联用户信息
  user_email?: string | null;
  user_username?: string | null;
}

/**
 * 支付交易记录接口
 */
export interface PaymentTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  coins_amount: number | null;
  item_type: string | null;
  pack_type: string | null;
  description: string | null;
  operator_id: string | null;
  status: string | null;
  paid_at: Date | null;
  payment_provider: string | null;
  is_first_purchase: boolean | null;
  created_at: Date;
  // 关联用户信息
  user_email?: string | null;
  user_username?: string | null;
}

/**
 * 数据概览统计接口
 */
export interface OverviewStats {
  totalUsers: number;
  activeUsers: number; // 最近30天活跃用户
  totalRevenue: number; // 总收入（元）
  totalCoinsGranted: number; // 总发放天机币
  totalCoinsConsumed: number; // 总消费天机币
  todayNewUsers: number; // 今日新增用户
  todayRevenue: number; // 今日收入（元）
  todayCoinsGranted: number; // 今日发放天机币
  todayCoinsConsumed: number; // 今日消费天机币
}

/**
 * 用户统计接口
 */
export interface UserStats {
  totalUsers: number;
  usersByTier: {
    tier: string;
    count: number;
  }[];
  usersByRole: {
    role: string;
    count: number;
  }[];
  newUsersByDay: {
    date: string;
    count: number;
  }[];
}

/**
 * 收入统计接口
 */
export interface RevenueStats {
  totalRevenue: number; // 总收入（元）
  revenueByDay: {
    date: string;
    revenue: number;
  }[];
  revenueByPackType: {
    pack_type: string;
    revenue: number;
    count: number;
  }[];
  averageOrderValue: number; // 平均订单金额
}

/**
 * 获取用户列表（分页、搜索、筛选）
 * 
 * @param params 查询参数
 * @returns Promise<PaginatedResult<UserListItem>> 用户列表
 */
export async function getUserList(
  params: UserListParams = {}
): Promise<PaginatedResult<UserListItem>> {
  try {
    console.log('🔍 [getUserList Service] 开始处理，参数:', params);
    
    const {
      page = 1,
      pageSize = 20,
      search,
      role,
      tier,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    // 构建WHERE条件
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 搜索条件（邮箱或用户名）
    if (search) {
      conditions.push(
        `(p.email ILIKE $${paramIndex} OR p.username ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    // 角色筛选
    if (role) {
      conditions.push(`p.role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    // 等级筛选
    if (tier) {
      conditions.push(`p.tier = $${paramIndex}`);
      values.push(tier);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 排序字段验证（防止SQL注入）
    const allowedSortFields = [
      'created_at',
      'email',
      'username',
      'tier',
      'tianji_coins_balance',
    ];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM public.profiles p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);

    // 查询数据（需要为 LIMIT 和 OFFSET 添加参数）
    const dataQuery = `
      SELECT 
        p.id,
        p.email,
        p.username,
        p.role,
        p.tier,
        p.tianji_coins_balance,
        p.created_at,
        p.last_check_in_date,
        p.consecutive_check_in_days
      FROM public.profiles p
      ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    // 为 LIMIT 和 OFFSET 添加参数值
    console.log('🔍 [getUserList Service] 执行数据查询，paramIndex:', paramIndex, 'values长度:', values.length);
    const dataValues = [...values, pageSize, offset];
    console.log('🔍 [getUserList Service] SQL查询:', dataQuery);
    console.log('🔍 [getUserList Service] 查询参数:', dataValues);
    
    const dataResult = await pool.query(dataQuery, dataValues);
    console.log('✅ [getUserList Service] 查询成功，返回', dataResult.rows.length, '条数据');

    return {
      data: dataResult.rows as UserListItem[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error: any) {
    console.error('❌ [getUserList Service] 查询失败:', error);
    console.error('❌ [getUserList Service] 错误堆栈:', error.stack);
    throw error;
  }
}

/**
 * 获取用户详情
 * 
 * @param userId 用户ID
 * @returns Promise<UserDetail | null> 用户详情或 null
 * @throws Error 如果userId格式无效
 */
export async function getUserDetail(
  userId: string
): Promise<UserDetail | null> {
  // 验证UUID格式（PostgreSQL会抛出错误，提前检查）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return null; // 返回null，让controller处理404
  }

  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        p.email,
        p.username,
        p.avatar_url,
        p.bio,
        p.location,
        p.birthday,
        p.gender,
        p.phone,
        p.website,
        p.preferences,
        p.role,
        p.tier,
        p.subscription_status,
        p.subscription_end_at,
        p.tianji_coins_balance,
        p.daily_coins_grant,
        p.activity_coins_grant,
        p.daily_coins_grant_expires_at,
        p.activity_coins_grant_expires_at,
        p.last_coins_reset_at,
        p.last_check_in_date,
        p.consecutive_check_in_days,
        p.registration_bonus_granted,
        p.created_at,
        p.updated_at
      FROM public.profiles p
      WHERE p.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserDetail;
  } catch (error: any) {
    // 如果是UUID格式错误，返回null
    if (error.message && error.message.includes('invalid input syntax for type uuid')) {
      return null;
    }
    throw error;
  }
}

/**
 * 修改用户等级
 * 
 * @param operatorId 操作人ID（管理员）
 * @param userId 目标用户ID
 * @param tier 新等级（'guest' | 'explorer' | 'basic' | 'premium' | 'vip'）
 * @returns Promise<void>
 * 
 * @throws Error 如果修改失败
 */
export async function updateUserTier(
  operatorId: string,
  userId: string,
  tier: string
): Promise<void> {
  console.log('🔍 [updateUserTier Service] 开始处理，参数:', {
    operatorId,
    userId,
    tier,
  });

  // 参数验证
  if (!userId || !tier) {
    throw new Error('参数错误：用户ID和等级必须有效');
  }

  // 验证等级值
  // 等级体系：guest(游客) -> explorer(探索者) -> basic(开悟者) -> premium(天命师) -> vip(玄机大师)
  const validTiers = ['guest', 'explorer', 'basic', 'premium', 'vip'];
  const tierLower = tier.toLowerCase();
  
  if (!validTiers.includes(tierLower)) {
    throw new Error(`参数错误：等级必须是以下之一：${validTiers.join(', ')}`);
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 检查用户是否存在
    const userCheck = await client.query(
      'SELECT id, tier FROM public.profiles WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('用户不存在');
    }

    const oldTier = userCheck.rows[0].tier;
    console.log('🔍 [updateUserTier Service] 用户当前等级:', oldTier, '-> 新等级:', tierLower);

    // 2. 更新用户档案 (profiles 表)
    await client.query(
      `UPDATE public.profiles 
       SET tier = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [tierLower, userId]
    );

    // 3. 🟢 关键修复：同步处理订阅表 (subscriptions 表)
    const isFreeTier = tierLower === 'guest' || tierLower === 'explorer';
    
    if (isFreeTier) {
      // ⬇️ 场景 A: 降级为免费等级
      // 必须把当前的活跃订阅强制取消或标记为结束
      const cancelResult = await client.query(
        `UPDATE public.subscriptions 
         SET status = 'cancelled', 
             auto_renew = false,
             updated_at = NOW() 
         WHERE user_id = $1 AND status = 'active'
         RETURNING id`,
        [userId]
      );

      if (cancelResult.rows.length > 0) {
        console.log('✅ [updateUserTier Service] 已取消活跃订阅:', {
          userId,
          cancelledSubscriptions: cancelResult.rows.length,
        });
      }
    } else {
      // ⬆️ 场景 B: 调整为其他付费等级 (如 basic -> premium)
      // 检查是否有活跃订阅
      const subRes = await client.query(
        `SELECT id FROM public.subscriptions WHERE user_id = $1 AND status = 'active'`,
        [userId]
      );

      if (subRes.rows.length > 0) {
        // 如果有，更新它的等级
        await client.query(
          `UPDATE public.subscriptions 
           SET tier = $1, updated_at = NOW() 
           WHERE user_id = $2 AND status = 'active'`,
          [tierLower, userId]
        );
        console.log('✅ [updateUserTier Service] 已更新活跃订阅等级:', {
          userId,
          newTier: tierLower,
          updatedSubscriptions: subRes.rows.length,
        });
      } else {
        // 如果没有活跃订阅但管理员强行设为付费会员，
        // 仅更新 profile 即可，前端以 profile.tier 为准
        console.log('ℹ️ [updateUserTier Service] 用户无活跃订阅，仅更新 profile.tier:', {
          userId,
          newTier: tierLower,
        });
      }
    }

    // 提交事务
    await client.query('COMMIT');
    console.log('✅ [updateUserTier Service] 用户等级更新成功:', {
      userId,
      oldTier,
      newTier: tierLower,
      operatorId,
    });
    
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');
    console.error('❌ [updateUserTier Service] 更新用户等级失败:', {
      userId,
      tier: tierLower,
      operatorId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 更新用户角色
 * 
 * @param operatorId 操作人ID（管理员）
 * @param userId 目标用户ID
 * @param role 新角色（'admin' | 'user'）
 * @returns Promise<void>
 * 
 * @throws Error 如果修改失败
 */
export async function updateUserRole(
  operatorId: string,
  userId: string,
  role: string
): Promise<void> {
  console.log('🔍 [updateUserRole Service] 开始处理，参数:', {
    operatorId,
    userId,
    role,
  });

  // 参数验证
  if (!userId || !role) {
    throw new Error('参数错误：用户ID和角色必须有效');
  }

  // 验证角色值
  const validRoles = ['admin', 'user'];
  if (!validRoles.includes(role)) {
    throw new Error(`参数错误：角色必须是以下之一：${validRoles.join(', ')}`);
  }

  // 检查用户是否存在，并获取当前角色
  const userCheck = await pool.query(
    'SELECT id, email, username, role FROM public.profiles WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('用户不存在');
  }

  const oldRole = userCheck.rows[0].role;
  console.log('🔍 [updateUserRole Service] 用户当前角色:', oldRole, '-> 新角色:', role);

  // 更新用户角色
  const updateResult = await pool.query(
    `UPDATE public.profiles 
     SET role = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role`,
    [role, userId]
  );

  if (updateResult.rows.length === 0) {
    throw new Error('更新用户角色失败：未找到要更新的用户');
  }

  const updatedUser = updateResult.rows[0];
  console.log('✅ [updateUserRole Service] 用户角色更新成功:', {
    userId: updatedUser.id,
    email: updatedUser.email,
    oldRole,
    newRole: updatedUser.role,
  });

  // 验证更新是否成功
  if (updatedUser.role !== role) {
    console.error('❌ [updateUserRole Service] 警告：角色更新后不匹配！', {
      expected: role,
      actual: updatedUser.role,
    });
    throw new Error('更新用户角色失败：角色更新后不匹配');
  }
}

/**
 * 调整用户天机币（调用已有的管理员调整函数）
 * 
 * @param operatorId 操作人ID（管理员）
 * @param userId 目标用户ID
 * @param adjustmentAmount 调整金额（正数为增加，负数为减少）
 * @param reason 调整原因
 * @param coinType 天机币类型（可选，默认 'tianji_coins_balance'）
 * @returns Promise<{ success: boolean; message?: string; new_balance?: number }>
 * 
 * @throws Error 如果调整失败
 */
export async function adjustUserCoins(
  operatorId: string,
  userId: string,
  adjustmentAmount: number,
  reason: string = '管理员调整',
  coinType: 'tianji_coins_balance' | 'daily_coins_grant' | 'activity_coins_grant' = 'tianji_coins_balance'
): Promise<{ success: boolean; message?: string; new_balance?: number }> {
  return await adminAdjustCoins(
    operatorId,
    userId,
    adjustmentAmount,
    reason,
    coinType
  );
}

/**
 * 获取天机币交易流水（管理员查询）
 * 
 * @param params 查询参数
 * @returns Promise<PaginatedResult<CoinTransaction>> 交易流水列表
 */
export async function getCoinTransactions(
  params: TransactionListParams = {}
): Promise<PaginatedResult<CoinTransaction>> {
  const {
    page = 1,
    pageSize = 20,
    userId,
    startDate,
    endDate,
    type,
    status,
  } = params;

  console.log('🔍 [getCoinTransactions Service] 开始处理，参数:', {
    page,
    pageSize,
    userId,
    startDate,
    endDate,
    type,
    status,
  });

  // 构建WHERE条件
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // 只查询天机币相关交易（排除支付交易 type = 'purchase'）
  // 天机币交易包括：deduct（扣费）、grant（发放）、admin_adjust（管理员调整）等
  const coinTransactionTypes = ['deduct', 'grant', 'admin_adjust', 'checkin_reward', 'registration_bonus'];
  conditions.push(`t.type = ANY($${paramIndex}::text[])`);
  values.push(coinTransactionTypes);
  paramIndex++;

  // 用户ID筛选
  if (userId) {
    console.log('🔍 [getCoinTransactions Service] 添加用户ID筛选条件:', userId);
    conditions.push(`t.user_id = $${paramIndex}`);
    values.push(userId);
    paramIndex++;
  } else {
    console.log('⚠️ [getCoinTransactions Service] 未提供用户ID，将查询所有用户的天机币交易');
  }

  // 日期范围筛选
  if (startDate) {
    conditions.push(`t.created_at >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`t.created_at <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }

  // 交易类型筛选（如果指定了类型，会覆盖默认的天机币交易类型过滤）
  if (type) {
    // 如果指定了类型，移除默认的类型过滤，使用指定的类型
    conditions[0] = `t.type = $${paramIndex}`;
    values[0] = type;
    paramIndex++;
  }

  // 状态筛选
  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 计算偏移量
  const offset = (page - 1) * pageSize;

  // 查询总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM public.transactions t
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  // 查询数据（关联用户信息）
  const dataQuery = `
    SELECT 
      t.id,
      t.user_id,
      t.type,
      t.amount,
      t.coins_amount,
      t.item_type,
      t.pack_type,
      t.description,
      t.operator_id,
      t.status,
      t.paid_at,
      t.payment_provider,
      t.is_first_purchase,
      t.created_at,
      p.email as user_email,
      p.username as user_username
    FROM public.transactions t
    LEFT JOIN public.profiles p ON t.user_id = p.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  const dataValues = [...values, pageSize, offset];
  console.log('🔍 [getCoinTransactions Service] 执行数据查询:', dataQuery);
  console.log('🔍 [getCoinTransactions Service] 数据查询参数:', dataValues);
  const dataResult = await pool.query(dataQuery, dataValues);
  console.log('✅ [getCoinTransactions Service] 数据查询成功，返回', dataResult.rows.length, '条记录');

  return {
    data: dataResult.rows as CoinTransaction[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取支付交易流水（管理员查询）
 * 
 * @param params 查询参数
 * @returns Promise<PaginatedResult<PaymentTransaction>> 交易流水列表
 */
export async function getPaymentTransactions(
  params: TransactionListParams = {}
): Promise<PaginatedResult<PaymentTransaction>> {
  const {
    page = 1,
    pageSize = 20,
    userId,
    startDate,
    endDate,
    type,
    status,
  } = params;

  // 构建WHERE条件
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // ✅ 修复：交易类型筛选（重构逻辑，避免参数错位）
  // 如果指定了type，使用指定的type；否则默认查询 'purchase'
  if (type) {
    conditions.push(`t.type = $${paramIndex}`);
    values.push(type);
    paramIndex++;
  } else {
    // 默认查询支付交易
    conditions.push(`t.type = 'purchase'`);
  }

  // 用户ID筛选
  if (userId) {
    conditions.push(`t.user_id = $${paramIndex}`);
    values.push(userId);
    paramIndex++;
  }

  // 日期范围筛选
  if (startDate) {
    conditions.push(`t.created_at >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`t.created_at <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }

  // 状态筛选
  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 计算偏移量
  const offset = (page - 1) * pageSize;

  // 查询总数
  const countQuery = `
    SELECT COUNT(*) as total
    FROM public.transactions t
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  // 查询数据（关联用户信息）
  const dataQuery = `
    SELECT 
      t.id,
      t.user_id,
      t.type,
      t.amount,
      t.coins_amount,
      t.item_type,
      t.pack_type,
      t.description,
      t.operator_id,
      t.status,
      t.paid_at,
      t.payment_provider,
      t.is_first_purchase,
      t.created_at,
      p.email as user_email,
      p.username as user_username
    FROM public.transactions t
    LEFT JOIN public.profiles p ON t.user_id = p.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  values.push(pageSize, offset);
  const dataResult = await pool.query(dataQuery, values);

  return {
    data: dataResult.rows as PaymentTransaction[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取数据概览统计
 * 
 * @returns Promise<OverviewStats> 数据概览统计
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  // 查询总用户数
  const totalUsersResult = await pool.query(
    'SELECT COUNT(*) as count FROM public.profiles'
  );
  const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

  // 查询最近30天活跃用户（有签到记录或交易记录）
  const activeUsersResult = await pool.query(
    `SELECT COUNT(DISTINCT id) as count
     FROM (
       SELECT id FROM public.profiles 
       WHERE last_check_in_date >= CURRENT_DATE - INTERVAL '30 days'
       UNION
       SELECT user_id as id FROM public.transactions 
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
     ) AS active_users`
  );
  const activeUsers = parseInt(activeUsersResult.rows[0].count, 10);

  // 查询总收入（已支付的订单）
  const totalRevenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM public.transactions
     WHERE type = 'purchase' AND status = 'paid'`
  );
  const totalRevenue = parseFloat(totalRevenueResult.rows[0].total) || 0;

  // 查询总发放天机币（充值、签到奖励等）
  // 注意：coins_amount > 0 表示发放，但需要排除支付交易（type = 'purchase'）
  const totalCoinsGrantedResult = await pool.query(
    `SELECT COALESCE(SUM(coins_amount), 0) as total
     FROM public.transactions
     WHERE coins_amount > 0 AND type != 'purchase'`
  );
  const totalCoinsGranted = parseInt(totalCoinsGrantedResult.rows[0].total, 10);

  // 查询总消费天机币（扣费）
  // coins_amount < 0 表示消费（扣费）
  const totalCoinsConsumedResult = await pool.query(
    `SELECT COALESCE(ABS(SUM(coins_amount)), 0) as total
     FROM public.transactions
     WHERE coins_amount < 0`
  );
  const totalCoinsConsumed = parseInt(totalCoinsConsumedResult.rows[0].total, 10);

  // 查询今日新增用户
  const todayNewUsersResult = await pool.query(
    `SELECT COUNT(*) as count
     FROM public.profiles
     WHERE DATE(created_at) = CURRENT_DATE`
  );
  const todayNewUsers = parseInt(todayNewUsersResult.rows[0].count, 10);

  // 查询今日收入
  const todayRevenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM public.transactions
     WHERE type = 'purchase' 
       AND status = 'paid'
       AND DATE(paid_at) = CURRENT_DATE`
  );
  const todayRevenue = parseFloat(todayRevenueResult.rows[0].total) || 0;

  // 查询今日发放天机币（排除支付交易）
  const todayCoinsGrantedResult = await pool.query(
    `SELECT COALESCE(SUM(coins_amount), 0) as total
     FROM public.transactions
     WHERE coins_amount > 0 
       AND type != 'purchase'
       AND DATE(created_at) = CURRENT_DATE`
  );
  const todayCoinsGranted = parseInt(todayCoinsGrantedResult.rows[0].total, 10);

  // 查询今日消费天机币
  const todayCoinsConsumedResult = await pool.query(
    `SELECT COALESCE(ABS(SUM(coins_amount)), 0) as total
     FROM public.transactions
     WHERE coins_amount < 0
       AND DATE(created_at) = CURRENT_DATE`
  );
  const todayCoinsConsumed = parseInt(todayCoinsConsumedResult.rows[0].total, 10);

  return {
    totalUsers,
    activeUsers,
    totalRevenue,
    totalCoinsGranted,
    totalCoinsConsumed,
    todayNewUsers,
    todayRevenue,
    todayCoinsGranted,
    todayCoinsConsumed,
  };
}

/**
 * 获取用户统计
 * 
 * @param days 统计天数（默认30天）
 * @returns Promise<UserStats> 用户统计
 */
export async function getUserStats(
  days: number = 30
): Promise<UserStats> {
  // 查询总用户数
  const totalUsersResult = await pool.query(
    'SELECT COUNT(*) as count FROM public.profiles'
  );
  const totalUsers = parseInt(totalUsersResult.rows[0].count, 10);

  // 查询按等级分组的用户数
  const usersByTierResult = await pool.query(
    `SELECT 
      COALESCE(tier, 'unknown') as tier,
      COUNT(*) as count
     FROM public.profiles
     GROUP BY tier
     ORDER BY count DESC`
  );

  // 查询按角色分组的用户数
  const usersByRoleResult = await pool.query(
    `SELECT 
      COALESCE(role, 'unknown') as role,
      COUNT(*) as count
     FROM public.profiles
     GROUP BY role
     ORDER BY count DESC`
  );

  // 查询最近N天每日新增用户数
  // ✅ 修复：使用参数化查询，避免SQL注入
  // 使用 INTERVAL '1 day' * $1 的方式，安全且正确
  const newUsersByDayResult = await pool.query(
    `SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
     FROM public.profiles
     WHERE created_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [days] // 将 days 作为参数传入
  );

  return {
    totalUsers,
    usersByTier: usersByTierResult.rows.map((row) => ({
      tier: row.tier,
      count: parseInt(row.count, 10),
    })),
    usersByRole: usersByRoleResult.rows.map((row) => ({
      role: row.role,
      count: parseInt(row.count, 10),
    })),
    newUsersByDay: newUsersByDayResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count, 10),
    })),
  };
}

/**
 * 获取收入统计
 * 
 * @param days 统计天数（默认30天）
 * @returns Promise<RevenueStats> 收入统计
 */
export async function getRevenueStats(
  days: number = 30
): Promise<RevenueStats> {
  // 查询总收入
  const totalRevenueResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM public.transactions
     WHERE type = 'purchase' AND status = 'paid'`
  );
  const totalRevenue = parseFloat(totalRevenueResult.rows[0].total) || 0;

  // 查询最近N天每日收入
  // ✅ 修复：使用参数化查询，避免SQL注入
  // 使用 INTERVAL '1 day' * $1 的方式，安全且正确
  const revenueByDayResult = await pool.query(
    `SELECT 
      DATE(paid_at) as date,
      COALESCE(SUM(amount), 0) as revenue
     FROM public.transactions
     WHERE type = 'purchase' 
       AND status = 'paid'
       AND paid_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
     GROUP BY DATE(paid_at)
     ORDER BY date ASC`,
    [days] // 将 days 作为参数传入
  );

  // 查询按套餐类型分组的收入
  const revenueByPackTypeResult = await pool.query(
    `SELECT 
      COALESCE(pack_type, 'unknown') as pack_type,
      COALESCE(SUM(amount), 0) as revenue,
      COUNT(*) as count
     FROM public.transactions
     WHERE type = 'purchase' AND status = 'paid'
     GROUP BY pack_type
     ORDER BY revenue DESC`
  );

  // 查询平均订单金额
  const avgOrderValueResult = await pool.query(
    `SELECT COALESCE(AVG(amount), 0) as avg
     FROM public.transactions
     WHERE type = 'purchase' AND status = 'paid'`
  );
  const averageOrderValue = parseFloat(avgOrderValueResult.rows[0].avg) || 0;

  return {
    totalRevenue,
    revenueByDay: revenueByDayResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      revenue: parseFloat(row.revenue) || 0,
    })),
    revenueByPackType: revenueByPackTypeResult.rows.map((row) => ({
      pack_type: row.pack_type,
      revenue: parseFloat(row.revenue) || 0,
      count: parseInt(row.count, 10),
    })),
    averageOrderValue,
  };
}

import { pool } from '../config/database';

/**
 * 天机币服务模块
 * 提供天机币扣费、查询余额、管理员调整、查询流水等功能
 */

/**
 * 扣费结果接口
 */
export interface DeductCoinsResult {
  success: boolean;
  message?: string;
  error?: string;
  remaining_balance?: number;
  transaction_id?: string;
}

/**
 * 余额信息接口
 */
export interface BalanceInfo {
  tianji_coins_balance: number;
  daily_coins_grant: number;
  activity_coins_grant: number;
  daily_coins_grant_expires_at: Date | null;
  activity_coins_grant_expires_at: Date | null;
}

/**
 * 管理员调整结果接口
 */
export interface AdminAdjustResult {
  success: boolean;
  message?: string;
  error?: string;
  new_balance?: number;
  transaction_id?: string;
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
}

/**
 * 扣费（调用数据库函数 deduct_coins）
 * 
 * @param userId 用户ID
 * @param featureType 功能类型（如 'star_chart', 'time_asset' 等）
 * @param price 扣费金额
 * @returns Promise<DeductCoinsResult> 扣费结果
 * 
 * @throws Error 如果扣费失败（余额不足、参数错误等）
 */
export async function deductCoins(
  userId: string,
  featureType: string,
  price: number
): Promise<DeductCoinsResult> {
  // 参数验证
  if (!userId || !featureType || price <= 0) {
    throw new Error('参数错误：用户ID、功能类型和价格必须有效');
  }

  try {
    // 调用数据库函数 deduct_coins
    // 注意：根据文档，函数已使用显式参数，无需设置会话变量
    const result = await pool.query(
      'SELECT deduct_coins($1, $2, $3) as result',
      [userId, featureType, price]
    );

    const data = result.rows[0].result;

    // 检查函数返回结果
    if (!data || !data.success) {
      throw new Error(data?.error || '扣费失败');
    }

    return {
      success: true,
      message: data.message || '扣费成功',
      remaining_balance: data.remaining_balance,
      transaction_id: data.transaction_id,
    };
  } catch (error: any) {
    // 记录错误日志
    console.error('扣费失败:', {
      userId,
      featureType,
      price,
      error: error.message,
    });

    // 如果是数据库函数返回的错误，直接抛出
    if (error.message) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`扣费操作失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 查询用户天机币余额
 * 
 * @param userId 用户ID
 * @returns Promise<BalanceInfo | null> 余额信息或 null（用户不存在）
 */
export async function getBalance(userId: string): Promise<BalanceInfo | null> {
  try {
    const result = await pool.query(
      `SELECT 
        tianji_coins_balance,
        daily_coins_grant,
        activity_coins_grant,
        daily_coins_grant_expires_at,
        activity_coins_grant_expires_at
      FROM public.profiles
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      tianji_coins_balance: row.tianji_coins_balance || 0,
      daily_coins_grant: row.daily_coins_grant || 0,
      activity_coins_grant: row.activity_coins_grant || 0,
      daily_coins_grant_expires_at: row.daily_coins_grant_expires_at,
      activity_coins_grant_expires_at: row.activity_coins_grant_expires_at,
    };
  } catch (error: any) {
    console.error('查询余额失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`查询余额失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 管理员调整天机币（调用数据库函数 admin_adjust_coins）
 * 
 * @param operatorId 操作人ID（必须是管理员）
 * @param targetUserId 目标用户ID
 * @param adjustmentAmount 调整金额（正数为增加，负数为减少）
 * @param reason 调整原因（可选，默认为'管理员调整'）
 * @param coinType 天机币类型（可选，默认为'tianji_coins_balance'）
 * @returns Promise<AdminAdjustResult> 调整结果
 * 
 * @throws Error 如果操作人不是管理员、调整失败等
 */
export async function adminAdjustCoins(
  operatorId: string,
  targetUserId: string,
  adjustmentAmount: number,
  reason: string = '管理员调整',
  coinType: 'tianji_coins_balance' | 'daily_coins_grant' | 'activity_coins_grant' = 'tianji_coins_balance'
): Promise<AdminAdjustResult> {
  // 参数验证
  if (!operatorId || !targetUserId) {
    throw new Error('参数错误：操作人ID和目标用户ID必须有效');
  }

  if (adjustmentAmount === 0) {
    throw new Error('调整金额不能为0');
  }

  try {
    // 先检查操作人是否为管理员
    const isAdminResult = await pool.query(
      'SELECT is_admin($1) as is_admin',
      [operatorId]
    );

    if (!isAdminResult.rows[0]?.is_admin) {
      throw new Error('只有管理员可以执行此操作');
    }

    // 调用数据库函数 admin_adjust_coins
    const result = await pool.query(
      'SELECT admin_adjust_coins($1, $2, $3, $4, $5) as result',
      [operatorId, targetUserId, adjustmentAmount, reason, coinType]
    );

    const data = result.rows[0].result;

    // 检查函数返回结果
    if (!data || !data.success) {
      throw new Error(data?.error || '调整失败');
    }

    return {
      success: true,
      message: data.message || '调整成功',
      new_balance: data.new_balance,
      transaction_id: data.transaction_id,
    };
  } catch (error: any) {
    // 记录错误日志
    console.error('管理员调整天机币失败:', {
      operatorId,
      targetUserId,
      adjustmentAmount,
      coinType,
      reason,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`调整操作失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 查询天机币交易流水
 * 
 * @param userId 用户ID
 * @param limit 返回记录数限制（可选，默认50）
 * @param offset 偏移量（可选，默认0）
 * @returns Promise<CoinTransaction[]> 交易记录列表
 */
export async function getCoinTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CoinTransaction[]> {
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
        type,
        amount,
        coins_amount,
        item_type,
        pack_type,
        description,
        operator_id,
        status,
        paid_at,
        payment_provider,
        is_first_purchase,
        created_at
      FROM public.transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      amount: row.amount,
      coins_amount: row.coins_amount,
      item_type: row.item_type,
      pack_type: row.pack_type,
      description: row.description,
      operator_id: row.operator_id,
      status: row.status,
      paid_at: row.paid_at,
      payment_provider: row.payment_provider,
      is_first_purchase: row.is_first_purchase,
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('查询交易流水失败:', {
      userId,
      limit,
      offset,
      error: error.message,
    });
    throw new Error(`查询交易流水失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查用户是否为管理员
 * 
 * @param userId 用户ID
 * @returns Promise<boolean> 是否为管理员
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT is_admin($1) as is_admin',
      [userId]
    );

    return result.rows[0]?.is_admin === true;
  } catch (error: any) {
    console.error('检查管理员权限失败:', {
      userId,
      error: error.message,
    });
    // 出错时返回 false，确保安全
    return false;
  }
}

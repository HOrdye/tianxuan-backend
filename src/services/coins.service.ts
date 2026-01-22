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
  // 原始字段（保留兼容性）
  tianji_coins_balance: number;
  daily_coins_grant: number;
  activity_coins_grant: number;
  daily_coins_grant_expires_at: Date | null;
  activity_coins_grant_expires_at: Date | null;
  
  // 🎨 核心展示层（藏经阁风格）
  total_balance: number;        // 总余额
  permanent_balance: number;   // 永久余额（天机币：充值余额 + 活动赠送余额）
  expiring_balance: number;     // 限时缘分（缘分币：每日签到余额）
  
  // 📋 详情层（前端Hover显示）
  details: {
    recharge: number;           // 充值余额
    activity: number;            // 活动赠送余额
    daily_grant: number;        // 每日签到余额
    next_expiration_date: Date | null;  // 最近一笔过期时间
  };
  
  // 🔧 扣费优先级说明（便于调试）
  deduction_priority: string;   // 扣费顺序说明
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

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // ✅ 调用数据库函数 deduct_coins 执行扣费
    // 注意：扣费记录已由 deduct_coins RPC 函数写入 quota_logs 表（数据库层统一处理）
    // 根据文档，函数已使用显式参数，无需设置会话变量
    const result = await client.query(
      'SELECT deduct_coins($1, $2, $3) as result',
      [userId, featureType, price]
    );

    const data = result.rows[0].result;

    // 检查函数返回结果
    if (!data || !data.success) {
      await client.query('ROLLBACK');
      throw new Error(data?.error || '扣费失败');
    }

    // 提交事务
    await client.query('COMMIT');

    console.log('✅ [deductCoins] 扣费成功（quota_logs 已由数据库函数写入）:', {
      userId,
      featureType,
      price,
      remainingBalance: data.remaining_balance,
    });

    return {
      success: true,
      message: data.message || '扣费成功',
      remaining_balance: data.remaining_balance,
      // transaction_id 不设置（undefined），扣费记录写入 quota_logs 表，不返回 transaction_id
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    // 记录错误日志
    console.error('❌ [deductCoins] 扣费失败:', {
      userId,
      featureType,
      price,
      error: error.message,
      stack: error.stack,
    });

    // 如果是数据库函数返回的错误，直接抛出
    if (error.message) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`扣费操作失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
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
    const recharge = row.tianji_coins_balance || 0;
    const dailyGrant = row.daily_coins_grant || 0;
    const activityGrant = row.activity_coins_grant || 0;
    
    // 🎨 计算展示字段（藏经阁风格）
    // 永久余额（天机币）= 充值余额 + 活动赠送余额
    const permanentBalance = recharge + activityGrant;
    // 限时缘分（缘分币）= 每日签到余额
    const expiringBalance = dailyGrant;
    // 总余额 = 永久余额 + 限时缘分
    const totalBalance = permanentBalance + expiringBalance;
    
    // 📋 计算最近过期时间
    const expirationDates: (Date | null)[] = [];
    if (row.daily_coins_grant_expires_at) {
      expirationDates.push(new Date(row.daily_coins_grant_expires_at));
    }
    if (row.activity_coins_grant_expires_at) {
      expirationDates.push(new Date(row.activity_coins_grant_expires_at));
    }
    const nextExpirationDate = expirationDates.length > 0
      ? expirationDates.reduce((earliest, current) => {
          if (!earliest) return current;
          if (!current) return earliest;
          return current < earliest ? current : earliest;
        })
      : null;
    
    // 🔧 扣费优先级说明
    const deductionPriority = '优先扣除限时缘分（缘分币），再扣除永久余额（天机币）';
    
    return {
      // 原始字段（保留兼容性）
      tianji_coins_balance: recharge,
      daily_coins_grant: dailyGrant,
      activity_coins_grant: activityGrant,
      daily_coins_grant_expires_at: row.daily_coins_grant_expires_at,
      activity_coins_grant_expires_at: row.activity_coins_grant_expires_at,
      
      // 🎨 核心展示层
      total_balance: totalBalance,
      permanent_balance: permanentBalance,
      expiring_balance: expiringBalance,
      
      // 📋 详情层
      details: {
        recharge,
        activity: activityGrant,
        daily_grant: dailyGrant,
        next_expiration_date: nextExpirationDate,
      },
      
      // 🔧 扣费优先级说明
      deduction_priority: deductionPriority,
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

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 先检查操作人是否为管理员
    const isAdminResult = await client.query(
      'SELECT is_admin($1) as is_admin',
      [operatorId]
    );

    if (!isAdminResult.rows[0]?.is_admin) {
      throw new Error('只有管理员可以执行此操作');
    }

    // 开始事务
    await client.query('BEGIN');

    // 1. 查询当前余额（使用 FOR UPDATE 锁定行，防止并发修改）
    const userRes = await client.query(
      `SELECT ${coinType} as balance FROM public.profiles WHERE id = $1 FOR UPDATE`,
      [targetUserId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('用户不存在');
    }

    const oldBalance = userRes.rows[0].balance || 0;
    const newBalance = oldBalance + adjustmentAmount;

    // 如果余额不足（调整后为负数），根据业务需求决定是否允许
    // 这里暂时允许负数，如果需要限制，可以添加检查
    if (newBalance < 0 && coinType === 'tianji_coins_balance') {
      // 可以根据业务需求决定是否允许负数
      // await client.query('ROLLBACK');
      // throw new Error('余额不足');
    }

    // 2. 更新用户余额
    await client.query(
      `UPDATE public.profiles 
       SET ${coinType} = $1, updated_at = NOW() 
       WHERE id = $2`,
      [newBalance, targetUserId]
    );

    // 3. 🟢 关键修复：插入交易流水记录到 transactions 表
    // 这样管理员后台的 CoinTransactionLogs 页面才能查到数据
    const transactionType = 'admin_adjust';
    const transactionDescription = reason || `管理员调整：${oldBalance} → ${newBalance} (${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount})`;
    
    const transactionResult = await client.query(
      `INSERT INTO public.transactions (
        id,
        user_id,
        type,
        amount,
        coins_amount,
        item_type,
        description,
        operator_id,
        status,
        created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
      RETURNING id`,
      [
        targetUserId,
        transactionType,
        0, // amount 为 0（天机币调整不涉及金额）
        adjustmentAmount, // coins_amount 记录调整的天机币数量（正数或负数）
        'admin_adjustment', // item_type: 管理员调整（符合数据库约束）
        transactionDescription,
        operatorId, // 记录操作的管理员ID
      ]
    );

    const transactionId = transactionResult.rows[0].id;

    // 提交事务
    await client.query('COMMIT');

    console.log('✅ [adminAdjustCoins] 管理员调整天机币成功:', {
      operatorId,
      targetUserId,
      adjustmentAmount,
      oldBalance,
      newBalance,
      transactionId,
      coinType,
    });

    return {
      success: true,
      message: `调整成功：${oldBalance} → ${newBalance} (${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount})`,
      new_balance: newBalance,
      transaction_id: transactionId,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');
    
    // 记录错误日志
    console.error('❌ [adminAdjustCoins] 管理员调整天机币失败:', {
      operatorId,
      targetUserId,
      adjustmentAmount,
      coinType,
      reason,
      error: error.message,
      stack: error.stack,
    });

    // 如果是已知错误，直接抛出
    if (error.message) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`调整操作失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 管理员设置充值余额（直接设置为指定值）
 * 
 * 🛑 重要原则：解耦（Decoupling）
 * - 只修改充值余额（tianjiCoinsBalance），不碰其他字段
 * - 如果需要清零赠送余额，必须显式设置 clearGrants=true
 * - 防止运营事故：用户的活动币不会因为修改充值余额而丢失
 * 
 * @param operatorId 操作人ID（必须是管理员）
 * @param targetUserId 目标用户ID
 * @param tianjiCoinsBalance 充值余额（必填）
 * @param dailyCoinsGrant 每日签到余额（可选，默认保持原值）
 * @param activityCoinsGrant 活动赠送余额（可选，默认保持原值）
 * @param clearGrants 是否清零所有赠送余额（可选，默认 false。必须显式设置为 true 才会清零）
 * @param reason 设置原因（可选，默认为'管理员设置余额'）
 * @returns Promise<AdminAdjustResult> 设置结果
 * 
 * @throws Error 如果操作人不是管理员、设置失败等
 */
export async function adminSetCoins(
  operatorId: string,
  targetUserId: string,
  tianjiCoinsBalance: number,
  dailyCoinsGrant?: number,
  activityCoinsGrant?: number,
  clearGrants?: boolean,  // 改为可选，未提供时根据其他参数判断
  reason: string = '管理员设置余额'
): Promise<AdminAdjustResult> {
  // 参数验证
  if (!operatorId || !targetUserId) {
    throw new Error('参数错误：操作人ID和目标用户ID必须有效');
  }

  if (typeof tianjiCoinsBalance !== 'number' || tianjiCoinsBalance < 0) {
    throw new Error('参数错误：储值余额必须是非负数');
  }

  // 🛑 修复：移除默认清零逻辑，防止运营事故
  // 原则：解耦（Decoupling）- setRechargeBalance 只改充值余额，不碰其他字段
  // 如果需要清零，应该是显式操作（通过 clearGrants 参数）
  // 
  // 新的余额显示逻辑：
  // - 永久余额（天机币）= recharge + activity（充值余额 + 活动赠送余额）
  // - 限时缘分（缘分币）= daily_grant（每日签到余额）
  // 
  // 设置逻辑：
  // - 如果只设置了 tianjiCoinsBalance，只修改充值余额，不碰其他字段
  // - 如果设置了 clearGrants=true，才清零所有赠送余额
  // - 如果显式设置了 dailyCoinsGrant 或 activityCoinsGrant，使用设置的值
  const shouldClearAllGrants = clearGrants === true;
  const shouldClearActivityGrant = shouldClearAllGrants;
  const shouldClearDailyGrant = shouldClearAllGrants;

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 先检查操作人是否为管理员
    const isAdminResult = await client.query(
      'SELECT is_admin($1) as is_admin',
      [operatorId]
    );

    if (!isAdminResult.rows[0]?.is_admin) {
      throw new Error('只有管理员可以执行此操作');
    }

    // 开始事务
    await client.query('BEGIN');

    // 1. 查询当前余额（使用 FOR UPDATE 锁定行，防止并发修改）
    const userRes = await client.query(
      `SELECT 
        tianji_coins_balance,
        daily_coins_grant,
        activity_coins_grant
      FROM public.profiles 
      WHERE id = $1 FOR UPDATE`,
      [targetUserId]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('用户不存在');
    }

    const oldTianjiBalance = userRes.rows[0].tianji_coins_balance || 0;
    const oldDailyGrant = userRes.rows[0].daily_coins_grant || 0;
    const oldActivityGrant = userRes.rows[0].activity_coins_grant || 0;

    // 2. 确定要设置的赠送余额值
    // 🛑 修复：移除默认清零逻辑，只修改充值余额，不碰其他字段
    // - 如果 clearGrants=true，清零所有赠送余额（显式操作）
    // - 如果显式设置了 dailyCoinsGrant 或 activityCoinsGrant，使用设置的值
    // - 否则保持原值不变（不修改）
    const finalDailyGrant = shouldClearDailyGrant 
      ? 0 
      : (dailyCoinsGrant !== undefined ? dailyCoinsGrant : oldDailyGrant);
    const finalActivityGrant = shouldClearActivityGrant 
      ? 0 
      : (activityCoinsGrant !== undefined ? activityCoinsGrant : oldActivityGrant);

    // 3. 更新用户余额
    await client.query(
      `UPDATE public.profiles 
       SET 
         tianji_coins_balance = $1,
         daily_coins_grant = $2,
         activity_coins_grant = $3,
         updated_at = NOW() 
       WHERE id = $4`,
      [tianjiCoinsBalance, finalDailyGrant, finalActivityGrant, targetUserId]
    );

    // 4. 计算调整金额（用于记录交易流水）
    const adjustmentAmount = tianjiCoinsBalance - oldTianjiBalance;
    const totalOldBalance = oldTianjiBalance + oldDailyGrant + oldActivityGrant;
    const totalNewBalance = tianjiCoinsBalance + finalDailyGrant + finalActivityGrant;

    // 5. 插入交易流水记录
    const transactionType = 'admin_set';
    const clearGrantsDesc = shouldClearAllGrants 
      ? '，已清零所有赠送余额' 
      : '';
    const transactionDescription = reason || `管理员设置充值余额：${oldTianjiBalance} → ${tianjiCoinsBalance}${clearGrantsDesc}，总余额 ${totalOldBalance} → ${totalNewBalance}`;
    
    const transactionResult = await client.query(
      `INSERT INTO public.transactions (
        id,
        user_id,
        type,
        amount,
        coins_amount,
        item_type,
        description,
        operator_id,
        status,
        created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
      RETURNING id`,
      [
        targetUserId,
        transactionType,
        0, // amount 为 0（天机币设置不涉及金额）
        adjustmentAmount, // coins_amount 记录调整的天机币数量
        'admin_set_balance', // item_type: 管理员设置余额
        transactionDescription,
        operatorId, // 记录操作的管理员ID
      ]
    );

    const transactionId = transactionResult.rows[0].id;

    // 提交事务
    await client.query('COMMIT');

    console.log('✅ [adminSetCoins] 管理员设置天机币余额成功:', {
      operatorId,
      targetUserId,
      oldTianjiBalance,
      newTianjiBalance: tianjiCoinsBalance,
      oldDailyGrant,
      newDailyGrant: finalDailyGrant,
      oldActivityGrant,
      newActivityGrant: finalActivityGrant,
      totalOldBalance,
      totalNewBalance,
      transactionId,
      clearGrants: shouldClearAllGrants,
    });

    return {
      success: true,
      message: `设置成功：储值余额 ${oldTianjiBalance} → ${tianjiCoinsBalance}，总余额 ${totalOldBalance} → ${totalNewBalance}`,
      new_balance: tianjiCoinsBalance,
      transaction_id: transactionId,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');
    
    // 记录错误日志
    console.error('❌ [adminSetCoins] 管理员设置天机币余额失败:', {
      operatorId,
      targetUserId,
      tianjiCoinsBalance,
      dailyCoinsGrant,
      activityCoinsGrant,
      clearGrants: shouldClearAllGrants,
      reason,
      error: error.message,
      stack: error.stack,
    });

    // 如果是已知错误，直接抛出
    if (error.message) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`设置操作失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
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

/**
 * 注册奖励状态接口
 */
export interface RegistrationBonusStatus {
  granted: boolean;
}

/**
 * 查询注册奖励状态
 * 
 * @param userId 用户ID
 * @returns Promise<RegistrationBonusStatus | null> 注册奖励状态或 null（用户不存在）
 */
export async function getRegistrationBonusStatus(
  userId: string
): Promise<RegistrationBonusStatus | null> {
  try {
    const result = await pool.query(
      `SELECT registration_bonus_granted
       FROM public.profiles
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const granted = result.rows[0].registration_bonus_granted === true;

    return {
      granted,
    };
  } catch (error: any) {
    console.error('查询注册奖励状态失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`查询注册奖励状态失败: ${error.message || '未知错误'}`);
  }
}

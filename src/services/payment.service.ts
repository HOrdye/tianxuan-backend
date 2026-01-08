import { pool } from '../config/database';
import { randomUUID } from 'crypto';
import * as coinsService from './coins.service';

/**
 * 支付服务模块
 * 提供创建支付订单、处理支付回调、查询订单等功能
 */

/**
 * 支付订单接口
 */
export interface PaymentOrder {
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
 * 创建订单结果接口
 */
export interface CreateOrderResult {
  success: boolean;
  order_id: string;
  message?: string;
  error?: string;
}

/**
 * 支付回调处理结果接口
 */
export interface PaymentCallbackResult {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  new_balance?: number;
}

/**
 * 创建支付订单
 * 
 * @param userId 用户ID
 * @param amount 支付金额（人民币，单位：元）
 * @param coinsAmount 购买的天机币数量
 * @param packType 套餐类型（可选，如 'coins_pack_1', 'coins_pack_2' 等）
 * @param paymentProvider 支付提供商（可选，如 'alipay', 'wechat' 等）
 * @param description 订单描述（可选）
 * @returns Promise<CreateOrderResult> 创建订单结果
 * 
 * @throws Error 如果创建订单失败
 */
export async function createOrder(
  userId: string,
  amount: number,
  coinsAmount: number,
  packType?: string,
  paymentProvider?: string,
  description?: string
): Promise<CreateOrderResult> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!amount || amount <= 0) {
    throw new Error('参数错误：支付金额必须大于0');
  }

  if (!coinsAmount || coinsAmount <= 0) {
    throw new Error('参数错误：天机币数量必须大于0');
  }

  // 检查用户是否存在
  const userCheck = await pool.query(
    'SELECT id FROM public.profiles WHERE id = $1',
    [userId]
  );

  if (userCheck.rows.length === 0) {
    throw new Error('用户不存在');
  }

  // 检查是否首次购买
  const firstPurchaseCheck = await pool.query(
    `SELECT COUNT(*) as count 
     FROM public.transactions 
     WHERE user_id = $1 
       AND type = 'purchase' 
       AND status = 'completed'`,
    [userId]
  );

  const isFirstPurchase = parseInt(firstPurchaseCheck.rows[0].count) === 0;

  // 生成订单ID
  const orderId = randomUUID();

  // 创建订单记录
  try {
    // 注意：item_type 字段有检查约束
    // 数据库约束定义：CHECK ((item_type = ANY (ARRAY['subscription'::text, 'coin_pack'::text, 'admin_adjustment'::text, 'refund'::text, 'system_grant'::text])))
    // 对于充值订单，使用 'coin_pack'（最符合"充值"含义的合法值）
    
    // 准备插入值
    const itemTypeValue = 'coin_pack'; // 强制使用 'coin_pack'
    
    // 调试日志：打印实际插入的值
    console.log('创建订单 - 准备插入的值:', {
      orderId,
      userId,
      type: 'purchase',
      amount,
      coinsAmount,
      item_type: itemTypeValue,
      pack_type: packType || null,
      status: 'pending',
    });
    
    await pool.query(
      `INSERT INTO public.transactions (
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
        payment_provider,
        is_first_purchase,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        orderId,
        userId,
        'purchase',
        amount,
        coinsAmount,
        itemTypeValue, // 强制使用 'coin_pack'
        packType || null,
        description || `购买 ${coinsAmount} 天机币`,
        null, // operator_id 为空（用户自己购买）
        'pending', // 初始状态为 pending
        paymentProvider || null,
        isFirstPurchase,
      ]
    );

    return {
      success: true,
      order_id: orderId,
      message: '订单创建成功',
    };
  } catch (error: any) {
    console.error('创建订单失败:', {
      userId,
      amount,
      coinsAmount,
      error: error.message,
    });

    throw new Error(`创建订单失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 处理支付成功核心逻辑（内部调用，Mock 支付使用）
 * 不包含签名验证，只负责更新状态和发币
 * 
 * @param orderId 订单ID
 * @param providerTransactionId 支付提供商交易ID（可选）
 * @returns Promise<PaymentCallbackResult> 处理结果
 * 
 * @throws Error 如果处理失败
 */
export async function handlePaymentSuccess(
  orderId: string,
  providerTransactionId?: string
): Promise<PaymentCallbackResult> {
  // 参数验证
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 查询订单信息（使用 FOR UPDATE 锁定行，防止并发）
    const orderResult = await client.query(
      `SELECT 
        id,
        user_id,
        amount,
        coins_amount,
        status
      FROM public.transactions
      WHERE id = $1
      FOR UPDATE`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('订单不存在');
    }

    const order = orderResult.rows[0];

    // 2. 幂等性检查：如果已经支付过，直接返回成功
    if (order.status === 'completed') {
      await client.query('ROLLBACK');
      
      // 查询当前余额
      const balanceResult = await client.query(
        'SELECT tianji_coins_balance FROM public.profiles WHERE id = $1',
        [order.user_id]
      );
      const newBalance = balanceResult.rows.length > 0 
        ? balanceResult.rows[0].tianji_coins_balance 
        : undefined;
      
      return {
        success: true,
        message: '订单已处理过',
        order_id: orderId,
        new_balance: newBalance,
      };
    }

    // 3. 更新订单状态
    await client.query(
      `UPDATE public.transactions
       SET 
         status = 'completed',
         payment_provider = COALESCE(payment_provider, 'mock'),
         paid_at = NOW()
       WHERE id = $1`,
      [orderId]
    );

    // 4. 发放天机币
    if (order.coins_amount) {
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [order.coins_amount, order.user_id]
      );
    }

    // 提交事务
    await client.query('COMMIT');

    // 查询新的余额
    const balanceResult = await client.query(
      'SELECT tianji_coins_balance FROM public.profiles WHERE id = $1',
      [order.user_id]
    );
    const newBalance = balanceResult.rows.length > 0 
      ? balanceResult.rows[0].tianji_coins_balance 
      : undefined;

    return {
      success: true,
      message: '支付成功，天机币已到账',
      order_id: orderId,
      new_balance: newBalance,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('处理支付成功失败:', {
      orderId,
      providerTransactionId,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('订单不存在') || 
        error.message?.includes('参数错误')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`处理支付成功失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 处理支付回调
 * 更新订单状态并增加用户天机币余额
 * 
 * @param orderId 订单ID
 * @param status 支付状态（'completed' 或 'failed'）
 * @param paymentProvider 支付提供商（可选）
 * @param paidAt 支付时间（可选，默认当前时间）
 * @returns Promise<PaymentCallbackResult> 处理结果
 * 
 * @throws Error 如果处理失败
 */
export async function handlePaymentCallback(
  orderId: string,
  status: 'completed' | 'failed',
  paymentProvider?: string,
  paidAt?: Date
): Promise<PaymentCallbackResult> {
  // 参数验证
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  if (status !== 'completed' && status !== 'failed') {
    throw new Error('参数错误：支付状态必须是 completed 或 failed');
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 查询订单信息
    const orderResult = await client.query(
      `SELECT 
        id,
        user_id,
        amount,
        coins_amount,
        status
      FROM public.transactions
      WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('订单不存在');
    }

    const order = orderResult.rows[0];

    // 2. 检查订单状态（防止重复处理）
    if (order.status === 'completed') {
      await client.query('ROLLBACK');
      throw new Error('订单已完成，不能重复处理');
    }

    if (order.status === 'failed') {
      await client.query('ROLLBACK');
      throw new Error('订单已失败，不能重复处理');
    }

    // 3. 更新订单状态
    await client.query(
      `UPDATE public.transactions
       SET 
         status = $1,
         payment_provider = COALESCE($2, payment_provider),
         paid_at = COALESCE($3, NOW())
       WHERE id = $4`,
      [
        status,
        paymentProvider || null,
        paidAt || null,
        orderId,
      ]
    );

    // 4. 如果支付成功，增加用户天机币余额
    if (status === 'completed' && order.coins_amount) {
      // 使用管理员调整函数增加余额（通过系统操作）
      // 注意：这里需要调用数据库函数或直接更新余额
      // 为了保持一致性，我们使用 admin_adjust_coins 函数，但需要先检查是否有管理员权限函数
      // 或者直接更新 profiles 表的天机币余额

      // 方案1：直接更新余额（简单直接）
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1
         WHERE id = $2`,
        [order.coins_amount, order.user_id]
      );

      // 记录交易日志（可选，如果需要记录充值交易）
      // 这里不创建新的交易记录，因为订单本身就是交易记录
    }

    // 提交事务
    await client.query('COMMIT');

    // 查询新的余额（如果需要返回）
    let newBalance: number | undefined;
    if (status === 'completed') {
      const balanceResult = await client.query(
        'SELECT tianji_coins_balance FROM public.profiles WHERE id = $1',
        [order.user_id]
      );
      if (balanceResult.rows.length > 0) {
        newBalance = balanceResult.rows[0].tianji_coins_balance;
      }
    }

    return {
      success: true,
      message: status === 'completed' ? '支付成功，天机币已到账' : '支付失败',
      order_id: orderId,
      new_balance: newBalance,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('处理支付回调失败:', {
      orderId,
      status,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('订单不存在') || 
        error.message?.includes('不能重复处理') ||
        error.message?.includes('参数错误')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`处理支付回调失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 查询订单列表
 * 
 * @param userId 用户ID
 * @param status 订单状态（可选，如 'pending', 'completed', 'failed'）
 * @param limit 返回记录数限制（可选，默认50）
 * @param offset 偏移量（可选，默认0）
 * @returns Promise<PaymentOrder[]> 订单列表
 */
export async function getOrders(
  userId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0
): Promise<PaymentOrder[]> {
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
    // 构建查询SQL
    let query = `
      SELECT 
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
        AND type = 'purchase'
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // 如果指定了状态，添加状态过滤
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

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
    console.error('查询订单列表失败:', {
      userId,
      status,
      limit,
      offset,
      error: error.message,
    });
    throw new Error(`查询订单列表失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 查询单个订单详情
 * 
 * @param orderId 订单ID
 * @param userId 用户ID（可选，用于权限验证）
 * @returns Promise<PaymentOrder | null> 订单详情或 null（订单不存在）
 */
export async function getOrderById(
  orderId: string,
  userId?: string
): Promise<PaymentOrder | null> {
  // 参数验证
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  try {
    // 构建查询SQL
    let query = `
      SELECT 
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
      WHERE id = $1
        AND type = 'purchase'
    `;

    const params: any[] = [orderId];

    // 如果提供了用户ID，添加用户ID过滤（用于权限验证）
    if (userId) {
      query += ` AND user_id = $2`;
      params.push(userId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
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
    };
  } catch (error: any) {
    console.error('查询订单详情失败:', {
      orderId,
      userId,
      error: error.message,
    });
    throw new Error(`查询订单详情失败: ${error.message || '未知错误'}`);
  }
}

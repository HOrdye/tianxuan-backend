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
  amount: number;       // 支付金额（人民币，单位：元）
  payment_url?: string; // 支付链接（可选，如果使用第三方支付会生成）
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
 * @param coinsAmount 购买的天机币数量（可选，订阅订单不需要）
 * @param itemType 订单类型（可选，'subscription' | 'coin_pack'，默认为 'coin_pack'）
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
  coinsAmount?: number,
  itemType?: string,
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

  // 🟢 修复：根据 itemType 判断是否需要 coinsAmount
  // 如果是订阅订单（itemType === 'subscription'），则不需要 coinsAmount
  // 如果是充值订单（itemType === 'coin_pack' 或未指定），则需要 coinsAmount
  const finalItemType = itemType || 'coin_pack';
  const isSubscription = finalItemType === 'subscription';
  
  if (!isSubscription) {
    // 充值订单必须提供 coinsAmount
    if (!coinsAmount || coinsAmount <= 0) {
      throw new Error('参数错误：天机币数量必须大于0');
    }
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

  // 🔒 新人礼限购逻辑：如果购买的是新人礼套餐，必须验证用户是否首次购买
  // 新人礼套餐类型标识
  const newUserGiftPackTypes = [
    'newcomer', // 新人礼主要标识
    // 以下为兼容性标识（可根据需要保留或删除）
    'new_user_gift',
    'newuser_gift',
    'first_purchase_gift',
  ];

  // 检查是否是新人礼套餐
  if (packType && newUserGiftPackTypes.includes(packType)) {
    // 如果用户不是首次购买，拒绝创建订单
    if (!isFirstPurchase) {
      throw new Error('新人礼仅限首次购买用户，您已购买过其他充值包，无法购买新人礼');
    }

    // 额外检查：用户是否已经购买过新人礼（防止重复购买）
    const newUserGiftCheck = await pool.query(
      `SELECT COUNT(*) as count 
       FROM public.transactions 
       WHERE user_id = $1 
         AND type = 'purchase' 
         AND pack_type = $2 
         AND status IN ('pending', 'completed')`,
      [userId, packType]
    );

    const hasPurchasedNewUserGift = parseInt(newUserGiftCheck.rows[0].count) > 0;
    if (hasPurchasedNewUserGift) {
      throw new Error('您已经购买过新人礼，每个用户限购一次');
    }
  }

  // 生成订单ID
  const orderId = randomUUID();

  // 创建订单记录
  try {
    // 注意：item_type 字段有检查约束
    // 数据库约束定义：CHECK ((item_type = ANY (ARRAY['subscription'::text, 'coin_pack'::text, 'admin_adjustment'::text, 'refund'::text, 'system_grant'::text])))
    // 🟢 修复：根据订单类型设置 item_type 和 coins_amount
    // 订阅订单：item_type = 'subscription', coins_amount = null
    // 充值订单：item_type = 'coin_pack', coins_amount = coinsAmount
    
    // 准备插入值
    const itemTypeValue = finalItemType; // 使用传入的 itemType 或默认 'coin_pack'
    const coinsAmountValue = isSubscription ? null : (coinsAmount || 0);
    const orderDescription = isSubscription 
      ? (description || `订阅会员服务`)
      : (description || `购买 ${coinsAmount} 天机币`);
    
    // 调试日志：打印实际插入的值
    console.log('创建订单 - 准备插入的值:', {
      orderId,
      userId,
      type: 'purchase',
      amount,
      coinsAmount: coinsAmountValue,
      item_type: itemTypeValue,
      pack_type: packType || null,
      status: 'pending',
      isSubscription,
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
        coinsAmountValue, // 订阅订单为 null，充值订单为 coinsAmount
        itemTypeValue, // 'subscription' 或 'coin_pack'
        packType || null,
        orderDescription,
        null, // operator_id 为空（用户自己购买）
        'pending', // 初始状态为 pending
        paymentProvider || null,
        isFirstPurchase,
      ]
    );

    // 生成支付链接
    // 如果是对接真实支付（如支付宝、微信），这里会调用第三方 API 生成支付链接
    // 目前使用模拟链接，指向前端收银台页面
    const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || '';
    const paymentUrl = baseUrl 
      ? `${baseUrl}/payment/cashier?orderId=${orderId}`
      : `/payment/cashier?orderId=${orderId}`;

    return {
      success: true,
      order_id: orderId,
      amount: parseFloat(amount.toString()), // 确保转为数字
      payment_url: paymentUrl,
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

    // 4. 发放天机币并写入天机币流水
    if (order.coins_amount) {
      const oldBalRes = await client.query(
        'SELECT COALESCE(tianji_coins_balance, 0) as tianji_coins_balance FROM public.profiles WHERE id = $1',
        [order.user_id]
      );
      const oldBalance = oldBalRes.rows[0] ? Number(oldBalRes.rows[0].tianji_coins_balance) : 0;
      const newBalanceVal = oldBalance + Number(order.coins_amount);
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [order.coins_amount, order.user_id]
      );
      await client.query(
        `INSERT INTO public.coin_transactions
         (user_id, coins_amount, coin_type, old_balance, new_balance, transaction_type, description, created_at)
         VALUES ($1, $2, 'tianji_coins_balance', $3, $4, 'recharge', $5, NOW())`,
        [order.user_id, order.coins_amount, oldBalance, newBalanceVal, `充值（订单 ${orderId}）`]
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
 * 模拟支付成功（开发环境专用）
 * 将订单状态设置为 'paid' 并发放权益
 * 
 * @param orderId 订单ID
 * @returns Promise<{ success: boolean; message: string; order_id?: string; new_balance?: number }> 处理结果
 * 
 * @throws Error 如果处理失败
 */
export async function mockPaySuccess(orderId: string): Promise<{ 
  success: boolean; 
  message: string; 
  order_id?: string; 
  new_balance?: number;
}> {
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 查询订单（使用 FOR UPDATE 锁定行，防止并发）
    const orderRes = await client.query(
      `SELECT * FROM public.transactions WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error(`订单不存在: ${orderId}`);
    }

    const order = orderRes.rows[0];

    // 2. 幂等性检查：如果已经支付过，直接返回成功
    if (order.status === 'paid' || order.status === 'completed') {
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
        message: '订单已支付',
        order_id: orderId,
        new_balance: newBalance,
      };
    }

    // 3. 更新订单状态为 'paid'
    await client.query(
      `UPDATE public.transactions 
       SET status = 'paid', paid_at = NOW(), updated_at = NOW() 
       WHERE id = $1`,
      [orderId]
    );

    // 4. 发放权益（发放天机币）并写入天机币流水
    if (order.coins_amount && order.coins_amount > 0) {
      const oldBalRes = await client.query(
        'SELECT COALESCE(tianji_coins_balance, 0) as tianji_coins_balance FROM public.profiles WHERE id = $1',
        [order.user_id]
      );
      const oldBalance = oldBalRes.rows[0] ? Number(oldBalRes.rows[0].tianji_coins_balance) : 0;
      const newBalanceVal = oldBalance + Number(order.coins_amount);
      await client.query(
        `UPDATE public.profiles 
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [order.coins_amount, order.user_id]
      );
      await client.query(
        `INSERT INTO public.coin_transactions
         (user_id, coins_amount, coin_type, old_balance, new_balance, transaction_type, description, created_at)
         VALUES ($1, $2, 'tianji_coins_balance', $3, $4, 'recharge', $5, NOW())`,
        [order.user_id, order.coins_amount, oldBalance, newBalanceVal, `充值（Mock 订单 ${orderId}）`]
      );
    }

    await client.query('COMMIT');
    
    // 5. 查询新的余额
    const balanceResult = await client.query(
      'SELECT tianji_coins_balance FROM public.profiles WHERE id = $1',
      [order.user_id]
    );
    const newBalance = balanceResult.rows.length > 0 
      ? balanceResult.rows[0].tianji_coins_balance 
      : undefined;

    return { 
      success: true, 
      message: 'Mock 支付成功',
      order_id: orderId,
      new_balance: newBalance,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Mock 支付失败:', {
      orderId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 模拟支付失败（开发环境专用）
 * 将订单状态设置为 'failed'，不发放权益
 * 
 * @param orderId 订单ID
 * @returns Promise<{ success: boolean; message: string; order_id?: string }> 处理结果
 * 
 * @throws Error 如果处理失败
 */
export async function mockPayFail(orderId: string): Promise<{ 
  success: boolean; 
  message: string; 
  order_id?: string;
}> {
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  const client = await pool.connect();
  try {
    // 直接更新状态为 failed（不需要事务，因为不涉及发币）
    const result = await client.query(
      `UPDATE public.transactions 
       SET status = 'failed', updated_at = NOW() 
       WHERE id = $1 RETURNING id`,
      [orderId]
    );

    if (result.rowCount === 0) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    return { 
      success: true, 
      message: 'Mock 支付失败已触发',
      order_id: orderId,
    };
  } catch (error: any) {
    console.error('Mock 支付失败处理错误:', {
      orderId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 模拟支付取消（开发环境专用）
 * 将订单状态设置为 'cancelled'，不发放权益
 * 
 * @param orderId 订单ID
 * @returns Promise<{ success: boolean; message: string; order_id?: string }> 处理结果
 * 
 * @throws Error 如果处理失败
 */
export async function mockPayCancel(orderId: string): Promise<{ 
  success: boolean; 
  message: string; 
  order_id?: string;
}> {
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  const client = await pool.connect();
  try {
    // 直接更新状态为 cancelled（不需要事务，因为不涉及发币）
    const result = await client.query(
      `UPDATE public.transactions 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = $1 RETURNING id`,
      [orderId]
    );

    if (result.rowCount === 0) {
      throw new Error(`订单不存在: ${orderId}`);
    }

    return { 
      success: true, 
      message: 'Mock 支付取消已触发',
      order_id: orderId,
    };
  } catch (error: any) {
    console.error('Mock 支付取消处理错误:', {
      orderId,
      error: error.message,
    });
    throw error;
  } finally {
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

    // 4. 如果支付成功，增加用户天机币余额并写入天机币流水
    if (status === 'completed' && order.coins_amount) {
      const oldBalRes = await client.query(
        'SELECT COALESCE(tianji_coins_balance, 0) as tianji_coins_balance FROM public.profiles WHERE id = $1',
        [order.user_id]
      );
      const oldBalance = oldBalRes.rows[0] ? Number(oldBalRes.rows[0].tianji_coins_balance) : 0;
      const newBalanceVal = oldBalance + Number(order.coins_amount);
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1
         WHERE id = $2`,
        [order.coins_amount, order.user_id]
      );
      await client.query(
        `INSERT INTO public.coin_transactions
         (user_id, coins_amount, coin_type, old_balance, new_balance, transaction_type, description, created_at)
         VALUES ($1, $2, 'tianji_coins_balance', $3, $4, 'recharge', $5, NOW())`,
        [order.user_id, order.coins_amount, oldBalance, newBalanceVal, `充值（订单 ${orderId}）`]
      );
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

/**
 * 充值包管理相关接口和函数
 */

/**
 * 充值包类型
 */
export type PackType = 'newcomer' | 'enlightenment' | 'omniscience';

/**
 * 充值包数据结构
 */
export interface CoinPack {
  id: string;
  pack_type: PackType;
  name: string;
  subtitle: string | null;
  price: number;
  coins: number;
  unit_price: number;
  description: string | null;
  is_limited: boolean;
  limit_count: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 购买资格检查结果
 */
export interface PurchaseEligibility {
  eligible: boolean;
  reason: string | null;
  purchaseCount: number;
  limitCount: number | null;
}

/**
 * 获取可用充值包列表
 * 只返回 is_active = true 的充值包，按 sort_order 升序排序
 * 
 * @returns Promise<CoinPack[]> 充值包列表
 */
export async function getPacks(): Promise<CoinPack[]> {
  try {
    const result = await pool.query(
      `SELECT 
        id, pack_type, name, subtitle, price, coins, unit_price,
        description, is_limited, limit_count, is_active, sort_order,
        created_at, updated_at
      FROM public.coin_packs
      WHERE is_active = true
      ORDER BY sort_order ASC`,
      []
    );

    return result.rows.map((row) => ({
      id: row.id,
      pack_type: row.pack_type,
      name: row.name,
      subtitle: row.subtitle,
      price: parseFloat(row.price),
      coins: parseInt(row.coins, 10),
      unit_price: parseFloat(row.unit_price),
      description: row.description,
      is_limited: row.is_limited || false,
      limit_count: row.limit_count,
      is_active: row.is_active || false,
      sort_order: row.sort_order || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error: any) {
    console.error('查询充值包列表失败:', {
      error: error.message,
    });
    throw new Error(`查询充值包列表失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 根据类型获取充值包
 * 
 * @param packType 充值包类型
 * @returns Promise<CoinPack | null> 充值包数据或 null（不存在或已下架）
 */
export async function getPackByType(packType: PackType): Promise<CoinPack | null> {
  if (!packType) {
    throw new Error('参数错误：充值包类型必须提供');
  }

  // 验证 packType 是否有效
  const validPackTypes: PackType[] = ['newcomer', 'enlightenment', 'omniscience'];
  if (!validPackTypes.includes(packType)) {
    throw new Error(`参数错误：packType 必须是以下之一: ${validPackTypes.join(', ')}`);
  }

  try {
    const result = await pool.query(
      `SELECT 
        id, pack_type, name, subtitle, price, coins, unit_price,
        description, is_limited, limit_count, is_active, sort_order,
        created_at, updated_at
      FROM public.coin_packs
      WHERE pack_type = $1 AND is_active = true`,
      [packType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      pack_type: row.pack_type,
      name: row.name,
      subtitle: row.subtitle,
      price: parseFloat(row.price),
      coins: parseInt(row.coins, 10),
      unit_price: parseFloat(row.unit_price),
      description: row.description,
      is_limited: row.is_limited || false,
      limit_count: row.limit_count,
      is_active: row.is_active || false,
      sort_order: row.sort_order || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  } catch (error: any) {
    console.error('查询充值包失败:', {
      packType,
      error: error.message,
    });
    throw new Error(`查询充值包失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查购买资格
 * 检查用户是否可以购买指定类型的充值包（限购逻辑）
 * 
 * @param userId 用户ID
 * @param packType 充值包类型
 * @returns Promise<PurchaseEligibility> 购买资格检查结果
 */
export async function checkPurchaseEligibility(
  userId: string,
  packType: PackType
): Promise<PurchaseEligibility> {
  if (!userId || !packType) {
    throw new Error('参数错误：用户ID和充值包类型必须提供');
  }

  // 验证 packType 是否有效
  const validPackTypes: PackType[] = ['newcomer', 'enlightenment', 'omniscience'];
  if (!validPackTypes.includes(packType)) {
    throw new Error(`参数错误：packType 必须是以下之一: ${validPackTypes.join(', ')}`);
  }

  try {
    // 先查询充值包信息
    const pack = await getPackByType(packType);
    
    if (!pack) {
      throw new Error('充值包不存在或已下架');
    }

    // 如果不限购，直接返回可购买
    if (!pack.is_limited || !pack.limit_count) {
      return {
        eligible: true,
        reason: null,
        purchaseCount: 0,
        limitCount: null,
      };
    }

    // 查询用户已购买次数（只统计已支付的订单）
    const purchaseResult = await pool.query(
      `SELECT COUNT(*) as purchase_count
       FROM public.transactions
       WHERE user_id = $1 
         AND pack_type = $2 
         AND status = 'paid'
         AND item_type = 'coin_pack'`,
      [userId, packType]
    );

    const purchaseCount = parseInt(purchaseResult.rows[0].purchase_count, 10);
    const limitCount = pack.limit_count;

    // 判断是否可购买
    const eligible = purchaseCount < limitCount;
    const reason = eligible ? null : '已达到限购次数';

    return {
      eligible,
      reason,
      purchaseCount,
      limitCount,
    };
  } catch (error: any) {
    console.error('检查购买资格失败:', {
      userId,
      packType,
      error: error.message,
    });
    throw new Error(`检查购买资格失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 配额日志相关接口和函数
 */

/**
 * 配额日志数据结构
 */
export interface QuotaLog {
  id: string;
  user_id: string;
  feature: string;
  action_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  metadata: any | null;
  created_at: Date;
}

/**
 * 查询配额日志
 * 
 * @param userId 用户ID
 * @param feature 功能名称（可选，如 'yijing', 'ziwei'）
 * @param actionType 操作类型（可选，如 'consume', 'grant', 'refund'）
 * @param limit 返回记录数限制（可选，默认50）
 * @param offset 偏移量（可选，默认0）
 * @returns Promise<QuotaLog[]> 配额日志列表
 */
export async function getQuotaLogs(
  userId: string,
  feature?: string,
  actionType?: string,
  limit: number = 50,
  offset: number = 0
): Promise<QuotaLog[]> {
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
        feature,
        action_type,
        amount,
        balance_before,
        balance_after,
        description,
        metadata,
        created_at
      FROM public.quota_logs
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // 如果指定了功能名称，添加过滤
    if (feature) {
      query += ` AND feature = $${paramIndex}`;
      params.push(feature);
      paramIndex++;
    }

    // 如果指定了操作类型，添加过滤
    if (actionType) {
      query += ` AND action_type = $${paramIndex}`;
      params.push(actionType);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      feature: row.feature,
      action_type: row.action_type,
      amount: row.amount,
      balance_before: row.balance_before,
      balance_after: row.balance_after,
      description: row.description,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
      created_at: row.created_at,
    }));
  } catch (error: any) {
    console.error('查询配额日志失败:', {
      userId,
      feature,
      actionType,
      limit,
      offset,
      error: error.message,
    });
    
    // 如果表不存在，返回空数组（兼容性处理）
    if (error.message?.includes('does not exist') || error.message?.includes('不存在')) {
      console.warn('配额日志表不存在，返回空数组');
      return [];
    }
    
    throw new Error(`查询配额日志失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 退款日志相关接口和函数
 */

/**
 * 退款日志数据结构
 */
export interface RefundLog {
  id: string;
  user_id: string;
  order_id: string | null;  // 订单ID（订单退款场景）
  original_request_id: string | null;  // 原始请求ID（AI服务退款场景）
  refund_amount: number | null;  // 退款金额（人民币，订单退款场景）
  refund_coins: number;  // 退款天机币数量
  refund_reason: string | null;
  status: string;
  processed_at: Date | null;
  created_at: Date;
}

/**
 * 创建退款日志参数（订单退款场景）
 */
export interface CreateOrderRefundParams {
  userId: string;
  orderId: string;
  refundAmount: number;
  refundCoins: number;
  refundReason?: string;
}

/**
 * 创建退款日志参数（AI服务退款场景）
 */
export interface CreateServiceRefundParams {
  userId: string;
  amount: number;  // 退款天机币数量
  reason: string;  // 退款原因
  originalDeduction: number;  // 原始扣费金额（用于记录）
  originalRequestId: string;  // 原始请求ID（交易ID）
  deduction?: {
    daily_coins_grant?: number;  // 每日赠送余额扣费金额（用于精确退款）
    activity_coins_grant?: number;  // 活动赠送余额扣费金额（用于精确退款）
    tianji_coins_balance?: number;  // 储值余额扣费金额（用于精确退款）
  };
}

/**
 * 创建退款日志（订单退款场景）
 * 
 * @param params 退款参数
 * @returns Promise<RefundLog> 创建的退款日志
 */
export async function createOrderRefundLog(
  params: CreateOrderRefundParams
): Promise<RefundLog> {
  const { userId, orderId, refundAmount, refundCoins, refundReason } = params;

  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  if (!refundAmount || refundAmount <= 0) {
    throw new Error('参数错误：退款金额必须大于0');
  }

  if (!refundCoins || refundCoins < 0) {
    throw new Error('参数错误：退款天机币数量不能为负数');
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 1. 验证订单是否存在且属于该用户
    const orderResult = await client.query(
      `SELECT id, user_id, amount, coins_amount, status
       FROM public.transactions
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('订单不存在或不属于当前用户');
    }

    const order = orderResult.rows[0];

    // 2. 验证订单状态（只有已完成的订单才能退款）
    if (order.status !== 'completed') {
      await client.query('ROLLBACK');
      throw new Error(`订单状态为 ${order.status}，无法退款`);
    }

    // 3. 创建退款日志
    const refundLogId = randomUUID();
    await client.query(
      `INSERT INTO public.refund_logs (
        id,
        user_id,
        order_id,
        original_request_id,
        refund_amount,
        refund_coins,
        refund_reason,
        status,
        created_at
      )
      VALUES ($1, $2, $3, NULL, $4, $5, $6, 'pending', NOW())`,
      [
        refundLogId,
        userId,
        orderId,
        refundAmount,
        refundCoins,
        refundReason || null,
      ]
    );

    // 提交事务
    await client.query('COMMIT');

    // 查询创建的退款日志
    const logResult = await client.query(
      `SELECT 
        id,
        user_id,
        order_id,
        original_request_id,
        refund_amount,
        refund_coins,
        refund_reason,
        status,
        processed_at,
        created_at
      FROM public.refund_logs
      WHERE id = $1`,
      [refundLogId]
    );

    const row = logResult.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      order_id: row.order_id,
      original_request_id: row.original_request_id,
      refund_amount: row.refund_amount,
      refund_coins: row.refund_coins,
      refund_reason: row.refund_reason,
      status: row.status,
      processed_at: row.processed_at,
      created_at: row.created_at,
    };
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('创建订单退款日志失败:', {
      userId,
      orderId,
      refundAmount,
      refundCoins,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('订单不存在') || 
        error.message?.includes('参数错误') ||
        error.message?.includes('无法退款')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`创建订单退款日志失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 创建退款日志（AI服务退款场景）
 * 
 * @param params 退款参数
 * @returns Promise<RefundLog> 创建的退款日志
 */
export async function createServiceRefundLog(
  params: CreateServiceRefundParams
): Promise<RefundLog> {
  const { userId, amount, reason, originalDeduction, originalRequestId, deduction } = params;

  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  if (!amount || amount <= 0) {
    throw new Error('参数错误：退款天机币数量必须大于0');
  }

  // originalRequestId 是可选的，如果没有提供则使用默认值
  const requestId = originalRequestId || `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (!reason || typeof reason !== 'string') {
    throw new Error('参数错误：退款原因必须提供');
  }

  // 映射 reason 到数据库允许的值
  // 数据库 CHECK 约束只允许：'service_unavailable', 'user_cancelled', 'error', 'other'
  let mappedReason: string;
  const reasonLower = reason.toLowerCase();
  if (reasonLower.includes('服务') || reasonLower.includes('service') || reasonLower.includes('unavailable')) {
    mappedReason = 'service_unavailable';
  } else if (reasonLower.includes('取消') || reasonLower.includes('cancel')) {
    mappedReason = 'user_cancelled';
  } else if (reasonLower.includes('错误') || reasonLower.includes('error') || reasonLower.includes('失败') || reasonLower.includes('fail')) {
    mappedReason = 'error';
  } else {
    mappedReason = 'other';
  }

  // 验证扣费明细总和是否等于退款金额
  if (deduction) {
    const deductionTotal = (deduction.daily_coins_grant || 0) + 
                          (deduction.activity_coins_grant || 0) + 
                          (deduction.tianji_coins_balance || 0);
    if (deductionTotal !== amount) {
      console.warn('扣费明细总和与退款金额不一致，使用精确退款模式:', {
        deductionTotal,
        amount,
        deduction,
      });
    }
  }

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    // 开始事务
    await client.query('BEGIN');

    // 检查表结构，确定使用哪个字段
    const tableInfo = await client.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name = 'refund_logs'
         AND column_name IN ('amount', 'refund_coins')`
    );
    
    const hasAmountField = tableInfo.rows.some((row: any) => row.column_name === 'amount');
    const hasRefundCoinsField = tableInfo.rows.some((row: any) => row.column_name === 'refund_coins');

    // 1. 幂等性检查：检查 original_request_id 是否已存在
    // 使用 SELECT FOR UPDATE 锁定行，防止并发问题
    let existingRefundLog: any = null;
    
    if (hasAmountField) {
      const existingResult = await client.query(
        `SELECT 
          id,
          user_id,
          original_request_id,
          amount,
          reason,
          created_at
        FROM public.refund_logs
        WHERE original_request_id = $1 AND user_id = $2
        FOR UPDATE`,
        [requestId, userId]
      );
      
      if (existingResult.rows.length > 0) {
        existingRefundLog = existingResult.rows[0];
      }
    } else if (hasRefundCoinsField) {
      const existingResult = await client.query(
        `SELECT 
          id,
          user_id,
          order_id,
          original_request_id,
          refund_amount,
          refund_coins,
          refund_reason,
          status,
          processed_at,
          created_at
        FROM public.refund_logs
        WHERE original_request_id = $1 AND user_id = $2
        FOR UPDATE`,
        [requestId, userId]
      );
      
      if (existingResult.rows.length > 0) {
        existingRefundLog = existingResult.rows[0];
      }
    }

    // 如果已存在退款记录，直接返回，不重复退款
    if (existingRefundLog) {
      await client.query('COMMIT');
      
      console.log('✅ [createServiceRefundLog] 退款已存在，返回已退款状态（幂等性）:', {
        userId,
        originalRequestId: requestId,
        existingRefundLogId: existingRefundLog.id,
      });

      // 根据表结构返回相应格式
      if (hasAmountField) {
        return {
          id: existingRefundLog.id,
          user_id: existingRefundLog.user_id,
          order_id: null,
          original_request_id: existingRefundLog.original_request_id,
          refund_amount: null,
          refund_coins: existingRefundLog.amount || 0,
          refund_reason: existingRefundLog.reason,
          status: 'completed',
          processed_at: existingRefundLog.created_at,
          created_at: existingRefundLog.created_at,
        };
      } else {
        return {
          id: existingRefundLog.id,
          user_id: existingRefundLog.user_id,
          order_id: existingRefundLog.order_id,
          original_request_id: existingRefundLog.original_request_id,
          refund_amount: existingRefundLog.refund_amount,
          refund_coins: existingRefundLog.refund_coins,
          refund_reason: existingRefundLog.refund_reason,
          status: existingRefundLog.status,
          processed_at: existingRefundLog.processed_at,
          created_at: existingRefundLog.created_at,
        };
      }
    }

    // 2. 创建退款日志
    const refundLogId = randomUUID();
    
    if (hasAmountField) {
      // 使用 amount 字段的表结构
      // 检查是否有 reason 字段的 CHECK 约束
      const constraintCheck = await client.query(
        `SELECT constraint_name, check_clause
         FROM information_schema.check_constraints
         WHERE constraint_schema = 'public'
           AND constraint_name = 'refund_logs_reason_check'`
      );
      
      const reasonValue = constraintCheck.rows.length > 0 ? mappedReason : reason;
      
      await client.query(
        `INSERT INTO public.refund_logs (
          id,
          user_id,
          original_request_id,
          amount,
          reason,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          refundLogId,
          userId,
          requestId,
          amount,
          reasonValue,
        ]
      );
    } else if (hasRefundCoinsField) {
      // 使用 refund_coins 字段的表结构
      // refund_reason 字段通常没有 CHECK 约束，可以直接使用原始 reason
      await client.query(
        `INSERT INTO public.refund_logs (
          id,
          user_id,
          order_id,
          original_request_id,
          refund_amount,
          refund_coins,
          refund_reason,
          status,
          created_at
        )
        VALUES ($1, $2, NULL, $3, NULL, $4, $5, 'pending', NOW())`,
        [
          refundLogId,
          userId,
          requestId,
          amount,  // refund_coins
          reason,  // refund_reason（通常没有 CHECK 约束）
        ]
      );
    } else {
      throw new Error('数据库表 refund_logs 缺少必要的字段（amount 或 refund_coins）');
    }

    // 3. 根据扣费明细精确退款到对应的余额类型
    if (deduction && (deduction.daily_coins_grant || deduction.activity_coins_grant || deduction.tianji_coins_balance)) {
      // 精确退款模式：根据扣费明细退款到对应的余额类型
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (deduction.daily_coins_grant && deduction.daily_coins_grant > 0) {
        updates.push(`daily_coins_grant = daily_coins_grant + $${paramIndex}`);
        values.push(deduction.daily_coins_grant);
        paramIndex++;
      }

      if (deduction.activity_coins_grant && deduction.activity_coins_grant > 0) {
        updates.push(`activity_coins_grant = activity_coins_grant + $${paramIndex}`);
        values.push(deduction.activity_coins_grant);
        paramIndex++;
      }

      if (deduction.tianji_coins_balance && deduction.tianji_coins_balance > 0) {
        updates.push(`tianji_coins_balance = tianji_coins_balance + $${paramIndex}`);
        values.push(deduction.tianji_coins_balance);
        paramIndex++;
      }

      if (updates.length > 0) {
        values.push(userId);
        await client.query(
          `UPDATE public.profiles
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id = $${paramIndex}`,
          values
        );
      }
    } else {
      // 降级方案：如果没有扣费明细，退到储值余额
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [amount, userId]
      );
    }

    // 提交事务
    await client.query('COMMIT');

    // 查询创建的退款日志（根据表结构适配）
    let logResult;
    if (hasAmountField) {
      logResult = await client.query(
        `SELECT 
          id,
          user_id,
          original_request_id,
          amount,
          reason,
          created_at
        FROM public.refund_logs
        WHERE id = $1`,
        [refundLogId]
      );
      
      const row = logResult.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        order_id: null,
        original_request_id: row.original_request_id,
        refund_amount: null,
        refund_coins: row.amount || 0,
        refund_reason: row.reason,
        status: 'pending',
        processed_at: null,
        created_at: row.created_at,
      };
    } else {
      logResult = await client.query(
        `SELECT 
          id,
          user_id,
          order_id,
          original_request_id,
          refund_amount,
          refund_coins,
          refund_reason,
          status,
          processed_at,
          created_at
        FROM public.refund_logs
        WHERE id = $1`,
        [refundLogId]
      );
      
      const row = logResult.rows[0];
      return {
        id: row.id,
        user_id: row.user_id,
        order_id: row.order_id,
        original_request_id: row.original_request_id,
        refund_amount: row.refund_amount,
        refund_coins: row.refund_coins,
        refund_reason: row.refund_reason,
        status: row.status,
        processed_at: row.processed_at,
        created_at: row.created_at,
      };
    }
  } catch (error: any) {
    // 回滚事务
    await client.query('ROLLBACK');

    console.error('创建AI服务退款日志失败:', {
      userId,
      amount,
      originalRequestId,
      error: error.message,
    });

    // 如果是已知错误，直接抛出
    if (error.message?.includes('参数错误')) {
      throw error;
    }

    // 其他错误，包装后抛出
    throw new Error(`创建AI服务退款日志失败: ${error.message || '未知错误'}`);
  } finally {
    // 释放连接
    client.release();
  }
}

/**
 * 创建退款日志（统一接口，自动识别场景）
 * 
 * @param userId 用户ID
 * @param params 退款参数（可以是订单退款或AI服务退款）
 * @returns Promise<RefundLog> 创建的退款日志
 */
export async function createRefundLog(
  userId: string,
  params: Partial<CreateOrderRefundParams & CreateServiceRefundParams>
): Promise<RefundLog> {
  // 判断是订单退款还是AI服务退款
  if (params.orderId) {
    // 订单退款场景
    return createOrderRefundLog({
      userId,
      orderId: params.orderId,
      refundAmount: params.refundAmount!,
      refundCoins: params.refundCoins!,
      refundReason: params.refundReason,
    });
  } else if (params.originalRequestId) {
    // AI服务退款场景
    return createServiceRefundLog({
      userId,
      amount: params.amount!,
      reason: params.reason!,
      originalDeduction: params.originalDeduction || params.amount!,
      originalRequestId: params.originalRequestId,
    });
  } else {
    throw new Error('参数错误：必须提供 orderId（订单退款）或 originalRequestId（AI服务退款）');
  }
}

/**
 * 检查首充状态
 * 检查用户是否已经完成首次充值
 * 
 * @param userId 用户ID
 * @returns Promise<{ is_first_purchase: boolean; first_purchase_order_id: string | null; first_purchase_date: Date | null }> 首充状态（✅ 统一使用 snake_case）
 */
export async function checkFirstPurchase(userId: string): Promise<{
  is_first_purchase: boolean;              // ✅ 统一使用 snake_case
  first_purchase_order_id: string | null; // ✅ 统一使用 snake_case
  first_purchase_date: Date | null;       // ✅ 统一使用 snake_case
}> {
  // 参数验证
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 查询用户是否有已完成的充值订单
    const result = await pool.query(
      `SELECT id, created_at
       FROM public.transactions
       WHERE user_id = $1 
         AND type = 'purchase' 
         AND status = 'completed'
         AND item_type = 'coin_pack'
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // 用户还没有完成首次充值
      return {
        is_first_purchase: true,              // ✅ 统一使用 snake_case
        first_purchase_order_id: null,       // ✅ 统一使用 snake_case
        first_purchase_date: null,           // ✅ 统一使用 snake_case
      };
    }

    // 用户已经完成首次充值
    const firstOrder = result.rows[0];
    return {
      is_first_purchase: false,              // ✅ 统一使用 snake_case
      first_purchase_order_id: firstOrder.id,  // ✅ 统一使用 snake_case
      first_purchase_date: firstOrder.created_at,  // ✅ 统一使用 snake_case
    };
  } catch (error: any) {
    console.error('检查首充状态失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`检查首充状态失败: ${error.message || '未知错误'}`);
  }
}

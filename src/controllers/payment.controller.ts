import { Response } from 'express';
import * as paymentService from '../services/payment.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendError,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

/**
 * 支付控制器模块
 * 处理支付相关的 HTTP 请求和响应
 */

/**
 * 创建支付订单控制器
 * POST /api/payment/orders
 */
export async function createOrder(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { amount, coinsAmount, itemType, packType, paymentProvider, description } = req.body;

    // 参数验证
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      sendBadRequest(res, '支付金额 (amount) 必须提供且大于0');
      return;
    }

    // 🟢 修复：根据 itemType 判断是否需要 coinsAmount
    // 如果是订阅订单（itemType === 'subscription'），则不需要 coinsAmount
    // 如果是充值订单（itemType === 'coin_pack' 或未指定），则需要 coinsAmount
    const finalItemType = itemType || 'coin_pack';
    const isSubscription = finalItemType === 'subscription';
    
    if (!isSubscription) {
      // 充值订单必须提供 coinsAmount
      if (!coinsAmount || typeof coinsAmount !== 'number' || coinsAmount <= 0) {
        sendBadRequest(res, '天机币数量 (coinsAmount) 必须提供且大于0');
        return;
      }
    }

    // 执行创建订单
    const result = await paymentService.createOrder(
      userId,
      amount,
      coinsAmount, // 订阅订单可以为 undefined
      finalItemType, // 传递 itemType
      packType,
      paymentProvider,
      description
    );

    // 返回成功结果 - 确保数据结构统一，包含所有字段
    sendSuccess(
      res,
      {
        orderId: result.order_id, // 统一使用 camelCase
        order_id: result.order_id, // 保留 snake_case 以兼容旧代码
        amount: result.amount, // 支付金额
        payment_url: result.payment_url, // 支付链接
        paymentUrl: result.payment_url, // 兼容 camelCase 命名
      },
      result.message || '订单创建成功'
    );
  } catch (error: any) {
    console.error('创建订单失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('用户不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误') || error.message?.includes('新人礼仅限首次购买')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, undefined, error);
  }
}

/**
 * 处理支付回调控制器
 * POST /api/payment/callback
 * 
 * 注意：这个接口可能需要特殊的安全验证（如签名验证），
 * 以防止恶意调用。实际生产环境中应该添加支付提供商的签名验证。
 */
export async function handlePaymentCallback(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 注意：支付回调可能不需要用户认证，但需要验证支付提供商的签名
    // 这里为了简化，暂时不要求认证，但实际生产环境应该添加签名验证

    const { orderId, status, paymentProvider, paidAt } = req.body;

    // 参数验证
    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '订单ID (orderId) 必须提供且为字符串',
      });
      return;
    }

    if (!status || (status !== 'completed' && status !== 'failed')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '支付状态 (status) 必须是 completed 或 failed',
      });
      return;
    }

    // 执行支付回调处理
    const result = await paymentService.handlePaymentCallback(
      orderId,
      status,
      paymentProvider,
      paidAt ? new Date(paidAt) : undefined
    );

    // 返回成功结果 - 确保数据结构统一
    sendSuccess(
      res,
      {
        orderId: result.order_id,
        order_id: result.order_id, // 兼容旧代码
        newBalance: result.new_balance,
        new_balance: result.new_balance, // 兼容旧代码
      },
      result.message || '支付回调处理成功'
    );
  } catch (error: any) {
    console.error('处理支付回调失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('订单不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('不能重复处理')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, undefined, error);
  }
}

/**
 * 查询订单列表控制器
 * GET /api/payment/orders
 */
export async function getOrders(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 获取查询参数
    const status = req.query.status as string | undefined;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 50;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;

    // 参数验证 - 允许的状态：pending, paid, completed, failed
    const allowedStatuses = ['pending', 'paid', 'completed', 'failed'];
    if (status && !allowedStatuses.includes(status as string)) {
      sendBadRequest(res, `status 必须是 ${allowedStatuses.join(', ')} 之一`);
      return;
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'limit 必须在 1-100 之间',
      });
      return;
    }

    if (isNaN(offset) || offset < 0) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'offset 不能为负数',
      });
      return;
    }

    // 查询订单列表
    const orders = await paymentService.getOrders(userId, status, limit, offset);

    // 返回订单列表 - 确保数据结构统一
    sendSuccess(res, {
      orders,
      pagination: {
        limit,
        offset,
        count: orders.length,
        total: orders.length, // 简化版，实际应该从数据库查询总数
      },
    });
  } catch (error: any) {
    console.error('查询订单列表失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 查询单个订单详情控制器
 * GET /api/payment/orders/:orderId
 */
export async function getOrderById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const orderId = req.params.orderId;

    // 参数验证
    if (!orderId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '订单ID必须提供',
      });
      return;
    }

    // 查询订单详情（带用户ID验证，确保用户只能查询自己的订单）
    const order = await paymentService.getOrderById(orderId, userId);

    if (order === null) {
      res.status(404).json({
        success: false,
        error: '订单不存在',
      });
      return;
    }

    // 返回订单详情 - 确保数据结构统一
    sendSuccess(res, order);
  } catch (error: any) {
    console.error('查询订单详情失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * [开发专用] 模拟支付成功控制器
 * POST /api/payment/mock/success
 * 
 * 注意：此接口仅在开发环境可用，生产环境会被拒绝
 */
export async function handleMockPaymentSuccess(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 1. 安全检查：仅限开发环境
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({
        success: false,
        error: '生产环境禁止使用 Mock 支付',
        message: 'Mock 支付功能仅在开发环境可用',
      });
      return;
    }

    // 2. 检查认证（可选，Mock 支付可能需要认证）
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const { orderId } = req.body;

    // 3. 参数验证
    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '订单ID (orderId) 必须提供且为字符串',
      });
      return;
    }

    // 4. 调用 Service 层的 Mock 支付逻辑（将状态设置为 'paid'）
    const result = await paymentService.mockPaySuccess(orderId);

    // 5. 返回成功结果 - 确保数据结构统一
    sendSuccess(
      res,
      {
        orderId: result.order_id || orderId,
        order_id: result.order_id || orderId, // 兼容旧代码
        newBalance: result.new_balance,
        new_balance: result.new_balance, // 兼容旧代码
      },
      result.message || 'Mock 支付成功，天机币已发放'
    );
  } catch (error: any) {
    console.error('Mock 支付失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('订单不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('订单已支付')) {
      // mockPaySuccess 函数已经处理了幂等性，这里不需要特殊处理
      // 如果函数返回成功，说明订单已支付，直接返回成功响应
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, undefined, error);
  }
}

/**
 * [开发专用] 模拟支付失败控制器
 * POST /api/payment/mock/fail
 * 
 * 注意：此接口仅在开发环境可用，生产环境会被拒绝
 */
export async function handleMockPaymentFail(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 1. 安全检查：仅限开发环境
    if (process.env.NODE_ENV !== 'development') {
      sendError(res, '生产环境禁止使用 Mock 支付', 'Mock 支付功能仅在开发环境可用', 403);
      return;
    }

    // 2. 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const { orderId } = req.body;

    // 3. 参数验证
    if (!orderId || typeof orderId !== 'string') {
      sendBadRequest(res, '订单ID (orderId) 必须提供且为字符串');
      return;
    }

    // 4. 调用 Service 层的 Mock 支付失败逻辑
    const result = await paymentService.mockPayFail(orderId);

    // 5. 返回成功结果
    sendSuccess(
      res,
      {
        orderId: result.order_id || orderId,
        order_id: result.order_id || orderId, // 兼容旧代码
      },
      result.message || 'Mock 支付失败已触发'
    );
  } catch (error: any) {
    console.error('Mock 支付失败处理错误:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('订单不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, undefined, error);
  }
}

/**
 * [开发专用] 模拟支付取消控制器
 * POST /api/payment/mock/cancel
 * 
 * 注意：此接口仅在开发环境可用，生产环境会被拒绝
 */
export async function handleMockPaymentCancel(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 1. 安全检查：仅限开发环境
    if (process.env.NODE_ENV !== 'development') {
      sendError(res, '生产环境禁止使用 Mock 支付', 'Mock 支付功能仅在开发环境可用', 403);
      return;
    }

    // 2. 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const { orderId } = req.body;

    // 3. 参数验证
    if (!orderId || typeof orderId !== 'string') {
      sendBadRequest(res, '订单ID (orderId) 必须提供且为字符串');
      return;
    }

    // 4. 调用 Service 层的 Mock 支付取消逻辑
    const result = await paymentService.mockPayCancel(orderId);

    // 5. 返回成功结果
    sendSuccess(
      res,
      {
        orderId: result.order_id || orderId,
        order_id: result.order_id || orderId, // 兼容旧代码
      },
      result.message || 'Mock 支付取消已触发'
    );
  } catch (error: any) {
    console.error('Mock 支付取消处理错误:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('订单不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, undefined, error);
  }
}

import { Response } from 'express';
import * as subscriptionService from '../services/subscription.service';
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
 * 订阅/会员系统控制器模块
 * 处理订阅相关的 HTTP 请求和响应
 */

/**
 * 获取订阅状态控制器
 * GET /api/subscription/status
 */
export async function getSubscriptionStatus(
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

    // 获取订阅状态
    const status = await subscriptionService.getSubscriptionStatus(userId);

    // 返回成功结果
    sendSuccess(res, status);
  } catch (error: any) {
    console.error('获取订阅状态失败:', error);

    if (error.message?.includes('用户不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 创建订阅订单控制器
 * POST /api/subscription/create
 */
export async function createSubscription(
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
    const { tier, isYearly, paymentMethod } = req.body;

    // 参数验证
    if (!tier || !['basic', 'premium', 'vip'].includes(tier)) {
      sendBadRequest(res, '会员等级必须为 basic、premium 或 vip');
      return;
    }

    if (typeof isYearly !== 'boolean') {
      sendBadRequest(res, 'isYearly 必须为布尔值');
      return;
    }

    // 创建订阅
    const result = await subscriptionService.createSubscription(
      userId,
      tier,
      isYearly,
      paymentMethod
    );

    // 返回成功结果 - 确保数据结构统一
    sendSuccess(res, {
      ...result,
      orderId: result.orderId || (result as any).order_id, // 兼容不同格式
      order_id: (result as any).order_id || result.orderId, // 兼容旧代码
    });
  } catch (error: any) {
    console.error('创建订阅失败:', error);

    if (error.message?.includes('参数错误') || error.message?.includes('不能订阅免费等级')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 检查订阅状态控制器
 * GET /api/subscription/check-status
 */
export async function checkSubscriptionStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const { orderId } = req.query;

    // 参数验证
    if (!orderId || typeof orderId !== 'string') {
      sendBadRequest(res, '订单ID必须提供');
      return;
    }

    // 检查订阅状态
    const result = await subscriptionService.checkSubscriptionStatus(orderId);

    // 返回成功结果
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('检查订阅状态失败:', error);

    if (error.message?.includes('订单不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 取消订阅控制器
 * POST /api/subscription/cancel
 * 
 * 请求格式：
 * - 请求头：Authorization: Bearer <token>
 * - 请求体：无（从 token 中获取用户 ID）
 * 
 * 响应格式：
 * {
 *   success: true,
 *   data: {
 *     subscription: { ... },
 *     expiresAt: "2026-02-01T00:00:00Z",
 *     message: "已取消订阅，将在 2026年2月1日 到期后停止续费"
 *   }
 * }
 */
export async function cancelSubscription(
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

    // 取消订阅
    const result = await subscriptionService.cancelSubscription(userId);

    // 返回成功结果，包含订阅信息和提示消息
    sendSuccess(res, {
      subscription: result.subscription,
      expiresAt: result.expiresAt,
      message: result.message,
    }, result.message);
  } catch (error: any) {
    console.error('取消订阅失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('您当前没有活跃的订阅')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 检查功能权限控制器
 * GET /api/subscription/check-feature
 */
export async function checkFeaturePermission(
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
    const { featurePath } = req.query;

    // 参数验证
    if (!featurePath || typeof featurePath !== 'string') {
      sendBadRequest(res, '功能路径必须提供');
      return;
    }

    // 检查功能权限
    const result = await subscriptionService.checkFeaturePermission(
      userId,
      featurePath
    );

    // 返回成功结果
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('检查功能权限失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取今日使用次数控制器
 * GET /api/subscription/usage/:feature
 */
export async function getTodayUsage(
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
    const { feature } = req.params;

    // 参数验证
    if (!feature) {
      sendBadRequest(res, '功能名称必须提供');
      return;
    }

    // 获取今日使用次数
    const usage = await subscriptionService.getTodayUsage(userId, feature);

    // 返回成功结果
    sendSuccess(res, usage);
  } catch (error: any) {
    console.error('获取今日使用次数失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 记录功能使用控制器
 * POST /api/subscription/record-usage
 */
export async function recordUsage(
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
    const { feature, metadata } = req.body;

    // 参数验证
    if (!feature) {
      sendBadRequest(res, '功能名称必须提供');
      return;
    }

    // 记录功能使用
    await subscriptionService.recordUsage(userId, feature, metadata);

    // 返回成功结果
    sendSuccess(res, null, '使用记录已保存');
  } catch (error: any) {
    console.error('记录功能使用失败:', error);

    if (error.message?.includes('今日使用次数已达上限')) {
      sendError(res, '使用次数已达上限', error.message, 403);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 检查过期订阅控制器
 * POST /api/subscription/check-expired
 */
export async function checkExpiredSubscription(
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

    // 检查过期订阅
    const result = await subscriptionService.checkExpiredSubscription(userId);

    // 返回成功结果
    sendSuccess(res, result);
  } catch (error: any) {
    console.error('检查过期订阅失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

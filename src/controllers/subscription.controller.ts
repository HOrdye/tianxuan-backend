import { Response } from 'express';
import * as subscriptionService from '../services/subscription.service';
import { AuthRequest } from '../middleware/auth.middleware';

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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 获取订阅状态
    const status = await subscriptionService.getSubscriptionStatus(userId);

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('获取订阅状态失败:', error);

    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '获取订阅状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { tier, isYearly, paymentMethod } = req.body;

    // 参数验证
    if (!tier || !['basic', 'premium', 'vip'].includes(tier)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '会员等级必须为 basic、premium 或 vip',
      });
      return;
    }

    if (typeof isYearly !== 'boolean') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'isYearly 必须为布尔值',
      });
      return;
    }

    // 创建订阅
    const result = await subscriptionService.createSubscription(
      userId,
      tier,
      isYearly,
      paymentMethod
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('创建订阅失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('不能订阅免费等级')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '创建订阅失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const { orderId } = req.query;

    // 参数验证
    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '订单ID必须提供',
      });
      return;
    }

    // 检查订阅状态
    const result = await subscriptionService.checkSubscriptionStatus(orderId);

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('检查订阅状态失败:', error);

    if (error.message?.includes('订单不存在')) {
      res.status(404).json({
        success: false,
        error: '订单不存在',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '检查订阅状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 取消订阅控制器
 * POST /api/subscription/cancel
 */
export async function cancelSubscription(
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

    // 取消订阅
    await subscriptionService.cancelSubscription(userId);

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: '订阅已取消',
    });
  } catch (error: any) {
    console.error('取消订阅失败:', error);

    if (error.message?.includes('没有找到活跃的订阅')) {
      res.status(404).json({
        success: false,
        error: '没有找到活跃的订阅',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '取消订阅失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { featurePath } = req.query;

    // 参数验证
    if (!featurePath || typeof featurePath !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '功能路径必须提供',
      });
      return;
    }

    // 检查功能权限
    const result = await subscriptionService.checkFeaturePermission(
      userId,
      featurePath
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('检查功能权限失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '检查功能权限失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { feature } = req.params;

    // 参数验证
    if (!feature) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '功能名称必须提供',
      });
      return;
    }

    // 获取今日使用次数
    const usage = await subscriptionService.getTodayUsage(userId, feature);

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    console.error('获取今日使用次数失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '获取今日使用次数失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { feature, metadata } = req.body;

    // 参数验证
    if (!feature) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '功能名称必须提供',
      });
      return;
    }

    // 记录功能使用
    await subscriptionService.recordUsage(userId, feature, metadata);

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: '使用记录已保存',
    });
  } catch (error: any) {
    console.error('记录功能使用失败:', error);

    if (error.message?.includes('今日使用次数已达上限')) {
      res.status(403).json({
        success: false,
        error: '使用次数已达上限',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '记录功能使用失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 检查过期订阅
    const result = await subscriptionService.checkExpiredSubscription(userId);

    // 返回成功结果
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('检查过期订阅失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '检查过期订阅失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

import { Response } from 'express';
import * as coinsService from '../services/coins.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendUnauthorized, sendBadRequest, sendNotFound, sendInternalError } from '../utils/response';

/**
 * 天机币控制器模块
 * 处理天机币相关的 HTTP 请求和响应
 */

/**
 * 扣费控制器
 * POST /api/coins/deduct
 */
export async function deductCoins(
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
    
    // 🐛 Debug: 记录接收到的请求数据
    console.log('[deductCoins Controller] 接收到的请求数据:', JSON.stringify(req.body, null, 2));
    console.log('[deductCoins Controller] 用户ID:', userId);
    
    // 支持 featureType (前端) 和 feature_type (后端) 两种参数名
    const featureType = req.body.featureType !== undefined 
      ? req.body.featureType 
      : req.body.feature_type;
    
    // 支持 price (前端) 参数
    const price = req.body.price;

    // 参数验证
    if (!featureType || typeof featureType !== 'string') {
      console.error('[deductCoins Controller] 参数验证失败: featureType 缺失或类型错误', {
        receivedFeatureType: req.body.featureType,
        receivedFeature_type: req.body.feature_type,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '功能类型 (featureType 或 feature_type) 必须提供且为字符串',
      });
      return;
    }

    if (price === undefined || price === null) {
      console.error('[deductCoins Controller] 参数验证失败: price 缺失', {
        receivedPrice: req.body.price,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '价格 (price) 必须提供且为正数',
      });
      return;
    }

    if (typeof price !== 'number' || price <= 0) {
      console.error('[deductCoins Controller] 参数验证失败: price 类型错误或非正数', {
        receivedPrice: req.body.price,
        priceType: typeof price,
        body: req.body,
      });
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '价格 (price) 必须为正数',
      });
      return;
    }

    // 执行扣费
    const result = await coinsService.deductCoins(userId, featureType, price);

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '扣费成功',
      data: {
        remaining_balance: result.remaining_balance,
        transaction_id: result.transaction_id,
        deduction: result.deduction,  // 返回扣费明细，用于退款时精确退款
      },
    });
  } catch (error: any) {
    console.error('扣费失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('余额不足') || error.message?.includes('insufficient')) {
      res.status(400).json({
        success: false,
        error: '余额不足',
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

    // 其他错误
    res.status(500).json({
      success: false,
      error: '扣费失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询余额控制器
 * GET /api/coins/balance
 */
export async function getBalance(
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

    // 查询余额
    const balance = await coinsService.getBalance(userId);

    if (balance === null) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    // 返回余额信息
    res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error: any) {
    console.error('查询余额失败:', error);

    res.status(500).json({
      success: false,
      error: '查询余额失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 管理员调整天机币控制器
 * POST /api/coins/admin/adjust
 */
export async function adminAdjustCoins(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证（requireAdmin 中间件会检查管理员权限）
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const operatorId = req.user.userId;
    const { targetUserId, adjustmentAmount, reason, coinType } = req.body;

    // 参数验证
    if (!targetUserId || typeof targetUserId !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '目标用户ID (targetUserId) 必须提供且为字符串',
      });
      return;
    }

    if (!adjustmentAmount || typeof adjustmentAmount !== 'number' || adjustmentAmount === 0) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '调整金额 (adjustmentAmount) 必须提供且不为0',
      });
      return;
    }

    // 执行调整
    const result = await coinsService.adminAdjustCoins(
      operatorId,
      targetUserId,
      adjustmentAmount,
      reason || '管理员调整',
      coinType || 'tianji_coins_balance'
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '调整成功',
      data: {
        new_balance: result.new_balance,
        transaction_id: result.transaction_id,
      },
    });
  } catch (error: any) {
    console.error('管理员调整天机币失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('只有管理员')) {
      res.status(403).json({
        success: false,
        error: '权限不足',
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

    // 其他错误
    res.status(500).json({
      success: false,
      error: '调整失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询天机币交易流水控制器
 * GET /api/coins/transactions
 */
export async function getCoinTransactions(
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
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 50;
    const offset = req.query.offset
      ? parseInt(req.query.offset as string, 10)
      : 0;

    // 参数验证
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

    // 查询交易流水
    const transactions = await coinsService.getCoinTransactions(
      userId,
      limit,
      offset
    );

    // 返回交易流水
    res.status(200).json({
      success: true,
      data: {
        transactions,
        limit,
        offset,
        count: transactions.length,
      },
    });
  } catch (error: any) {
    console.error('查询交易流水失败:', error);

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
      error: '查询交易流水失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 退款控制器
 * POST /api/coins/refund
 */
export async function refundCoins(
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
    
    // 支持 camelCase 和 snake_case 参数名
    const amount = req.body.amount;
    const reason = req.body.reason || req.body.description;
    const deduction = req.body.deduction;

    // 参数验证
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      sendBadRequest(res, '退款金额 (amount) 必须提供且为正数');
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      sendBadRequest(res, '退款原因 (reason) 必须提供且不能为空');
      return;
    }

    // 执行退款
    const result = await coinsService.refundCoins({
      userId,
      amount,
      reason: reason.trim(),
      deduction,
    });

    // 返回成功结果
    sendSuccess(res, {
      refunded_amount: result.refunded_amount,
    }, result.message || '退款成功');
  } catch (error: any) {
    console.error('退款失败:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误') || error.message?.includes('必须')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('用户不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    // 其他错误
    sendInternalError(res, '退款失败，请稍后重试', error);
  }
}

/**
 * 查询注册奖励状态控制器
 * GET /api/coins/registration-bonus/status
 */
export async function getRegistrationBonusStatus(
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

    // 查询注册奖励状态
    const status = await coinsService.getRegistrationBonusStatus(userId);

    if (status === null) {
      sendNotFound(res, '用户不存在');
      return;
    }

    // 返回注册奖励状态
    sendSuccess(res, status);
  } catch (error: any) {
    console.error('查询注册奖励状态失败:', error);

    sendInternalError(res, '查询注册奖励状态失败', error);
  }
}

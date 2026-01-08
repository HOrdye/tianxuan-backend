import { Response } from 'express';
import * as coinsService from '../services/coins.service';
import { AuthRequest } from '../middleware/auth.middleware';

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
    const { featureType, price } = req.body;

    // 参数验证
    if (!featureType || typeof featureType !== 'string') {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '功能类型 (featureType) 必须提供且为字符串',
      });
      return;
    }

    if (!price || typeof price !== 'number' || price <= 0) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '价格 (price) 必须提供且为正数',
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

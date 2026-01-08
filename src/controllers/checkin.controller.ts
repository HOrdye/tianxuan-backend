import { Response } from 'express';
import * as checkinService from '../services/checkin.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 签到控制器模块
 * 处理签到相关的 HTTP 请求和响应
 */

/**
 * 每日签到控制器
 * POST /api/checkin
 */
export async function dailyCheckIn(
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

    // 执行签到
    const result = await checkinService.dailyCheckIn(userId);

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '签到成功',
      data: {
        coins_earned: result.coins_earned,
        consecutive_days: result.consecutive_days,
        check_in_date: result.check_in_date,
      },
    });
  } catch (error: any) {
    console.error('签到失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('今日已签到') || error.message?.includes('already checked in')) {
      res.status(400).json({
        success: false,
        error: '今日已签到',
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
      error: '签到失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询签到状态控制器
 * GET /api/checkin/status
 */
export async function getCheckInStatus(
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

    // 查询签到状态
    const status = await checkinService.getCheckInStatus(userId);

    if (status === null) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    // 返回签到状态
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('查询签到状态失败:', error);

    res.status(500).json({
      success: false,
      error: '查询签到状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询签到记录控制器
 * GET /api/checkin/logs
 */
export async function getCheckInLogs(
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
      : 30;
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

    // 查询签到记录
    const logs = await checkinService.getCheckInLogs(userId, limit, offset);

    // 返回签到记录
    res.status(200).json({
      success: true,
      data: {
        logs,
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error: any) {
    console.error('查询签到记录失败:', error);

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
      error: '查询签到记录失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

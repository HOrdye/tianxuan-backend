import { Response } from 'express';
import * as checkinService from '../services/checkin.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendUnauthorized, sendBadRequest, sendNotFound, sendInternalError } from '../utils/response';

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

    // 检查是否是 /daily 路由（通过路径判断）
    const isDailyRoute = req.path === '/daily' || req.path.endsWith('/daily');
    
    if (isDailyRoute) {
      // 前端期望的格式
      sendSuccess(
        res,
        {
          success: true,
          coinsEarned: result.coins_earned,
          consecutiveDays: result.consecutive_days,
          message: result.message || `签到成功！获得 ${result.coins_earned} 天机币，连续签到 ${result.consecutive_days} 天`,
        },
        result.message || '签到成功'
      );
    } else {
      // 原有格式（兼容）
      sendSuccess(
        res,
        {
          coins_earned: result.coins_earned,
          consecutive_days: result.consecutive_days,
          check_in_date: result.check_in_date,
        },
        result.message || '签到成功'
      );
    }
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

    // 查询签到状态（✅ 已修复：直接查询 check_in_logs 表）
    const status = await checkinService.getCheckInStatus(userId);

    if (status === null) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    // ✅ 使用服务层返回的 can_check_in_today（已基于 check_in_logs 表计算）
    const canCheckIn = status.can_check_in_today;
    
    // 计算今日奖励（根据用户等级和连续天数）
    const tier = (status.tier || 'free').toLowerCase();
    const tierRewards: Record<string, number> = {
      'free': 10,
      'guest': 10,
      'explorer': 10,
      'basic': 15,
      'premium': 20,
      'vip': 30,
      'destiny_master': 20,
      'celestial_master': 30,
    };
    const baseReward = tierRewards[tier] || 10;
    const consecutiveDays = status.consecutive_check_in_days || 0;
    const bonusReward = Math.floor(consecutiveDays / 7) * 10;
    const todayReward = baseReward + bonusReward;
    
    // 返回签到状态（匹配前端期望格式）
    sendSuccess(
      res,
      {
        canCheckIn,
        lastCheckInDate: status.last_check_in_date,
        consecutiveDays: status.consecutive_check_in_days,
        todayReward,
      },
      '查询成功'
    );
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

    // 检查是否是 /history 路由
    const isHistoryRoute = req.path === '/history' || req.path.endsWith('/history');
    
    if (isHistoryRoute) {
      // 前端期望的格式：直接返回数组
      sendSuccess(
        res,
        logs.map(log => ({
          id: log.id,
          user_id: log.user_id,
          check_in_date: log.check_in_date,
          coins_earned: log.coins_earned,
          consecutive_days: log.consecutive_days,
          tier: log.tier,
          created_at: log.created_at,
        })),
        '查询成功'
      );
    } else {
      // 原有格式（兼容）
      sendSuccess(
        res,
        {
          logs,
          limit,
          offset,
          count: logs.length,
        }
      );
    }
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

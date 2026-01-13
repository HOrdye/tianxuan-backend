import { Response } from 'express';
import * as checkinUpgradeService from '../services/checkin-upgrade.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../config/database';
import { sendSuccess, sendError, sendUnauthorized, sendBadRequest, sendNotFound, sendInternalError } from '../utils/response';

/**
 * 签到升级补差控制器模块
 * 处理升级补差相关的 HTTP 请求和响应
 */

/**
 * 计算升级补差控制器
 * GET /api/checkin/upgrade-bonus/calculate
 */
export async function calculateUpgradeBonus(
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
    // 支持 newTier (前端) 和 new_tier (后端) 两种参数名
    const newTier = (req.query.newTier || req.query.new_tier) as string;
    const upgradeDate = req.query.upgrade_date as string | undefined;

    // 参数验证
    if (!newTier) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '新会员等级必须提供（参数名：newTier 或 new_tier）',
      });
      return;
    }

    if (!['free', 'basic', 'premium', 'vip'].includes(newTier)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '无效的会员等级，必须是 free、basic、premium 或 vip',
      });
      return;
    }

    // 查询今天的签到记录
    const today = new Date().toISOString().split('T')[0];
    const todayCheckInResult = await pool.query(
      `SELECT coins_earned, consecutive_days 
       FROM public.check_in_logs 
       WHERE user_id = $1 AND check_in_date = $2`,
      [userId, today]
    );

    const hasTodayCheckIn = todayCheckInResult.rows.length > 0;
    const todayCheckIn = hasTodayCheckIn ? todayCheckInResult.rows[0] : null;

    // 如果今天已签到，计算补差
    if (hasTodayCheckIn && todayCheckIn) {
      // 计算新等级应得奖励
      const tierRewards: Record<string, number> = {
        'free': 10,
        'basic': 15,
        'premium': 20,
        'vip': 30,
      };
      const baseReward = tierRewards[newTier] || 10;
      const consecutiveDays = todayCheckIn.consecutive_days || 1;
      const bonusReward = Math.floor(consecutiveDays / 7) * 10;
      const expectedCoins = baseReward + bonusReward;
      const alreadyEarned = todayCheckIn.coins_earned || 0;
      const bonusCoins = Math.max(0, expectedCoins - alreadyEarned);

      sendSuccess(
        res,
        {
          hasBonus: bonusCoins > 0,
          bonusCoins,
          todayReward: expectedCoins,
          alreadyEarned,
          consecutiveDays,
        },
        '计算成功'
      );
    } else {
      // 今天未签到，无需补差
      sendSuccess(
        res,
        {
          hasBonus: false,
          bonusCoins: 0,
          todayReward: 0,
          alreadyEarned: 0,
          consecutiveDays: 0,
        },
        '计算成功'
      );
    }
  } catch (error: any) {
    console.error('计算升级补差失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '计算升级补差失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 发放升级补差控制器
 * POST /api/checkin/upgrade-bonus/grant
 */
export async function grantUpgradeBonus(
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
    // 支持 newTier (前端) 和 new_tier (后端) 两种参数名
    const newTier = req.body.newTier || req.body.new_tier;

    // 参数验证
    if (!newTier) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '新会员等级必须提供（参数名：newTier 或 new_tier）',
      });
      return;
    }

    if (!['free', 'basic', 'premium', 'vip'].includes(newTier)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '无效的会员等级，必须是 free、basic、premium 或 vip',
      });
      return;
    }

    // 发放补差
    const result = await checkinUpgradeService.grantUpgradeBonus(
      userId,
      newTier as 'free' | 'basic' | 'premium' | 'vip',
      req.body.upgrade_date
    );

    // 返回发放结果（匹配前端期望格式）
    sendSuccess(
      res,
      {
        success: true,
        bonusCoins: result.total_bonus_coins,
        message: result.message || `升级补差成功！获得 ${result.total_bonus_coins} 天机币`,
      },
      result.message || '补差发放成功'
    );
  } catch (error: any) {
    console.error('发放升级补差失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '发放升级补差失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

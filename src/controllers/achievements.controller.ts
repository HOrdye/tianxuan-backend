import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as achievementsService from '../services/achievements.service';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendInternalError,
} from '../utils/response';

/**
 * 成就系统控制器模块
 * 处理成就相关的 HTTP 请求和响应
 */

/**
 * 检查用户是否拥有指定类型的成就
 * GET /api/achievements/check?type=xxx
 */
export async function checkAchievement(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const achievementType = req.query.type as string;

    if (!achievementType) {
      sendBadRequest(res, '成就类型不能为空');
      return;
    }

    const result = await achievementsService.checkAchievement(userId, achievementType);

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('检查成就失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取用户的所有成就
 * GET /api/achievements
 */
export async function getUserAchievements(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    const achievements = await achievementsService.getUserAchievements(userId);

    sendSuccess(res, achievements);
  } catch (error: any) {
    console.error('获取用户成就失败:', error);
    sendInternalError(res, undefined, error);
  }
}

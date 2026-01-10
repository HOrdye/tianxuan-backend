import { Response } from 'express';
import * as userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

/**
 * 用户资料控制器模块
 * 处理用户资料相关的 HTTP 请求和响应
 */

/**
 * 获取当前用户资料控制器
 * GET /api/user/profile
 */
export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户资料
    const profile = await userService.getProfile(userId);

    if (!profile) {
      sendNotFound(res, '用户资料不存在');
      return;
    }

    // 返回用户资料
    sendSuccess(res, profile);
  } catch (error: any) {
    console.error('获取用户资料失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 更新当前用户资料控制器
 * PUT /api/user/profile
 */
export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const updateData = req.body;

    // 验证输入
    if (!updateData || Object.keys(updateData).length === 0) {
      sendBadRequest(res, '请提供要更新的数据');
      return;
    }

    // 更新用户资料
    const updatedProfile = await userService.updateProfile(userId, updateData);

    // 返回更新后的资料
    sendSuccess(res, updatedProfile, '资料更新成功');
  } catch (error: any) {
    console.error('更新用户资料失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取当前用户等级控制器
 * GET /api/user/tier
 */
export async function getUserTier(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户等级
    const tier = await userService.getUserTier(userId);

    if (tier === null) {
      sendNotFound(res, '用户不存在');
      return;
    }

    // 返回用户等级
    sendSuccess(res, {
      tier: tier || 'free', // 默认为 free
    });
  } catch (error: any) {
    console.error('获取用户等级失败:', error);
    sendInternalError(res, undefined, error);
  }
}

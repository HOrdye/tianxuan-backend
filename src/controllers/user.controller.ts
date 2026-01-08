import { Response } from 'express';
import * as userService from '../services/user.service';
import { AuthRequest } from '../middleware/auth.middleware';

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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 获取用户资料
    const profile = await userService.getProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        error: '用户资料不存在',
      });
      return;
    }

    // 返回用户资料
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('获取用户资料失败:', error);

    res.status(500).json({
      success: false,
      error: '获取用户资料失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const updateData = req.body;

    // 验证输入
    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: '请提供要更新的数据',
      });
      return;
    }

    // 更新用户资料
    const updatedProfile = await userService.updateProfile(userId, updateData);

    // 返回更新后的资料
    res.status(200).json({
      success: true,
      message: '资料更新成功',
      data: updatedProfile,
    });
  } catch (error: any) {
    console.error('更新用户资料失败:', error);

    if (error.message === '用户不存在') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '更新用户资料失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
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
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 获取用户等级
    const tier = await userService.getUserTier(userId);

    if (tier === null) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    // 返回用户等级
    res.status(200).json({
      success: true,
      data: {
        tier: tier || 'free', // 默认为 free
      },
    });
  } catch (error: any) {
    console.error('获取用户等级失败:', error);

    res.status(500).json({
      success: false,
      error: '获取用户等级失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

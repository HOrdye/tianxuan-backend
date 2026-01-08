import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { isAdmin } from '../services/coins.service';

/**
 * 管理员权限检查中间件
 * 验证当前用户是否为管理员
 * 
 * @param req Express 请求对象（必须已通过 authenticateToken 中间件）
 * @param res Express 响应对象
 * @param next Express 下一个中间件函数
 */
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 检查是否已认证
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        error: '未认证',
        message: '请先登录',
      });
      return;
    }

    const userId = req.user.userId;

    // 检查是否为管理员
    const adminStatus = await isAdmin(userId);

    if (!adminStatus) {
      res.status(403).json({
        success: false,
        error: '权限不足',
        message: '只有管理员可以执行此操作',
      });
      return;
    }

    // 是管理员，继续处理请求
    next();
  } catch (error: any) {
    console.error('管理员权限检查失败:', error);
    res.status(500).json({
      success: false,
      error: '权限检查失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

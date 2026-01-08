import { Request, Response } from 'express';
import { register as registerUser, login as loginUser, getUserById, verifyToken } from '../services/auth.service';
import { validatePasswordStrength } from '../utils/password';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 认证控制器模块
 * 处理认证相关的 HTTP 请求和响应
 */

/**
 * 用户注册控制器
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, username } = req.body;

    // 验证必填字段
    if (!email) {
      res.status(400).json({
        success: false,
        error: '邮箱不能为空',
      });
      return;
    }

    if (!password) {
      res.status(400).json({
        success: false,
        error: '密码不能为空',
      });
      return;
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: passwordValidation.message,
      });
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: '邮箱格式不正确',
      });
      return;
    }

    // 调用注册服务
    const result = await registerUser(email, password, username);

    // 返回成功响应
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: result,
    });
  } catch (error: any) {
    console.error('注册失败:', error);

    // 处理已知错误
    if (
      error.message === '该邮箱已被注册' ||
      error.message === '该邮箱或用户名已被使用'
    ) {
      res.status(409).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // 处理其他错误
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 用户登录控制器
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: '邮箱和密码不能为空',
      });
      return;
    }

    // 调用登录服务
    const result = await loginUser(email, password);

    // 返回成功响应
    res.status(200).json({
      success: true,
      message: '登录成功',
      data: result,
    });
  } catch (error: any) {
    console.error('登录失败:', error);

    // 处理认证失败
    if (
      error.message === '邮箱或密码错误' ||
      error.message === '用户不存在'
    ) {
      res.status(401).json({
        success: false,
        error: '邮箱或密码错误',
      });
      return;
    }

    // 处理其他错误
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取当前用户信息控制器
 * GET /api/auth/me
 * 需要认证中间件（authenticateToken）
 */
export async function getCurrentUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 从认证中间件获取用户信息
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    // 从数据库获取完整的用户信息（可选）
    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
      });
      return;
    }

    // 返回用户信息（不包含密码）
    res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);

    res.status(500).json({
      success: false,
      error: '获取用户信息失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

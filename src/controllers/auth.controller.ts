import { Request, Response } from 'express';
import { register as registerUser, login as loginUser, getUserById, verifyToken, requestPasswordReset } from '../services/auth.service';
import { getProfile } from '../services/user.service';
import { validatePasswordStrength } from '../utils/password';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendInternalError,
} from '../utils/response';

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
      sendBadRequest(res, '邮箱不能为空');
      return;
    }

    if (!password) {
      sendBadRequest(res, '密码不能为空');
      return;
    }

    // 验证密码强度
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      sendBadRequest(res, passwordValidation.message);
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendBadRequest(res, '邮箱格式不正确');
      return;
    }

    // 调用注册服务
    const result = await registerUser(email, password, username);

    // 返回成功响应
    sendSuccess(res, result, '注册成功', 201);
  } catch (error: any) {
    console.error('注册失败:', error);

    // 处理已知错误
    if (
      error.message === '该邮箱已被注册' ||
      error.message === '该邮箱或用户名已被使用'
    ) {
      sendConflict(res, error.message);
      return;
    }

    // 处理其他错误
    sendInternalError(res, undefined, error);
  }
}

/**
 * 用户登录控制器
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    console.log(`[Login Controller] 收到登录请求: ${req.body.email}`);
    const { email, password } = req.body;

    // 验证必填字段
    if (!email || !password) {
      console.log(`[Login Controller] 验证失败: 邮箱或密码为空`);
      sendBadRequest(res, '邮箱和密码不能为空');
      return;
    }

    console.log(`[Login Controller] 开始调用登录服务...`);
    // 调用登录服务
    const result = await loginUser(email, password);
    console.log(`[Login Controller] 登录服务调用成功`);

    // 返回成功响应
    sendSuccess(res, result, '登录成功');
  } catch (error: any) {
    console.error('登录失败:', error);

    // 处理认证失败
    if (
      error.message === '邮箱或密码错误' ||
      error.message === '用户不存在'
    ) {
      sendUnauthorized(res, '邮箱或密码错误');
      return;
    }

    // 处理其他错误
    sendInternalError(res, undefined, error);
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
      sendUnauthorized(res);
      return;
    }

    // 从数据库获取完整的用户信息（包含 profiles 表的数据）
    // formatForFrontend = true 会自动转换为包含 user_metadata 的格式
    const profile = await getProfile(req.user.userId, true);

    if (!profile) {
      sendNotFound(res, '用户不存在');
      return;
    }

    // 🔧 修复：返回完整的用户资料，包含 user_metadata
    // 同时保留兼容字段以兼容旧代码
    sendSuccess(res, {
      ...profile,
      // 兼容字段
      userId: profile.id,
      user_id: profile.id,
      balance: profile.tianji_coins_balance || 0,
      createdAt: profile.created_at,
    });
  } catch (error: any) {
    console.error('获取用户信息失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 请求密码重置控制器
 * POST /api/auth/reset-password
 * 
 * 请求体：{ email: string }
 * 响应：{ success: boolean, message: string }
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    // 验证必填字段
    if (!email) {
      sendBadRequest(res, '邮箱不能为空');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      sendBadRequest(res, '邮箱格式不正确');
      return;
    }

    // 调用密码重置服务
    const result = await requestPasswordReset(email);

    // 返回成功响应
    sendSuccess(res, null, result.message);
  } catch (error: any) {
    console.error('密码重置请求失败:', error);

    // 处理已知错误
    if (error.message === '邮箱格式不正确') {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message === 'JWT_SECRET 未配置' || error.message === '邮件发送失败，请稍后重试') {
      sendInternalError(res, error.message, error);
      return;
    }

    // 处理其他错误
    sendInternalError(res, undefined, error);
  }
}

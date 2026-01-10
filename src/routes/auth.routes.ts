import { Router } from 'express';
import { register, login, getCurrentUser, resetPassword } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 认证路由模块
 * 定义用户注册、登录等认证相关的 API 路由
 */

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册接口
 * 
 * 请求体：
 * {
 *   "email": "user@example.com",
 *   "password": "password123",
 *   "username": "username" (可选)
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "email": "user@example.com",
 *     "username": "username"
 *   }
 * }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * 用户登录接口
 * 
 * 请求体：
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "uuid",
 *       "email": "user@example.com"
 *     },
 *     "token": "jwt_token_string"
 *   }
 * }
 */
router.post('/login', login);

/**
 * GET /api/auth/me
 * 获取当前用户信息（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "uuid",
 *     "email": "user@example.com"
 *   }
 * }
 */
router.get('/me', authenticateToken, getCurrentUser);

/**
 * POST /api/auth/reset-password
 * 请求密码重置（发送重置邮件）
 * 
 * 请求体：
 * {
 *   "email": "user@example.com"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "如果该邮箱已注册，密码重置链接已发送到您的邮箱"
 * }
 */
router.post('/reset-password', resetPassword);

export default router;

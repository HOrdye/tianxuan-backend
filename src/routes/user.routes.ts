import { Router } from 'express';
import { getProfile, updateProfile, getUserTier } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 用户资料路由模块
 * 定义用户资料相关的 API 路由
 */

const router = Router();

/**
 * GET /api/user/profile
 * 获取当前用户资料（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "email": "user@example.com",
 *     "username": "username",
 *     ...
 *   }
 * }
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * PUT /api/user/profile
 * 更新当前用户资料（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "username": "newusername",
 *   "bio": "个人简介",
 *   "location": "北京",
 *   ...
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "资料更新成功",
 *   "data": { ... }
 * }
 */
router.put('/profile', authenticateToken, updateProfile);

/**
 * GET /api/user/tier
 * 获取当前用户等级（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tier": "free" | "premium" | "vip"
 *   }
 * }
 */
router.get('/tier', authenticateToken, getUserTier);

export default router;

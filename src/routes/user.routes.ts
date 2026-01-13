import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  getUserTier,
  getUserArchives,
  getUserArchiveById,
  createUserArchive,
  updateUserArchive,
  deleteUserArchive
} from '../controllers/user.controller';
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

/**
 * GET /api/user/archives
 * 获取用户的所有档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "user_id": "uuid",
 *       "name": "档案名称",
 *       "birth_data": { ... },
 *       ...
 *     }
 *   ],
 *   "message": "获取成功"
 * }
 */
router.get('/archives', authenticateToken, getUserArchives);

/**
 * GET /api/user/archives/:archiveId
 * 获取单个档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "name": "档案名称",
 *     ...
 *   },
 *   "message": "获取成功"
 * }
 */
router.get('/archives/:archiveId', authenticateToken, getUserArchiveById);

/**
 * POST /api/user/archives
 * 创建新档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "name": "档案名称",
 *   "birth_data": { ... },
 *   "identity_tag": "标签",
 *   "energy_level": "strong",
 *   "private_note": "备注",
 *   "relationship_type": "self"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "创建成功"
 * }
 */
router.post('/archives', authenticateToken, createUserArchive);

/**
 * PUT /api/user/archives/:archiveId
 * 更新档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体（部分字段，可选）：
 * {
 *   "name": "更新后的名称",
 *   "identity_tag": "更新后的标签",
 *   "energy_level": "weak",
 *   "latest_luck": "宜动",
 *   "private_note": "更新后的备注",
 *   "element_color": "#33FF57",
 *   "is_pinned": true,
 *   "relationship_type": "lover"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": { ... },
 *   "message": "更新成功"
 * }
 */
router.put('/archives/:archiveId', authenticateToken, updateUserArchive);

/**
 * DELETE /api/user/archives/:archiveId
 * 删除档案（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "success": true
 *   },
 *   "message": "删除成功"
 * }
 */
router.delete('/archives/:archiveId', authenticateToken, deleteUserArchive);

export default router;

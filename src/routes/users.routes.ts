import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { batchGetUserTiers, checkUserExists, deleteUserAccount } from '../controllers/user.controller';

/**
 * 用户服务扩展路由模块
 * 定义用户相关的扩展 API 路由（/api/users/*）
 */

const router = Router();

/**
 * POST /api/users/batch-tiers
 * 批量查询用户等级（需要认证）
 * 
 * 请求体：
 * {
 *   "userIds": ["uuid1", "uuid2", ...]
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "uuid1": "premium",
 *     "uuid2": "explorer",
 *     ...
 *   }
 * }
 */
router.post('/batch-tiers', authenticateToken, batchGetUserTiers);

/**
 * GET /api/users/:id/exists
 * 检查用户是否存在（需要认证）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "exists": true
 *   }
 * }
 */
router.get('/:id/exists', authenticateToken, checkUserExists);

/**
 * DELETE /api/users/:id
 * 删除用户账户（需要认证）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "账户删除成功"
 * }
 */
router.delete('/:id', authenticateToken, deleteUserAccount);

export default router;

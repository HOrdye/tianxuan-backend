import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as achievementsController from '../controllers/achievements.controller';

/**
 * 成就系统路由模块
 * 定义成就相关的 API 路由
 */

const router = Router();

/**
 * GET /api/achievements/check?type=xxx
 * 检查用户是否拥有指定类型的成就（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * type - 成就类型（如：shared_unlock_profile_slot）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "exists": true,
 *     "achievementId": "uuid",
 *     "metadata": { ... }
 *   }
 * }
 */
router.get('/check', authenticateToken, achievementsController.checkAchievement);

/**
 * GET /api/achievements
 * 获取用户的所有成就（需要认证）
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
 *       "achievement_type": "shared_unlock_profile_slot",
 *       "metadata": { ... },
 *       "created_at": "2026-01-26T..."
 *     }
 *   ]
 * }
 */
router.get('/', authenticateToken, achievementsController.getUserAchievements);

export default router;

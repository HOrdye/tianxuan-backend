import { Router } from 'express';
import {
  dailyCheckIn,
  getCheckInStatus,
  getCheckInLogs,
} from '../controllers/checkin.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 签到路由模块
 * 定义签到相关的 API 路由
 */

const router = Router();

/**
 * POST /api/checkin
 * 每日签到（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "签到成功",
 *   "data": {
 *     "coins_earned": 10,
 *     "consecutive_days": 1,
 *     "check_in_date": "2025-01-08"
 *   }
 * }
 */
router.post('/', authenticateToken, dailyCheckIn);

/**
 * GET /api/checkin/status
 * 查询签到状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "last_check_in_date": "2025-01-07",
 *     "consecutive_check_in_days": 5,
 *     "can_check_in_today": true,
 *     "today_date": "2025-01-08"
 *   }
 * }
 */
router.get('/status', authenticateToken, getCheckInStatus);

/**
 * GET /api/checkin/logs
 * 查询签到记录（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - limit: 返回记录数（可选，默认30，最大100）
 * - offset: 偏移量（可选，默认0）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "logs": [
 *       {
 *         "id": "uuid",
 *         "user_id": "uuid",
 *         "check_in_date": "2025-01-08",
 *         "coins_earned": 10,
 *         "consecutive_days": 1,
 *         "tier": "free",
 *         "created_at": "2025-01-08T12:00:00Z"
 *       }
 *     ],
 *     "limit": 30,
 *     "offset": 0,
 *     "count": 1
 *   }
 * }
 */
router.get('/logs', authenticateToken, getCheckInLogs);

export default router;

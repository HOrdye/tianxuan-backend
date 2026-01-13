import { Router } from 'express';
import {
  dailyCheckIn,
  getCheckInStatus,
  getCheckInLogs,
} from '../controllers/checkin.controller';
import {
  calculateUpgradeBonus,
  grantUpgradeBonus,
} from '../controllers/checkin-upgrade.controller';
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
 * POST /api/checkin/daily
 * 每日签到（需要认证）- 前端兼容路由
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "签到成功",
 *   "data": {
 *     "success": true,
 *     "coinsEarned": 10,
 *     "consecutiveDays": 5,
 *     "message": "签到成功！获得 10 天机币，连续签到 5 天"
 *   }
 * }
 */
router.post('/daily', authenticateToken, dailyCheckIn);

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

/**
 * GET /api/checkin/history
 * 查询签到历史（需要认证）- 前端兼容路由
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - limit: 返回记录数（可选，默认50，最大100）
 * - offset: 偏移量（可选，默认0）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "查询成功",
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "user_id": "uuid",
 *       "check_in_date": "2025-01-30",
 *       "coins_earned": 10,
 *       "consecutive_days": 5,
 *       "tier": "explorer",
 *       "created_at": "2025-01-30T12:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/history', authenticateToken, getCheckInLogs);

/**
 * GET /api/checkin/upgrade-bonus/calculate
 * 计算升级补差（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - new_tier: 新会员等级（必需，free/basic/premium/vip）
 * - upgrade_date: 升级日期（可选，YYYY-MM-DD格式，默认为今天）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "eligible_dates": [
 *       {
 *         "check_in_date": "2025-01-15",
 *         "old_tier": "free",
 *         "new_tier": "basic",
 *         "base_coins": 10,
 *         "expected_coins": 15,
 *         "bonus_coins": 5
 *       }
 *     ],
 *     "total_bonus_coins": 25,
 *     "upgrade_date": "2025-01-30"
 *   }
 * }
 */
router.get('/upgrade-bonus/calculate', authenticateToken, calculateUpgradeBonus);

/**
 * POST /api/checkin/upgrade-bonus/grant
 * 发放升级补差（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "new_tier": "basic",              // 新会员等级（必需，free/basic/premium/vip）
 *   "upgrade_date": "2025-01-30"       // 升级日期（可选，YYYY-MM-DD格式，默认为今天）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "成功补差 25 天机币",
 *   "data": {
 *     "total_bonus_coins": 25,
 *     "granted_count": 5,
 *     "granted_dates": ["2025-01-15", "2025-01-16", ...]
 *   }
 * }
 */
router.post('/upgrade-bonus/grant', authenticateToken, grantUpgradeBonus);

export default router;

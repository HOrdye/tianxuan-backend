import { Router } from 'express';
import {
  deductCoins,
  getBalance,
  adminAdjustCoins,
  getCoinTransactions,
  getRegistrationBonusStatus,
} from '../controllers/coins.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';

/**
 * 天机币路由模块
 * 定义天机币相关的 API 路由
 */

const router = Router();

/**
 * POST /api/coins/deduct
 * 扣费（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "featureType": "star_chart",  // 功能类型
 *   "price": 10                    // 扣费金额（正数）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "扣费成功",
 *   "data": {
 *     "remaining_balance": 90,
 *     "transaction_id": null  // 扣费记录写入 quota_logs 表，不返回 transaction_id
 *   }
 * }
 * 
 * 注意：
 * - 扣费记录写入 quota_logs 表（配额消耗日志），而不是 transactions 表（交易流水）
 * - transactions 表用于记录交易流水（充值、订阅、管理员调整等）
 * - quota_logs 表用于记录配额消耗（扣费）日志
 */
router.post('/deduct', authenticateToken, deductCoins);

/**
 * GET /api/coins/balance
 * 查询当前用户余额（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tianji_coins_balance": 100,
 *     "daily_coins_grant": 10,
 *     "activity_coins_grant": 5,
 *     "daily_coins_grant_expires_at": "2025-02-01T00:00:00Z",
 *     "activity_coins_grant_expires_at": "2025-02-01T00:00:00Z"
 *   }
 * }
 */
router.get('/balance', authenticateToken, getBalance);

/**
 * GET /api/coins/transactions
 * 查询当前用户交易流水（需要认证）
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
 *   "data": {
 *     "transactions": [
 *       {
 *         "id": "uuid",
 *         "user_id": "uuid",
 *         "transaction_type": "deduct",
 *         "amount": 10,
 *         "coin_type": "tianji_coins_balance",
 *         "feature_type": "star_chart",
 *         "description": "扣费",
 *         "created_at": "2025-01-30T12:00:00Z"
 *       }
 *     ],
 *     "limit": 50,
 *     "offset": 0,
 *     "count": 1
 *   }
 * }
 */
router.get('/transactions', authenticateToken, getCoinTransactions);

/**
 * POST /api/coins/admin/adjust
 * 管理员调整天机币（需要认证和管理员权限）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "targetUserId": "uuid",        // 目标用户ID
 *   "adjustmentAmount": 100,        // 调整金额（正数为增加，负数为减少）
 *   "reason": "管理员调整",         // 调整原因（可选）
 *   "coinType": "tianji_coins_balance"  // 天机币类型（可选，默认tianji_coins_balance）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "调整成功",
 *   "data": {
 *     "new_balance": 200,
 *     "transaction_id": "uuid"
 *   }
 * }
 */
router.post('/admin/adjust', authenticateToken, requireAdmin, adminAdjustCoins);

/**
 * GET /api/coins/registration-bonus/status
 * 查询注册奖励状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "granted": true  // 是否已发放注册奖励
 *   }
 * }
 */
router.get('/registration-bonus/status', authenticateToken, getRegistrationBonusStatus);

export default router;

import { Router } from 'express';
import {
  getSubscriptionStatus,
  createSubscription,
  checkSubscriptionStatus,
  cancelSubscription,
  checkFeaturePermission,
  getTodayUsage,
  recordUsage,
  checkExpiredSubscription,
} from '../controllers/subscription.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 订阅/会员系统路由模块
 * 定义订阅相关的 API 路由
 */

const router = Router();

/**
 * GET /api/subscription/status
 * 获取订阅状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tier": "free" | "basic" | "premium" | "vip",
 *     "status": "active" | "expired" | "cancelled" | "pending",
 *     "expiresAt": "2025-12-31T23:59:59Z" | null,
 *     "features": { ... },
 *     "isPremium": false
 *   }
 * }
 */
router.get('/status', authenticateToken, getSubscriptionStatus);

/**
 * POST /api/subscription/create
 * 创建订阅订单（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "tier": "basic" | "premium" | "vip",
 *   "isYearly": true,
 *   "paymentMethod": "alipay" | "wechat"
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "orderId": "uuid",
 *     "payUrl": "https://..."
 *   }
 * }
 */
router.post('/create', authenticateToken, createSubscription);

/**
 * GET /api/subscription/check-status
 * 检查订阅状态（支付回调后）
 * 
 * 查询参数：
 * - orderId: 订单ID
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "tier": "basic",
 *     "status": "active"
 *   }
 * }
 */
router.get('/check-status', authenticateToken, checkSubscriptionStatus);

/**
 * POST /api/subscription/cancel
 * 取消订阅（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "订阅已取消"
 * }
 */
router.post('/cancel', authenticateToken, cancelSubscription);

/**
 * GET /api/subscription/check-feature
 * 检查功能权限（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - featurePath: 功能路径（如 'yijing.available', 'ziwei.advancedChart'）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "allowed": true,
 *     "reason": "功能可用",
 *     "upgradeTier": "premium"
 *   }
 * }
 */
router.get('/check-feature', authenticateToken, checkFeaturePermission);

/**
 * GET /api/subscription/usage/:feature
 * 获取今日使用次数（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 路径参数：
 * - feature: 功能名称（如 'yijing', 'ziwei'）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "usage": 2,
 *     "limit": 10,
 *     "remaining": 8
 *   }
 * }
 */
router.get('/usage/:feature', authenticateToken, getTodayUsage);

/**
 * POST /api/subscription/record-usage
 * 记录功能使用（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "feature": "yijing",
 *   "metadata": { ... }
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "使用记录已保存"
 * }
 */
router.post('/record-usage', authenticateToken, recordUsage);

/**
 * POST /api/subscription/check-expired
 * 检查过期订阅（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "expired": false,
 *     "newTier": "premium"
 *   }
 * }
 */
router.post('/check-expired', authenticateToken, checkExpiredSubscription);

export default router;

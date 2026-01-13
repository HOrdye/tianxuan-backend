import { Router } from 'express';
import {
  createOrder,
  handlePaymentCallback,
  handlePaymentCallbackHandle,
  getOrders,
  getOrderById,
  handleMockPaymentSuccess,
  handleMockPaymentFail,
  handleMockPaymentCancel,
  getPacks,
  getPackByType,
  checkPurchaseEligibility,
  checkFirstPurchase,
  getQuotaLogs,
  createRefundLog,
} from '../controllers/payment.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware';

/**
 * 支付路由模块
 * 定义支付相关的 API 路由
 */

const router = Router();

/**
 * POST /api/payment/orders
 * 创建支付订单（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "amount": 100,                    // 支付金额（人民币，单位：元）
 *   "coinsAmount": 1000,              // 购买的天机币数量
 *   "packType": "coins_pack_1",       // 套餐类型（可选）
 *   "paymentProvider": "alipay",      // 支付提供商（可选，如 'alipay', 'wechat'）
 *   "description": "购买天机币"        // 订单描述（可选）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "订单创建成功",
 *   "data": {
 *     "order_id": "uuid"
 *   }
 * }
 */
router.post('/orders', authenticateToken, createOrder);

/**
 * POST /api/payment/callback
 * 处理支付回调（可选认证，实际生产环境应添加支付提供商签名验证）
 * 
 * 请求体：
 * {
 *   "orderId": "uuid",                // 订单ID
 *   "status": "completed",            // 支付状态：'completed' 或 'failed'
 *   "paymentProvider": "alipay",      // 支付提供商（可选）
 *   "paidAt": "2025-01-30T12:00:00Z" // 支付时间（可选）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "支付成功，天机币已到账",
 *   "data": {
 *     "order_id": "uuid",
 *     "new_balance": 1000
 *   }
 * }
 * 
 * ⚠️ 注意：实际生产环境中应该：
 * 1. 验证支付提供商的签名，确保回调来自合法的支付提供商
 * 2. 检查订单金额是否匹配，防止金额篡改
 * 3. 实现幂等性处理，防止重复处理同一订单
 */
router.post('/callback', optionalAuthenticateToken, handlePaymentCallback);

/**
 * GET /api/payment/orders
 * 查询当前用户的订单列表（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - status: 订单状态（可选，如 'pending', 'completed', 'failed'）
 * - limit: 返回记录数（可选，默认50，最大100）
 * - offset: 偏移量（可选，默认0）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "orders": [
 *       {
 *         "id": "uuid",
 *         "user_id": "uuid",
 *         "type": "purchase",
 *         "amount": 100,
 *         "coins_amount": 1000,
 *         "pack_type": "coins_pack_1",
 *         "description": "购买天机币",
 *         "status": "completed",
 *         "paid_at": "2025-01-30T12:00:00Z",
 *         "payment_provider": "alipay",
 *         "is_first_purchase": true,
 *         "created_at": "2025-01-30T12:00:00Z"
 *       }
 *     ],
 *     "limit": 50,
 *     "offset": 0,
 *     "count": 1
 *   }
 * }
 */
router.get('/orders', authenticateToken, getOrders);

/**
 * GET /api/payment/orders/:orderId
 * 查询单个订单详情（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * URL 参数：
 * - orderId: 订单ID
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "type": "purchase",
 *     "amount": 100,
 *     "coins_amount": 1000,
 *     "pack_type": "coins_pack_1",
 *     "description": "购买天机币",
 *     "status": "completed",
 *     "paid_at": "2025-01-30T12:00:00Z",
 *     "payment_provider": "alipay",
 *     "is_first_purchase": true,
 *     "created_at": "2025-01-30T12:00:00Z"
 *   }
 * }
 */
router.get('/orders/:orderId', authenticateToken, getOrderById);

/**
 * POST /api/payment/mock/success
 * [开发专用] 模拟支付成功回调
 * 直接强制将订单设为成功并发放天机币
 * 
 * ⚠️ 注意：此接口仅在开发环境可用，生产环境会被拒绝
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "orderId": "uuid"  // 订单ID
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "Mock 支付成功，天机币已发放",
 *   "data": {
 *     "order_id": "uuid",
 *     "new_balance": 1000,
 *     "provider_transaction_id": "MOCK_1234567890_abc123"
 *   }
 * }
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/mock/success', authenticateToken, handleMockPaymentSuccess);
  router.post('/mock/fail', authenticateToken, handleMockPaymentFail);
  router.post('/mock/cancel', authenticateToken, handleMockPaymentCancel);
}

/**
 * GET /api/payment/packs
 * 获取可用充值包列表（需要认证）
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
 *       "pack_type": "newcomer",
 *       "name": "首充·问路",
 *       "subtitle": "首充特惠",
 *       "price": 9.90,
 *       "coins": 100,
 *       "unit_price": 0.099,
 *       "description": "首充特惠包，限购1次",
 *       "is_limited": true,
 *       "limit_count": 1,
 *       "is_active": true,
 *       "sort_order": 1
 *     }
 *   ],
 *   "message": "获取成功"
 * }
 */
router.get('/packs', authenticateToken, getPacks);

/**
 * GET /api/payment/packs/:packType
 * 获取指定类型的充值包（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * URL 参数：
 * - packType: 充值包类型（newcomer | enlightenment | omniscience）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "pack_type": "newcomer",
 *     "name": "首充·问路",
 *     ...
 *   },
 *   "message": "获取成功"
 * }
 */
router.get('/packs/:packType', authenticateToken, getPackByType);

/**
 * GET /api/payment/packs/:packType/eligibility
 * 检查购买资格（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * URL 参数：
 * - packType: 充值包类型（newcomer | enlightenment | omniscience）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "eligible": true,
 *     "reason": null,
 *     "purchaseCount": 0,
 *     "limitCount": 1
 *   },
 *   "message": "检查成功"
 * }
 */
router.get('/packs/:packType/eligibility', authenticateToken, checkPurchaseEligibility);

/**
 * POST /api/payment/callback/handle
 * 处理支付回调（新版本，路径为 /callback/handle）
 * 
 * 请求体：
 * {
 *   "orderId": "uuid",                // 订单ID
 *   "status": "completed",            // 支付状态：'completed' 或 'failed'
 *   "paymentProvider": "alipay",      // 支付提供商（可选）
 *   "paidAt": "2025-01-30T12:00:00Z" // 支付时间（可选）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "支付成功，天机币已到账",
 *   "data": {
 *     "orderId": "uuid",
 *     "newBalance": 1000
 *   }
 * }
 * 
 * ⚠️ 注意：实际生产环境中应该：
 * 1. 验证支付提供商的签名，确保回调来自合法的支付提供商
 * 2. 检查订单金额是否匹配，防止金额篡改
 * 3. 实现幂等性处理，防止重复处理同一订单
 */
router.post('/callback/handle', optionalAuthenticateToken, handlePaymentCallbackHandle);

/**
 * GET /api/payment/first-purchase
 * 检查首充状态（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "isFirstPurchase": true,           // 是否为首充用户（true表示还未完成首充）
 *     "firstPurchaseOrderId": null,       // 首次充值订单ID（如果已完成首充）
 *     "firstPurchaseDate": null          // 首次充值时间（如果已完成首充）
 *   },
 *   "message": "查询成功"
 * }
 */
router.get('/first-purchase', authenticateToken, checkFirstPurchase);

/**
 * GET /api/payment/quota-logs
 * 查询配额日志（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - feature: 功能名称（可选，如 'yijing', 'ziwei'）
 * - actionType: 操作类型（可选，如 'consume', 'grant', 'refund'）
 * - limit: 返回记录数（可选，默认50，最大100）
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
 *         "feature": "yijing",
 *         "action_type": "consume",
 *         "amount": 10,
 *         "balance_before": 100,
 *         "balance_after": 90,
 *         "description": "使用易筋经功能",
 *         "metadata": null,
 *         "created_at": "2025-01-30T12:00:00Z"
 *       }
 *     ],
 *     "pagination": {
 *       "limit": 50,
 *       "offset": 0,
 *       "count": 1
 *     }
 *   },
 *   "message": "查询成功"
 * }
 */
router.get('/quota-logs', authenticateToken, getQuotaLogs);

/**
 * POST /api/payment/refund-logs
 * 创建退款日志（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "orderId": "uuid",              // 订单ID
 *   "refundAmount": 100,            // 退款金额（人民币，单位：元）
 *   "refundCoins": 1000,            // 退款天机币数量
 *   "refundReason": "用户申请退款"  // 退款原因（可选）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "order_id": "uuid",
 *     "refund_amount": 100,
 *     "refund_coins": 1000,
 *     "refund_reason": "用户申请退款",
 *     "status": "pending",
 *     "processed_at": null,
 *     "created_at": "2025-01-30T12:00:00Z"
 *   },
 *   "message": "退款日志创建成功"
 * }
 */
router.post('/refund-logs', authenticateToken, createRefundLog);

export default router;

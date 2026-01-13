import { Router } from 'express';
import {
  getTimespaceCache,
  saveTimespaceCache,
  clearTimespaceCache,
} from '../controllers/timespace.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 时空导航缓存路由模块
 * 定义缓存相关的 API 路由
 */

const router = Router();

/**
 * GET /api/timespace/cache
 * 获取缓存（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - dimension: 维度（可选）
 * - cache_key: 缓存键（可选）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "profile_id": "uuid",
 *     "dimension": "dimension_name",
 *     "cache_key": "cache_key_1",
 *     "cache_data": { ... },
 *     "period_start": "2025-01-01",
 *     "period_end": "2025-01-31",
 *     "expires_at": "2025-02-01T00:00:00Z",
 *     "created_at": "2025-01-30T12:00:00Z",
 *     "updated_at": "2025-01-30T12:00:00Z"
 *   }
 * }
 */
router.get('/cache', authenticateToken, getTimespaceCache);

/**
 * POST /api/timespace/cache
 * 保存缓存（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "dimension": "dimension_name",      // 维度（必需）
 *   "cache_key": "cache_key_1",        // 缓存键（必需）
 *   "cache_data": { ... },              // 缓存数据（必需）
 *   "period_start": "2025-01-01",       // 时间段开始日期（必需，YYYY-MM-DD）
 *   "period_end": "2025-01-31",         // 时间段结束日期（必需，YYYY-MM-DD）
 *   "expires_at": "2025-02-01T00:00:00Z" // 过期时间（必需）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "缓存保存成功",
 *   "data": {
 *     "cache_id": "uuid"
 *   }
 * }
 */
router.post('/cache', authenticateToken, saveTimespaceCache);

/**
 * DELETE /api/timespace/cache
 * 清除缓存（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - dimension: 维度（可选，如果提供则只清除该维度的缓存）
 * - cache_key: 缓存键（可选，如果提供则只清除该键的缓存）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "成功清除 5 条缓存记录",
 *   "data": {
 *     "deleted_count": 5
 *   }
 * }
 */
router.delete('/cache', authenticateToken, clearTimespaceCache);

export default router;

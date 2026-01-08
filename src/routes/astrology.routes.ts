import { Router } from 'express';
import {
  saveStarChart,
  getStarChart,
  updateBriefAnalysisCache,
  unlockTimeAsset,
  getUnlockedTimeAssets,
  isTimeAssetUnlocked,
  saveTimespaceCache,
  getTimespaceCache,
} from '../controllers/astrology.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * 紫微斗数路由模块
 * 定义命盘存档、时空资产解锁、缓存查询相关的 API 路由
 */

const router = Router();

/**
 * POST /api/astrology/star-chart
 * 保存或更新命盘结构（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "chart_structure": { ... },  // 命盘结构数据
 *   "brief_analysis_cache": { ... }  // 可选，简要分析缓存
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "命盘保存成功",
 *   "data": {
 *     "profile_id": "uuid"
 *   }
 * }
 */
router.post('/star-chart', authenticateToken, saveStarChart);

/**
 * GET /api/astrology/star-chart
 * 查询命盘结构（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "profile_id": "uuid",
 *     "chart_structure": { ... },
 *     "brief_analysis_cache": { ... },
 *     "created_at": "2025-01-08T12:00:00Z",
 *     "updated_at": "2025-01-08T12:00:00Z"
 *   }
 * }
 */
router.get('/star-chart', authenticateToken, getStarChart);

/**
 * PUT /api/astrology/star-chart/brief-analysis
 * 更新简要分析缓存（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "brief_analysis_cache": { ... }  // 简要分析缓存数据
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "简要分析缓存更新成功",
 *   "data": {
 *     "profile_id": "uuid"
 *   }
 * }
 */
router.put('/star-chart/brief-analysis', authenticateToken, updateBriefAnalysisCache);

/**
 * POST /api/astrology/time-assets/unlock
 * 解锁时空资产（需要认证，需要扣费）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "dimension": "year",  // 维度
 *   "period_start": "2025-01-01",  // 时间段开始日期
 *   "period_end": "2025-12-31",  // 时间段结束日期
 *   "period_type": "year",  // 时间段类型
 *   "expires_at": "2026-01-01T00:00:00Z",  // 过期时间
 *   "cost_coins": 10  // 可选，消耗的天机币数量（默认10）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "时空资产解锁成功",
 *   "data": {
 *     "asset_id": "uuid",
 *     "remaining_balance": 100
 *   }
 * }
 */
router.post('/time-assets/unlock', authenticateToken, unlockTimeAsset);

/**
 * GET /api/astrology/time-assets
 * 查询已解锁的时空资产（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - dimension: 维度（可选）
 * - limit: 返回记录数（可选，默认50，最大100）
 * - offset: 偏移量（可选，默认0）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "assets": [
 *       {
 *         "id": "uuid",
 *         "user_id": "uuid",
 *         "profile_id": "uuid",
 *         "dimension": "year",
 *         "period_start": "2025-01-01",
 *         "period_end": "2025-12-31",
 *         "period_type": "year",
 *         "unlocked_at": "2025-01-08T12:00:00Z",
 *         "expires_at": "2026-01-01T00:00:00Z",
 *         "cost_coins": 10,
 *         "is_active": true,
 *         "created_at": "2025-01-08T12:00:00Z",
 *         "updated_at": "2025-01-08T12:00:00Z"
 *       }
 *     ],
 *     "limit": 50,
 *     "offset": 0,
 *     "count": 1
 *   }
 * }
 */
router.get('/time-assets', authenticateToken, getUnlockedTimeAssets);

/**
 * GET /api/astrology/time-assets/check
 * 检查某个时间段是否已解锁（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - dimension: 维度（必需）
 * - period_start: 时间段开始日期（必需，YYYY-MM-DD）
 * - period_end: 时间段结束日期（必需，YYYY-MM-DD）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "is_unlocked": true
 *   }
 * }
 */
router.get('/time-assets/check', authenticateToken, isTimeAssetUnlocked);

/**
 * POST /api/astrology/cache
 * 保存或更新缓存数据（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "dimension": "year",  // 维度
 *   "cache_key": "cache_key_1",  // 缓存键
 *   "cache_data": { ... },  // 缓存数据
 *   "period_start": "2025-01-01",  // 时间段开始日期
 *   "period_end": "2025-12-31",  // 时间段结束日期
 *   "expires_at": "2026-01-01T00:00:00Z"  // 过期时间
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
 * GET /api/astrology/cache
 * 查询缓存数据（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - dimension: 维度（必需）
 * - cache_key: 缓存键（必需）
 * - period_start: 时间段开始日期（可选，YYYY-MM-DD）
 * - period_end: 时间段结束日期（可选，YYYY-MM-DD）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "user_id": "uuid",
 *     "profile_id": "uuid",
 *     "dimension": "year",
 *     "cache_key": "cache_key_1",
 *     "cache_data": { ... },
 *     "period_start": "2025-01-01",
 *     "period_end": "2025-12-31",
 *     "expires_at": "2026-01-01T00:00:00Z",
 *     "created_at": "2025-01-08T12:00:00Z",
 *     "updated_at": "2025-01-08T12:00:00Z"
 *   }
 * }
 */
router.get('/cache', authenticateToken, getTimespaceCache);

export default router;

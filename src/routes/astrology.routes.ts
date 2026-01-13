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
  getChartArchives,
  getChartArchive,
  saveChartArchive,
  updateChartArchive,
  deleteChartArchive,
  clearChartData,
  saveAnalysisSession,
  getAnalysisSessions,
  deleteAnalysisSessionsByProfile,
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

/**
 * GET /api/astrology/archives
 * 查询命盘存档列表（需要认证，返回摘要，不包含完整命盘数据）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - relationshipType?: RelationshipType - 关系类型筛选
 * - keyword?: string - 搜索关键词（匹配名称、备注、标签）
 * - limit?: number - 分页大小（默认50，最大100）
 * - offset?: number - 分页偏移（默认0）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "archives": [
 *       {
 *         "id": "uuid",
 *         "userId": "uuid",
 *         "name": "存档名称",
 *         "relationshipType": "self",
 *         "customLabel": "自定义标签",
 *         "birthInfo": { ... },  // ⚠️ 只包含出生信息，不包含完整命盘
 *         "notes": "备注",
 *         "tags": ["标签1", "标签2"],
 *         "createdAt": "2025-01-08T12:00:00Z",
 *         "updatedAt": "2025-01-08T12:00:00Z"
 *       }
 *     ]
 *   }
 * }
 */
router.get('/archives', authenticateToken, getChartArchives);

/**
 * GET /api/astrology/archives/:archiveId
 * 查询单个命盘存档（需要认证，返回完整数据）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "userId": "uuid",
 *     "chart": { ... },  // 完整命盘数据
 *     "name": "存档名称",
 *     "relationshipType": "self",
 *     "customLabel": "自定义标签",
 *     "notes": "备注",
 *     "tags": ["标签1", "标签2"],
 *     "createdAt": "2025-01-08T12:00:00Z",
 *     "updatedAt": "2025-01-08T12:00:00Z"
 *   }
 * }
 */
router.get('/archives/:archiveId', authenticateToken, getChartArchive);

/**
 * POST /api/astrology/archives
 * 创建命盘存档（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "chart": ZiweiChart,              // 完整命盘数据（必填）
 *   "name": "存档名称",                // 必填
 *   "relationshipType": RelationshipType,  // 关系类型（必填）
 *   "customLabel"?: "自定义标签",       // 可选
 *   "notes"?: "备注",                  // 可选
 *   "tags"?: ["标签1", "标签2"]        // 可选
 * }
 * 
 * ⚠️ 重要：
 * - 如果 relationshipType === 'self'，每个用户只能有一个，创建时会自动更新现有记录
 * - 命盘数据必须包含 birthInfo（出生信息）
 * - birthInfo.hour 是时辰索引（0-11），不是24小时制！
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "命盘存档保存成功" 或 "我的命盘更新成功",
 *   "data": {
 *     "archiveId": "uuid"
 *   }
 * }
 */
router.post('/archives', authenticateToken, saveChartArchive);

/**
 * PUT /api/astrology/archives/:archiveId
 * 更新命盘存档（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体（部分字段，可选）：
 * {
 *   "name"?: string,
 *   "relationshipType"?: RelationshipType,
 *   "customLabel"?: string,
 *   "notes"?: string,
 *   "tags"?: string[],
 *   "chart"?: ZiweiChart  // 可选：更新命盘数据
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "命盘存档更新成功",
 *   "data": ChartArchive  // 更新后的完整存档数据
 * }
 */
router.put('/archives/:archiveId', authenticateToken, updateChartArchive);

/**
 * DELETE /api/astrology/archives/:archiveId
 * 删除命盘存档（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * ⚠️ 重要：如果删除的是"我的命盘"（relationshipType === 'self'），会同时清理：
 * - star_charts 表中的记录
 * - ziwei_chart_archives 表中的记录（relationship_type = 'self'）
 * - unlocked_time_assets 表中的记录
 * - timespace_cache 表中的记录
 * - analysis_sessions 表中的相关分析会话（如果存在）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "命盘存档删除成功" 或 "我的命盘及相关数据已删除"
 * }
 */
router.delete('/archives/:archiveId', authenticateToken, deleteChartArchive);

/**
 * DELETE /api/astrology/clear-chart
 * 清除命盘数据（需要认证，清除多个数据源）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "命盘数据清除成功",
 *   "data": {
 *     "cleared": [
 *       "star_charts (1 条记录)",
 *       "chart_archives (2 条记录)",
 *       "unlocked_time_assets (3 条记录)",
 *       "timespace_cache (4 条记录)"
 *     ]
 *   }
 * }
 */
router.delete('/clear-chart', authenticateToken, clearChartData);

/**
 * POST /api/astrology/analysis-sessions
 * 保存分析会话（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "profileId": "uuid",        // 命盘ID（必填）
 *   "sessionData": { ... }      // 分析会话数据（必填，JSONB格式）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "分析会话保存成功",
 *   "data": {
 *     "sessionId": "uuid"
 *   }
 * }
 */
router.post('/analysis-sessions', authenticateToken, saveAnalysisSession);

/**
 * GET /api/astrology/analysis-sessions
 * 查询分析会话列表（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 查询参数：
 * - profileId?: string - 命盘ID（可选，如果提供则只查询该命盘的会话）
 * 
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "sessions": [
 *       {
 *         "id": "uuid",
 *         "userId": "uuid",
 *         "profileId": "uuid",
 *         "sessionData": { ... },
 *         "createdAt": "2025-01-08T12:00:00Z",
 *         "updatedAt": "2025-01-08T12:00:00Z"
 *       }
 *     ]
 *   }
 * }
 */
router.get('/analysis-sessions', authenticateToken, getAnalysisSessions);

/**
 * DELETE /api/astrology/analysis-sessions/by-profile/:profileId
 * 删除命盘的所有分析会话（需要认证）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "成功删除 N 个分析会话",
 *   "data": {
 *     "deletedCount": 5
 *   }
 * }
 */
router.delete('/analysis-sessions/by-profile/:profileId', authenticateToken, deleteAnalysisSessionsByProfile);

export default router;

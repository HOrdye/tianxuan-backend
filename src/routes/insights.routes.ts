import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as insightsController from '../controllers/insights.controller';

/**
 * 收藏洞察路由模块
 * 定义收藏洞察相关的 API 路由
 */

const router = Router();

/**
 * POST /api/insights/saved
 * 保存收藏（需要认证）
 */
router.post('/saved', authenticateToken, insightsController.saveInsight);

/**
 * GET /api/insights/saved/stats
 * 统计收藏数量（需要认证）
 * 注意：必须在 /saved/:id 之前注册，否则会被误匹配
 */
router.get('/saved/stats', authenticateToken, insightsController.getSavedInsightsStats);

/**
 * GET /api/insights/saved/check
 * 检查是否已收藏（需要认证）
 * 注意：必须在 /saved/:id 之前注册，否则会被误匹配
 * 
 * 查询参数（至少需要一个）：
 * - type: 收藏类型
 * - sessionId: 会话ID
 * - chartId: 命盘ID
 * 
 * 示例：
 * GET /api/insights/saved/check?type=xxx
 * GET /api/insights/saved/check?sessionId=xxx
 * GET /api/insights/saved/check?chartId=xxx
 * GET /api/insights/saved/check?sessionId=xxx&chartId=xxx
 */
router.get('/saved/check', authenticateToken, insightsController.checkIfSaved);

/**
 * DELETE /api/insights/saved/batch
 * 批量删除收藏（需要认证）
 * 注意：必须在 /saved/:id 之前注册，否则会被误匹配
 */
router.delete('/saved/batch', authenticateToken, insightsController.batchDeleteInsights);

/**
 * GET /api/insights/saved
 * 获取收藏列表（需要认证）
 */
router.get('/saved', authenticateToken, insightsController.getSavedInsights);

/**
 * DELETE /api/insights/saved/:id
 * 删除收藏（需要认证）
 * 注意：必须在所有 /saved/xxx 路由之后注册，否则会误匹配
 */
router.delete('/saved/:id', authenticateToken, insightsController.deleteInsight);

export default router;

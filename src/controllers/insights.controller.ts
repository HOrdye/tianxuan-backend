import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as insightsService from '../services/insights.service';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

/**
 * 收藏洞察控制器模块
 * 处理收藏洞察相关的 HTTP 请求和响应
 */

/**
 * 保存收藏
 * POST /api/insights/saved
 */
export async function saveInsight(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { type, content, chartId, sessionId, metadata } = req.body;

    if (!type || !content) {
      sendBadRequest(res, '类型和内容不能为空');
      return;
    }

    const savedInsight = await insightsService.saveInsight({
      userId,
      insightType: type,
      content,
      chartId,
      sessionId,
      metadata,
    });

    sendSuccess(res, savedInsight, '收藏成功');
  } catch (error: any) {
    console.error('保存收藏失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取收藏列表
 * GET /api/insights/saved
 */
export async function getSavedInsights(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { type, search, limit, offset } = req.query;

    const insights = await insightsService.getSavedInsights({
      userId,
      type: type as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    sendSuccess(res, insights);
  } catch (error: any) {
    console.error('获取收藏列表失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 删除收藏
 * DELETE /api/insights/saved/:id
 */
export async function deleteInsight(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const insightId = req.params.id;

    if (!insightId) {
      sendBadRequest(res, '收藏ID不能为空');
      return;
    }

    await insightsService.deleteInsight(userId, insightId);

    sendSuccess(res, { success: true }, '删除成功');
  } catch (error: any) {
    console.error('删除收藏失败:', error);

    if (error.message === '收藏不存在或无权访问') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 批量删除收藏
 * DELETE /api/insights/saved/batch
 */
export async function batchDeleteInsights(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { insightIds } = req.body;

    if (!Array.isArray(insightIds) || insightIds.length === 0) {
      sendBadRequest(res, '收藏ID列表不能为空');
      return;
    }

    const deletedCount = await insightsService.batchDeleteInsights(userId, insightIds);

    sendSuccess(res, { deletedCount }, '批量删除成功');
  } catch (error: any) {
    console.error('批量删除收藏失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 统计收藏数量
 * GET /api/insights/saved/stats
 */
export async function getSavedInsightsStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    const totalCount = await insightsService.getSavedInsightsCount(userId);

    sendSuccess(res, { totalCount });
  } catch (error: any) {
    console.error('统计收藏数量失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 检查是否已收藏
 * GET /api/insights/saved/check
 * 
 * 支持的查询参数：
 * - type: 收藏类型
 * - sessionId: 会话ID
 * - chartId: 命盘ID
 * 
 * 至少需要提供一个参数（type、sessionId 或 chartId）
 */
export async function checkIfSaved(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { type, sessionId, chartId } = req.query;

    // 至少需要一个查询参数
    if (!type && !sessionId && !chartId) {
      sendBadRequest(res, '至少需要提供一个查询参数：type、sessionId 或 chartId');
      return;
    }

    const result = await insightsService.checkIfSaved(userId, {
      type: type as string | undefined,
      sessionId: sessionId as string | undefined,
      chartId: chartId as string | undefined,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('检查是否已收藏失败:', error);
    sendInternalError(res, undefined, error);
  }
}

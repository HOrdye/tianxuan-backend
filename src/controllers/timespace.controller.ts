import { Response } from 'express';
import * as timespaceService from '../services/timespace.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { catchAsync } from '../utils/catchAsync';

/**
 * 时空导航缓存控制器模块
 * 处理缓存相关的 HTTP 请求和响应
 */

/**
 * 获取缓存控制器
 * GET /api/timespace/cache
 */
export const getTimespaceCache = catchAsync(async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // 检查认证
  if (!req.user) {
    sendError(res, 401, '未认证');
    return;
  }

  const userId = req.user.userId;
  const { dimension, cache_key } = req.query;

  // 查询缓存
  const cache = await timespaceService.getTimespaceCache(
    userId,
    dimension as string | undefined,
    cache_key as string | undefined
  );

  if (cache === null) {
    sendError(res, 404, '缓存不存在或已过期');
    return;
  }

  // 返回缓存数据
  sendSuccess(res, cache);
});

/**
 * 保存缓存控制器
 * POST /api/timespace/cache
 */
export const saveTimespaceCache = catchAsync(async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // 检查认证
  if (!req.user) {
    sendError(res, 401, '未认证');
    return;
  }

  const userId = req.user.userId;
  const {
    dimension,
    cache_key,
    cache_data,
    period_start,
    period_end,
    expires_at,
  } = req.body;

  // 参数验证
  if (!dimension || !cache_key || !cache_data || !period_start || !period_end || !expires_at) {
    sendError(res, 400, '参数错误', '维度、缓存键、缓存数据、时间段和过期时间必须提供');
    return;
  }

  // 执行保存
  const result = await timespaceService.saveTimespaceCache(
    userId,
    userId, // profile_id 使用 userId
    dimension,
    cache_key,
    cache_data,
    period_start,
    period_end,
    new Date(expires_at)
  );

  // 返回成功结果
  sendSuccess(res, {
    cache_id: result.cache_id,
  }, result.message || '缓存保存成功');
});

/**
 * 清除缓存控制器
 * DELETE /api/timespace/cache
 */
export const clearTimespaceCache = catchAsync(async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // 检查认证
  if (!req.user) {
    sendError(res, 401, '未认证');
    return;
  }

  const userId = req.user.userId;
  const { dimension, cache_key } = req.query;

  // 执行清除
  const deletedCount = await timespaceService.clearTimespaceCache(
    userId,
    dimension as string | undefined,
    cache_key as string | undefined
  );

  // 返回成功结果
  sendSuccess(res, {
    deleted_count: deletedCount,
  }, `成功清除 ${deletedCount} 条缓存记录`);
});

/**
 * 获取 AI 指导
 * POST /api/timespace/ai-guidance
 */
export const getAIGuidance = catchAsync(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
        sendError(res, 401, '未认证');
        return;
    }

    const { dimension, date, context } = req.body;
    const profile_id = req.body.profile_id || req.body.profileId;

    if (!dimension || !date || !profile_id || !context) {
        sendError(res, 400, '参数错误', '维度、日期、资料ID和上下文为必填项');
        return;
    }

    // 校验 dimension 值
    const validDimensions = ['yearly', 'monthly', 'daily'];
    if (!validDimensions.includes(dimension)) {
        sendError(res, 400, '参数错误', 'dimension 必须为 yearly / monthly / daily');
        return;
    }

    const guidance = await timespaceService.getAIGuidance(dimension, context);

    // 平铺返回：data 下直接放各字段，不再嵌套 sections/structured
    sendSuccess(res, {
        ...guidance.data,
        dimension: guidance.dimension,
        generated_at: guidance.generated_at,
        tokens_used: guidance.tokens_used,
    });
});

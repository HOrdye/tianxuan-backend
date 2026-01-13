import { Response } from 'express';
import * as timespaceService from '../services/timespace.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 时空导航缓存控制器模块
 * 处理缓存相关的 HTTP 请求和响应
 */

/**
 * 获取缓存控制器
 * GET /api/timespace/cache
 */
export async function getTimespaceCache(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
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
      res.status(404).json({
        success: false,
        error: '缓存不存在或已过期',
      });
      return;
    }

    // 返回缓存数据
    res.status(200).json({
      success: true,
      data: cache,
    });
  } catch (error: any) {
    console.error('查询缓存失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '查询缓存失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 保存缓存控制器
 * POST /api/timespace/cache
 */
export async function saveTimespaceCache(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
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
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '维度、缓存键、缓存数据、时间段和过期时间必须提供',
      });
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
    res.status(200).json({
      success: true,
      message: result.message || '缓存保存成功',
      data: {
        cache_id: result.cache_id,
      },
    });
  } catch (error: any) {
    console.error('保存缓存失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '保存缓存失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 清除缓存控制器
 * DELETE /api/timespace/cache
 */
export async function clearTimespaceCache(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
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
    res.status(200).json({
      success: true,
      message: `成功清除 ${deletedCount} 条缓存记录`,
      data: {
        deleted_count: deletedCount,
      },
    });
  } catch (error: any) {
    console.error('清除缓存失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '清除缓存失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

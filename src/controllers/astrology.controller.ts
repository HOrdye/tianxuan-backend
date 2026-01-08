import { Response } from 'express';
import * as astrologyService from '../services/astrology.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 紫微斗数控制器模块
 * 处理命盘存档、时空资产解锁、缓存查询相关的 HTTP 请求和响应
 */

/**
 * 保存或更新命盘结构控制器
 * POST /api/astrology/star-chart
 */
export async function saveStarChart(
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
    const { chart_structure, brief_analysis_cache } = req.body;

    // 参数验证
    if (!chart_structure) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '命盘结构数据必须提供',
      });
      return;
    }

    // 执行保存
    const result = await astrologyService.saveStarChart(
      userId,
      chart_structure,
      brief_analysis_cache
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '命盘保存成功',
      data: {
        profile_id: result.profile_id,
      },
    });
  } catch (error: any) {
    console.error('保存命盘失败:', error);

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
      error: '保存命盘失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询命盘结构控制器
 * GET /api/astrology/star-chart
 */
export async function getStarChart(
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

    // 查询命盘
    const chart = await astrologyService.getStarChart(userId);

    if (chart === null) {
      res.status(404).json({
        success: false,
        error: '命盘不存在',
      });
      return;
    }

    // 返回命盘数据
    res.status(200).json({
      success: true,
      data: chart,
    });
  } catch (error: any) {
    console.error('查询命盘失败:', error);

    res.status(500).json({
      success: false,
      error: '查询命盘失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 更新简要分析缓存控制器
 * PUT /api/astrology/star-chart/brief-analysis
 */
export async function updateBriefAnalysisCache(
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
    const { brief_analysis_cache } = req.body;

    // 参数验证
    if (!brief_analysis_cache) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '简要分析缓存数据必须提供',
      });
      return;
    }

    // 执行更新
    const result = await astrologyService.updateBriefAnalysisCache(
      userId,
      brief_analysis_cache
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '简要分析缓存更新成功',
      data: {
        profile_id: result.profile_id,
      },
    });
  } catch (error: any) {
    console.error('更新简要分析缓存失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('命盘不存在')) {
      res.status(404).json({
        success: false,
        error: '命盘不存在',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '更新简要分析缓存失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 解锁时空资产控制器
 * POST /api/astrology/time-assets/unlock
 */
export async function unlockTimeAsset(
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
      period_start,
      period_end,
      period_type,
      expires_at,
      cost_coins,
    } = req.body;

    // 参数验证
    if (!dimension || !period_start || !period_end || !period_type || !expires_at) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '维度、时间段、类型和过期时间必须提供',
      });
      return;
    }

    // 验证 dimension 和 period_type
    const validDimensions = ['daily', 'monthly', 'yearly'];
    const validPeriodTypes = ['day', 'month', 'year'];
    
    if (!validDimensions.includes(dimension)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: `dimension 必须是以下值之一: ${validDimensions.join(', ')}`,
      });
      return;
    }

    if (!validPeriodTypes.includes(period_type)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: `period_type 必须是以下值之一: ${validPeriodTypes.join(', ')}`,
      });
      return;
    }

    // 执行解锁（profile_id 使用 userId，因为 profiles.id = auth.users.id）
    const result = await astrologyService.unlockTimeAsset(
      userId,
      userId, // profile_id 使用 userId
      dimension as 'daily' | 'monthly' | 'yearly',
      period_start,
      period_end,
      period_type as 'day' | 'month' | 'year',
      new Date(expires_at),
      cost_coins || 10
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '时空资产解锁成功',
      data: {
        asset_id: result.asset_id,
        remaining_balance: result.remaining_balance,
      },
    });
  } catch (error: any) {
    console.error('解锁时空资产失败:', error);

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

    if (error.message?.includes('已解锁')) {
      res.status(400).json({
        success: false,
        error: '已解锁',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('余额不足')) {
      res.status(400).json({
        success: false,
        error: '余额不足',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '解锁时空资产失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询已解锁的时空资产控制器
 * GET /api/astrology/time-assets
 */
export async function getUnlockedTimeAssets(
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
    const { dimension, limit, offset } = req.query;

    // 获取查询参数
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    // 参数验证
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'limit 必须在 1-100 之间',
      });
      return;
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'offset 不能为负数',
      });
      return;
    }

    // 查询已解锁的时空资产
    const assets = await astrologyService.getUnlockedTimeAssets(
      userId,
      undefined, // profileId 可选
      dimension as string | undefined,
      limitNum,
      offsetNum
    );

    // 返回结果
    res.status(200).json({
      success: true,
      data: {
        assets,
        limit: limitNum,
        offset: offsetNum,
        count: assets.length,
      },
    });
  } catch (error: any) {
    console.error('查询已解锁时空资产失败:', error);

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
      error: '查询已解锁时空资产失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 检查某个时间段是否已解锁控制器
 * GET /api/astrology/time-assets/check
 */
export async function isTimeAssetUnlocked(
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
    const { dimension, period_start, period_end } = req.query;

    // 参数验证
    if (!dimension || !period_start || !period_end) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '维度、时间段开始日期和结束日期必须提供',
      });
      return;
    }

    // 检查是否已解锁
    const isUnlocked = await astrologyService.isTimeAssetUnlocked(
      userId,
      userId, // profile_id 使用 userId
      dimension as string,
      period_start as string,
      period_end as string
    );

    // 返回结果
    res.status(200).json({
      success: true,
      data: {
        is_unlocked: isUnlocked,
      },
    });
  } catch (error: any) {
    console.error('检查时空资产解锁状态失败:', error);

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
      error: '检查时空资产解锁状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 保存或更新缓存数据控制器
 * POST /api/astrology/cache
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
    const result = await astrologyService.saveTimespaceCache(
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
 * 查询缓存数据控制器
 * GET /api/astrology/cache
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
    const { dimension, cache_key, period_start, period_end } = req.query;

    // 参数验证
    if (!dimension || !cache_key) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '维度和缓存键必须提供',
      });
      return;
    }

    // 查询缓存
    const cache = await astrologyService.getTimespaceCache(
      userId,
      userId, // profile_id 使用 userId
      dimension as string,
      cache_key as string,
      period_start as string | undefined,
      period_end as string | undefined
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

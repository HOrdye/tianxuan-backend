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

/**
 * 查询命盘存档列表控制器（返回摘要，不包含完整命盘数据）
 * GET /api/astrology/archives
 * 
 * 查询参数：
 * - relationshipType?: RelationshipType - 关系类型筛选
 * - keyword?: string - 搜索关键词（匹配名称、备注、标签）
 * - limit?: number - 分页大小（默认50，最大100）
 * - offset?: number - 分页偏移（默认0）
 */
export async function getChartArchives(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { relationshipType, keyword, limit, offset } = req.query;

    // 参数验证和转换
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'limit 必须是 1-100 之间的数字',
      });
      return;
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: 'offset 必须 >= 0',
      });
      return;
    }

    // 验证 relationshipType（如果提供）
    if (relationshipType) {
      const validTypes = [
        'self', 'lover', 'child', 'parent', 'bestie',
        'sibling', 'friend', 'colleague', 'celebrity', 'custom'
      ];
      if (!validTypes.includes(relationshipType as string)) {
        res.status(400).json({
          success: false,
          error: '参数错误',
          message: `relationshipType 必须是以下之一: ${validTypes.join(', ')}`,
        });
        return;
      }
    }

    const archives = await astrologyService.getChartArchives(
      userId,
      relationshipType as any,
      keyword as string,
      parsedLimit,
      parsedOffset
    );

    res.status(200).json({
      success: true,
      data: {
        archives,
      },
    });
  } catch (error: any) {
    console.error('查询命盘存档失败:', error);

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
      error: '查询命盘存档失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 保存命盘存档控制器
 * POST /api/astrology/archives
 * 
 * 请求体：
 * {
 *   "chart": ZiweiChart,              // 完整命盘数据（必填）
 *   "name": string,                   // 命盘名称（必填）
 *   "relationshipType": RelationshipType,  // 关系类型（必填）
 *   "customLabel"?: string,           // 自定义标签（可选）
 *   "notes"?: string,                 // 备注（可选）
 *   "tags"?: string[]                 // 标签列表（可选）
 * }
 * 
 * ⚠️ 重要：如果 relationshipType === 'self'，每个用户只能有一个，创建时会自动更新现有记录
 */
export async function saveChartArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { chart, name, relationshipType, customLabel, notes, tags } = req.body;

    // 参数验证
    if (!chart || !name || !relationshipType) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '命盘数据 (chart)、存档名称 (name) 和关系类型 (relationshipType) 必须提供',
      });
      return;
    }

    // 验证关系类型
    const validTypes = [
      'self', 'lover', 'child', 'parent', 'bestie',
      'sibling', 'friend', 'colleague', 'celebrity', 'custom'
    ];
    if (!validTypes.includes(relationshipType)) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: `relationshipType 必须是以下之一: ${validTypes.join(', ')}`,
      });
      return;
    }

    // 执行保存
    const result = await astrologyService.saveChartArchive(
      userId,
      userId, // profile_id 使用 userId
      chart,
      name,
      relationshipType,
      customLabel,
      notes,
      tags
    );

    res.status(200).json({
      success: true,
      message: result.message || '命盘存档保存成功',
      data: {
        archiveId: result.archiveId,
      },
    });
  } catch (error: any) {
    console.error('保存命盘存档失败:', error);

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
      error: '保存命盘存档失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询单个命盘存档控制器（返回完整数据）
 * GET /api/astrology/archives/:archiveId
 */
export async function getChartArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;

    if (!archiveId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '存档ID必须提供',
      });
      return;
    }

    // 执行查询
    const archive = await astrologyService.getChartArchive(userId, archiveId);

    if (archive === null) {
      res.status(404).json({
        success: false,
        error: '存档不存在或无权访问',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: archive,
    });
  } catch (error: any) {
    console.error('查询命盘存档失败:', error);

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
      error: '查询命盘存档失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 更新命盘存档控制器
 * PUT /api/astrology/archives/:archiveId
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
 */
export async function updateChartArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;
    const { name, relationshipType, customLabel, notes, tags, chart } = req.body;

    if (!archiveId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '存档ID必须提供',
      });
      return;
    }

    // 验证至少提供一个更新字段
    if (!name && !relationshipType && customLabel === undefined && 
        notes === undefined && tags === undefined && !chart) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '至少需要提供一个更新字段',
      });
      return;
    }

    // 验证关系类型（如果提供）
    if (relationshipType) {
      const validTypes = [
        'self', 'lover', 'child', 'parent', 'bestie',
        'sibling', 'friend', 'colleague', 'celebrity', 'custom'
      ];
      if (!validTypes.includes(relationshipType)) {
        res.status(400).json({
          success: false,
          error: '参数错误',
          message: `relationshipType 必须是以下之一: ${validTypes.join(', ')}`,
        });
        return;
      }
    }

    // 执行更新
    const updatedArchive = await astrologyService.updateChartArchive(
      userId,
      archiveId,
      {
        name,
        relationshipType,
        customLabel,
        notes,
        tags,
        chart,
      }
    );

    res.status(200).json({
      success: true,
      message: '命盘存档更新成功',
      data: updatedArchive,
    });
  } catch (error: any) {
    console.error('更新命盘存档失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('不存在') || error.message?.includes('无权')) {
      res.status(404).json({
        success: false,
        error: '存档不存在或无权更新',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '更新命盘存档失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 删除命盘存档控制器
 * DELETE /api/astrology/archives/:archiveId
 * 
 * ⚠️ 重要：如果删除的是"我的命盘"（relationshipType === 'self'），会同时清理相关数据源
 */
export async function deleteChartArchive(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const archiveId = req.params.archiveId;

    if (!archiveId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '存档ID必须提供',
      });
      return;
    }

    // 执行删除
    const result = await astrologyService.deleteChartArchive(userId, archiveId);

    res.status(200).json({
      success: true,
      message: result.message || '命盘存档删除成功',
    });
  } catch (error: any) {
    console.error('删除命盘存档失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('不存在') || error.message?.includes('无权删除')) {
      res.status(404).json({
        success: false,
        error: '存档不存在或无权删除',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '删除命盘存档失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 清除命盘数据控制器
 * DELETE /api/astrology/clear-chart
 */
export async function clearChartData(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 执行清除
    const result = await astrologyService.clearChartData(userId);

    res.status(200).json({
      success: true,
      message: result.message || '命盘数据清除成功',
      data: {
        cleared: result.cleared,
      },
    });
  } catch (error: any) {
    console.error('清除命盘数据失败:', error);

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
      error: '清除命盘数据失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 保存分析会话控制器
 * POST /api/astrology/analysis-sessions
 */
export async function saveAnalysisSession(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { profileId, sessionData } = req.body;

    // 参数验证
    if (!profileId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '命盘ID必须提供',
      });
      return;
    }

    if (!sessionData) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '分析会话数据必须提供',
      });
      return;
    }

    // 执行保存
    const result = await astrologyService.saveAnalysisSession(
      userId,
      profileId,
      sessionData
    );

    res.status(200).json({
      success: true,
      message: result.message || '分析会话保存成功',
      data: {
        sessionId: result.sessionId,
      },
    });
  } catch (error: any) {
    console.error('保存分析会话失败:', error);

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
      error: '保存分析会话失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 查询分析会话列表控制器
 * GET /api/astrology/analysis-sessions
 * 
 * 查询参数：
 * - profileId?: string - 命盘ID（可选，如果提供则只查询该命盘的会话）
 */
export async function getAnalysisSessions(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { profileId } = req.query;

    // 执行查询
    const sessions = await astrologyService.getAnalysisSessions(
      userId,
      profileId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: {
        sessions,
      },
    });
  } catch (error: any) {
    console.error('查询分析会话失败:', error);

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
      error: '查询分析会话失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 删除命盘的所有分析会话控制器
 * DELETE /api/astrology/analysis-sessions/by-profile/:profileId
 */
export async function deleteAnalysisSessionsByProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const profileId = req.params.profileId;

    if (!profileId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '命盘ID必须提供',
      });
      return;
    }

    // 执行删除
    const result = await astrologyService.deleteAnalysisSessionsByProfile(
      userId,
      profileId
    );

    res.status(200).json({
      success: true,
      message: result.message || '分析会话删除成功',
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error: any) {
    console.error('删除分析会话失败:', error);

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
      error: '删除分析会话失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

import { Response } from 'express';
import * as astrologyService from '../services/astrology.service';
import * as llmService from '../services/llm.service';
import { AuthRequest } from '../middleware/auth.middleware';

function writeSSEEvent(res: Response, event: string, data: object): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
import { sendSuccess, sendError, sendUnauthorized, sendBadRequest, sendNotFound, sendInternalError } from '../utils/response';

const RELATIONSHIP_TYPE_DESC: Record<string, string> = {
  lover: '恋爱婚姻',
  business: '事业合伙',
  family: '家庭关系',
  friend: '朋友',
  other: '其他',
};

function buildCompatibilitySystemPrompt(relationshipType?: string, relationshipGoal?: string): string {
  const relationshipTypeDesc = relationshipType && RELATIONSHIP_TYPE_DESC[relationshipType] ? RELATIONSHIP_TYPE_DESC[relationshipType] : (relationshipType || '其他');
  const goal = (relationshipGoal && String(relationshipGoal).trim()) || '（用户未填写）';
  const base = `# Role
你是一位精通心理学和紫微斗数的情感咨询专家。

# Task
基于 User A (我) 和 User B (对方) 的命盘数据，生成一份"关系说明书"。

<user_context>
【关系类型】: ${relationshipTypeDesc}
【用户当前困惑/目标】: "${goal}"
</user_context>

<instruction>
请基于上述【关系类型】调整分析权重：
- 若为"事业合伙"，重点分析财帛宫（财务观念）、官禄宫（执行力）、奴仆宫（管理风格）。
- 若为"恋爱婚姻"，重点分析命宫（性格）、夫妻宫（情感模式）、福德宫（价值观）。
必须在报告的【总结建议】部分，明确回应用户的【当前困惑/目标】。
</instruction>

<tone_guidelines>
1. **严禁宿命论**：禁止使用"注定分手"、"无法改变"、"克夫/克妻"等绝对化、宿命论的词汇。
2. **成长型思维**：将"冲突"描述为"成长课题"。例如：将沟通差异描述为"学习换位思考的契机"，而非"八字不合经常吵架"。
3. **行动导向**：提出的每个风险点，必须紧跟至少一条可执行的建议（Actionable Advice）。格式：Risk (风险) -> Insight (洞察) -> Action (建议)。
</tone_guidelines>

# Output Format (JSON)
请严格输出合法的 JSON 格式，不要包含 Markdown 代码块标记，以便前端解析。
{"summary":{"metaphor":"一句话比喻（如刹车与油门）","response_to_goal":"对用户困惑的直接回应","compatibility_score":75},"dimensions":{"communication":{"score":60,"analysis":"","advice":""},"values":{"score":80,"analysis":"","advice":""},"stress_response":{"score":50,"analysis":"","advice":""}},"risks_and_advice":[{"risk_point":"","advice":""}],"guardrails":[]}`;
  return base;
}

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
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    // 🟢 修复：同时支持 camelCase 和 snake_case 参数名
    const { 
      dimension, 
      limit, 
      offset,
      profileId,      // camelCase (前端)
      profile_id,    // snake_case (后端)
    } = req.query;

    // 获取 profileId（优先使用 camelCase，兼容 snake_case）
    const profileIdValue = (profileId as string) || (profile_id as string) || undefined;

    // 获取查询参数
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    // 参数验证
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      sendBadRequest(res, 'limit 必须在 1-100 之间');
      return;
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      sendBadRequest(res, 'offset 不能为负数');
      return;
    }

    // 查询已解锁的时空资产
    const assets = await astrologyService.getUnlockedTimeAssets(
      userId,
      profileIdValue, // 🟢 修复：使用从查询参数中读取的 profileId
      dimension as string | undefined,
      limitNum,
      offsetNum
    );

    // 返回结果（使用统一响应格式）
    sendSuccess(res, {
      assets,
      limit: limitNum,
      offset: offsetNum,
      count: assets.length,
    });
  } catch (error: any) {
    console.error('查询已解锁时空资产失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '查询已解锁时空资产失败', error);
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
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    // 🟢 修复：同时支持 camelCase 和 snake_case 参数名
    const { 
      dimension, 
      period_start,      // snake_case
      periodStart,       // camelCase (前端)
      period_end,        // snake_case
      periodEnd,         // camelCase (前端)
      profileId,         // camelCase (前端)
      profile_id,        // snake_case (后端)
    } = req.query;

    // 获取参数（优先使用 camelCase，兼容 snake_case）
    const periodStartValue = (periodStart as string) || (period_start as string);
    const periodEndValue = (periodEnd as string) || (period_end as string);
    const profileIdValue = (profileId as string) || (profile_id as string) || userId; // 默认使用 userId

    // 参数验证
    if (!dimension || !periodStartValue || !periodEndValue) {
      sendBadRequest(res, '维度、时间段开始日期和结束日期必须提供');
      return;
    }

    // 检查是否已解锁
    const isUnlocked = await astrologyService.isTimeAssetUnlocked(
      userId,
      profileIdValue, // 🟢 修复：使用从查询参数中读取的 profileId，或默认使用 userId
      dimension as string,
      periodStartValue,
      periodEndValue
    );

    // 返回结果（使用统一响应格式）
    sendSuccess(res, {
      is_unlocked: isUnlocked,
    });
  } catch (error: any) {
    console.error('检查时空资产解锁状态失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '检查时空资产解锁状态失败', error);
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
    // 支持两种格式：snake_case 和 camelCase（兼容）
    const relationshipType = (req.query.relationship_type || req.query.relationshipType) as string | undefined;
    const keyword = req.query.keyword as string | undefined;
    const limit = req.query.limit;
    const offset = req.query.offset;

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

    const { archives, total } = await astrologyService.getChartArchives(
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
        total,
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
    const chart = req.body.chart;
    const name = req.body.name;
    const relationshipType = req.body.relationship_type || req.body.relationshipType;
    const customLabel = req.body.custom_label || req.body.customLabel;
    const notes = req.body.notes;
    const tags = req.body.tags;
    const id = req.body.id;

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

    const result = await astrologyService.saveChartArchive(
      userId,
      userId,
      chart,
      name,
      relationshipType,
      customLabel,
      notes,
      tags,
      id
    );

    res.status(200).json({
      success: true,
      message: result.message || '命盘存档保存成功',
      data: {
        archive_id: result.archive_id,  // ✅ 统一使用 snake_case
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
        data: null,
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
    // 支持两种格式：snake_case 和 camelCase（兼容）
    const name = req.body.name;
    const relationshipType = req.body.relationship_type || req.body.relationshipType;
    const customLabel = req.body.custom_label || req.body.customLabel;
    const notes = req.body.notes;
    const tags = req.body.tags;
    const chart = req.body.chart;

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
 * 
 * 请求字段支持：
 * - profileId / profile_id（支持两种格式）
 * - sessionData / session_data（支持两种格式）
 * 
 * 响应字段统一使用 snake_case：
 * - session_id
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
    // 支持 camelCase 和 snake_case
    const profileId = req.body.profileId || req.body.profile_id;
    const sessionData = req.body.sessionData || req.body.session_data;

    // 参数验证
    if (!profileId) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '命盘ID必须提供（profileId 或 profile_id）',
      });
      return;
    }

    if (!sessionData) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '分析会话数据必须提供（sessionData 或 session_data）',
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
        session_id: result.sessionId,  // 统一使用 snake_case
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

    // 外键约束错误（虽然已提前验证，但保留此处理以防万一）
    if (error.message?.includes('foreign key constraint') || 
        error.message?.includes('profile_id_fkey') ||
        error.message?.includes('analysis_sessions_profile_id_fkey')) {
      // 重新获取 profileId（在 catch 块中确保变量可用）
      const errorProfileId = req.body.profileId || req.body.profile_id || '未知';
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: `命盘ID不存在（profileId: ${errorProfileId}）。提示：如果这是"我的命盘"，请使用 userId 作为 profileId`,
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
 * - profileId?: string - 命盘ID（可选，支持 camelCase）
 * - profile_id?: string - 命盘ID（可选，支持 snake_case）
 * 
 * 响应字段统一使用 snake_case：
 * - user_id, profile_id, session_data, created_at, updated_at
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
    // 支持 camelCase 和 snake_case
    const profileId = (req.query.profileId || req.query.profile_id) as string | undefined;

    // 执行查询
    const sessions = await astrologyService.getAnalysisSessions(
      userId,
      profileId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: {
        sessions,  // 字段已统一为 snake_case（user_id, profile_id, session_data, created_at, updated_at）
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

export async function createCompatibility(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const userId = req.user.userId;
    const chartA = req.body.chart_a ?? req.body.chartA;
    const chartB = req.body.chart_b ?? req.body.chartB;
    const name = req.body.name;
    const notes = req.body.notes;
    const tags = req.body.tags;
    const rectification = req.body.rectification ?? null;
    const metaData = req.body.meta_data ?? req.body.metaData ?? null;

    if (!chartA || !chartB || !name || !String(name).trim()) {
      sendBadRequest(res, 'chart_a、chart_b、name 必填');
      return;
    }

    const metaDataObj = metaData && typeof metaData === 'object' ? metaData : null;
    const data = await astrologyService.createCompatibilityArchive(
      userId,
      chartA,
      chartB,
      String(name).trim(),
      notes ?? null,
      tags ?? null,
      rectification,
      metaDataObj
    );
    sendSuccess(res, data);
  } catch (error: any) {
    if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
    else sendInternalError(res, '创建合盘存档失败', error);
  }
}

export async function getCompatibilityList(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const userId = req.user.userId;
    const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || 20), 10) || 20), 100);
    const offset = Math.max(0, parseInt(String(req.query.offset || 0), 10) || 0);
    const keyword = (req.query.keyword as string) ?? '';

    const { archives, total } = await astrologyService.getCompatibilityArchives(
      userId,
      limit,
      offset,
      keyword || undefined
    );
    sendSuccess(res, { archives, total });
  } catch (error: any) {
    if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
    else sendInternalError(res, '获取合盘列表失败', error);
  }
}

export async function getCompatibilityById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const userId = req.user.userId;
    const id = req.params.id;
    if (!id) {
      sendBadRequest(res, 'id 必填');
      return;
    }
    const row = await astrologyService.getCompatibilityArchive(userId, id);
    if (!row) {
      sendNotFound(res, '合盘存档不存在或无权访问');
      return;
    }
    sendSuccess(res, {
      id: row.id,
      chart_a: row.chart_a,
      chart_b: row.chart_b,
      name: row.name,
      notes: row.notes,
      tags: row.tags,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rectification_method: row.rectification_method ?? null,
      inferred_hour: row.inferred_hour ?? null,
      confidence: row.confidence ?? null,
      inference_data: row.inference_data ?? null,
      meta_data: row.meta_data ?? null,
    });
  } catch (error: any) {
    if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
    else sendInternalError(res, '获取合盘详情失败', error);
  }
}

export async function deleteCompatibility(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const userId = req.user.userId;
    const id = req.params.id;
    if (!id) {
      sendBadRequest(res, 'id 必填');
      return;
    }
    const deleted = await astrologyService.deleteCompatibilityArchive(userId, id);
    if (!deleted) {
      sendNotFound(res, '合盘存档不存在或无权删除');
      return;
    }
    sendSuccess(res, {});
  } catch (error: any) {
    if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
    else sendInternalError(res, '删除合盘存档失败', error);
  }
}

export async function createAnalyzeTask(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const chartA = req.body.chart_a ?? req.body.chartA;
    const chartB = req.body.chart_b ?? req.body.chartB;
    const relationshipType = req.body.relationship_type ?? req.body.relationshipType;
    const relationshipGoal = req.body.relationship_goal ?? req.body.relationshipGoal ?? '';

    if (!chartA || !chartB) {
      sendBadRequest(res, 'chart_a、chart_b 必填');
      return;
    }

    const taskId = astrologyService.createAnalyzeTask(
      req.user.userId,
      chartA,
      chartB,
      relationshipType,
      relationshipGoal
    );
    sendSuccess(res, { taskId });
  } catch (error: any) {
    if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
    else sendInternalError(res, '创建分析任务失败', error);
  }
}

export async function analyzeCompatibilityStream(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const chartA = req.body.chart_a ?? req.body.chartA;
    const chartB = req.body.chart_b ?? req.body.chartB;
    const relationshipType = req.body.relationship_type ?? req.body.relationshipType ?? '';
    const relationshipGoal = req.body.relationship_goal ?? req.body.relationshipGoal ?? '';

    if (!chartA || !chartB) {
      sendBadRequest(res, 'chart_a、chart_b 必填');
      return;
    }

    const userPrompt = `关系类型: ${String(relationshipType)}\n\nUser A 命盘核心数据:\n${JSON.stringify(chartA)}\n\nUser B 命盘核心数据:\n${JSON.stringify(chartB)}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const systemPrompt = buildCompatibilitySystemPrompt(relationshipType || undefined, relationshipGoal || undefined);
    const stream = llmService.callLLMStream({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 4096,
    });

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      if (error.message?.includes('参数错误') || error.message?.includes('必须')) sendBadRequest(res, error.message);
      else sendInternalError(res, '深度合盘分析失败', error);
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}

export async function streamCompatibilityAnalysis(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    const taskId = req.query.taskId as string;
    if (!taskId) {
      sendBadRequest(res, 'taskId 必填');
      return;
    }

    const task = astrologyService.consumeAnalyzeTask(taskId);
    if (!task || task.userId !== req.user.userId) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      writeSSEEvent(res, 'error', { message: '任务不存在或已过期' });
      res.end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    writeSSEEvent(res, 'start', { status: 'processing', message: '开始分析...' });

    const userPrompt = `关系类型: ${String(task.relationshipType || '')}\n\nUser A 命盘核心数据:\n${JSON.stringify(task.chartA)}\n\nUser B 命盘核心数据:\n${JSON.stringify(task.chartB)}`;

    const systemPrompt = buildCompatibilitySystemPrompt(task.relationshipType, task.relationshipGoal);
    const stream = llmService.callLLMStream({
      prompt: userPrompt,
      systemPrompt,
      temperature: 0.6,
      maxTokens: 4096,
    });

    let fullText = '';
    for await (const chunk of stream) {
      fullText += chunk;
      writeSSEEvent(res, 'chunk', { delta: chunk });
    }

    try {
      const parsed = JSON.parse(fullText);
      if (parsed && typeof parsed === 'object' && parsed.dimensions) {
        writeSSEEvent(res, 'json_block', { type: 'dimensions', data: parsed.dimensions });
      }
      if (parsed && typeof parsed === 'object') {
        writeSSEEvent(res, 'json_block', { type: 'full', data: parsed });
      }
    } catch (_) {}

    writeSSEEvent(res, 'done', { status: 'completed' });
    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      if (error.message?.includes('参数错误')) sendBadRequest(res, error.message);
      else sendInternalError(res, '流式分析失败', error);
    } else {
      writeSSEEvent(res, 'error', { message: error.message || 'AI 服务繁忙' });
      res.end();
    }
  }
}

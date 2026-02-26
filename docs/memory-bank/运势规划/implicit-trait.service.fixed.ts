/**
 * implicit-trait.service.ts — 修复版
 *
 * 修复点（对应 implicit-traits-analyze-500-plan.md）：
 *   步骤1：parseExtractionResponse 增强 JSON 提取容错（正则优先）
 *   步骤2：区分"空提取"与"解析异常"，空提取返回当前画像而非 500
 *   步骤3：增加详细日志，便于排查 LLM 输出问题
 */

import { callLLM } from './llm.service';
import { getImplicitTraits, mergeTraitsFromExtraction } from './user-digital-twin.service';
import type { ImplicitTraits, Psychometrics, WeightedInterestTag } from '../types/user-digital-twin';
import { formatForExtraction } from './context/ImplicitTraitFormatter';

export interface AnalyzeResult {
  psychometrics?: Psychometrics;
  weighted_interest_tags?: WeightedInterestTag[];
  changes?: { risk_delta?: number; new_tags?: string[] };
}

export async function analyzeAndMerge(
  userId: string,
  userQuery: string,
  aiAnalysis: string,
  contextId?: string
): Promise<AnalyzeResult | null> {
  const currentTraits = await getImplicitTraits(userId);
  const prompt = buildExtractionPrompt(userQuery, aiAnalysis, currentTraits);
  const systemPrompt = getSystemPrompt();

  const response = await callLLM({
    prompt,
    systemPrompt,
    temperature: 0.3,
    maxTokens: 800,
  });

  const defaultSourceEvent = defaultSourceEventFromContext(contextId);
  const extracted = parseExtractionResponse(response.content, defaultSourceEvent);

  // 步骤2：区分"解析异常（null）"与"空提取（{}）"
  if (extracted === null) {
    // 真正的解析异常，记录日志后返回 null → controller 转 500
    console.error(
      '[ImplicitTraitService] analyzeAndMerge: parseExtractionResponse 返回 null',
      {
        userId,
        userQueryLen: userQuery.length,
        aiAnalysisLen: aiAnalysis.length,
        contentPreview: (response.content || '').slice(0, 200),
      }
    );
    return null;
  }

  // 步骤2：空提取（无任何可用字段）→ 直接返回当前画像，不调用 merge，不触发 500
  const isEmpty =
    !extracted.psychometrics &&
    (!extracted.weighted_interest_tags || extracted.weighted_interest_tags.length === 0) &&
    !extracted.family_structure &&
    (!extracted.profession_hints || extracted.profession_hints.length === 0);

  if (isEmpty) {
    console.info(
      '[ImplicitTraitService] analyzeAndMerge: 本次提取为空，跳过 merge，返回当前画像',
      { userId }
    );
    return {
      psychometrics: currentTraits?.psychometrics,
      weighted_interest_tags: currentTraits?.weighted_interest_tags,
    };
  }

  if (currentTraits?.psychometrics && extracted.psychometrics) {
    extracted.psychometrics = applySafetyClamp(
      currentTraits.psychometrics,
      extracted.psychometrics
    );
  }

  const updated = await mergeTraitsFromExtraction(userId, extracted);

  const changes: AnalyzeResult['changes'] = {};
  const prevValues = new Set((currentTraits?.weighted_interest_tags || []).map((t) => t.value));
  const newTags = (updated.weighted_interest_tags || [])
    .map((t) => t.value)
    .filter((v) => !prevValues.has(v));
  if (newTags.length) changes.new_tags = newTags;

  return {
    psychometrics: updated.psychometrics,
    weighted_interest_tags: updated.weighted_interest_tags,
    changes: Object.keys(changes).length ? changes : undefined,
  };
}

function defaultSourceEventFromContext(contextId?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return contextId ? `${date} ${contextId}` : `${date} 日常对话分析`;
}

function buildExtractionPrompt(
  userQuery: string,
  aiAnalysis: string,
  currentTraits: ImplicitTraits | null
): string {
  const currentProfileStr = formatForExtraction(currentTraits ?? undefined);

  return `你是一个资深的用户心理侧写师。从对话中提取用户画像，并基于紫微斗数特质维度进行量化。
【已知画像】
${currentProfileStr}

【本次对话】
Q: ${userQuery}
A: ${aiAnalysis}

【提取任务】
请分析用户在以下 6 个维度的表现 (0-100分)：
1. **决断力 (Decisiveness)**: 面对风险的果断程度 (七杀/破军特质)
2. **包容心 (Empathy)**: 对他人的共情与接纳 (天同/太阴特质)
3. **行动力 (Drive)**: 执行力与进取心 (破军/廉贞特质)
4. **稳定感 (Stability)**: 内心秩序与情绪稳定性 (天府/天相特质)
5. **求知欲 (Curiosity)**: 逻辑思考与探索意愿 (天机/巨门特质)
6. **社交力 (Sociability)**: 人际交往能力 (贪狼/太阳特质)

【输出 JSON】
{
  "psychometrics": {
    "decisiveness": number,
    "empathy": number,
    "drive": number,
    "stability": number,
    "curiosity": number,
    "sociability": number
  },
  "weighted_interest_tags": [
    { "value": "关键词", "weight": 0-100, "confidence": 0-1, "source_event": "简短的对话摘要" }
  ]
}`;
}

function getSystemPrompt(): string {
  return `你是一个专业的信息提取助手。你的任务是准确、客观地提取信息，不要过度推断。`;
}

/**
 * 步骤1：增强 JSON 提取容错
 *
 * 解析策略（优先级从高到低）：
 *   1. 去除 markdown 代码块后直接 JSON.parse
 *   2. 正则 /\{[\s\S]*\}/ 提取第一个 JSON 对象后 JSON.parse
 *   3. 以上均失败 → 返回 null（真正的解析异常）
 *
 * 步骤2：
 *   - 解析成功但无任何有效字段 → 返回空对象 {}（由 analyzeAndMerge 处理为"空提取"）
 *   - 解析失败 → 返回 null（由 analyzeAndMerge 处理为 500）
 */
export function parseExtractionResponse(
  content: string,
  defaultSourceEvent: string
): {
  weighted_interest_tags?: WeightedInterestTag[];
  psychometrics?: Psychometrics;
  family_structure?: ImplicitTraits['family_structure'];
  profession_hints?: string[];
} | null {
  // 防御：content 为空或非字符串
  if (!content || typeof content !== 'string') {
    console.warn('[ImplicitTraitService] parseExtractionResponse: content 为空');
    return {};
  }

  let parsed: any = null;

  // 策略1：去除 markdown 代码块后直接解析
  try {
    const stripped = content.replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(stripped);
  } catch (_e1) {
    // 策略2：正则提取第一个 JSON 对象
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    } catch (e2) {
      // 步骤3：详细日志
      console.error('[ImplicitTraitService] parseExtractionResponse: JSON 解析失败', {
        contentPreview: content.slice(0, 500),
        error: (e2 as Error).message,
        stack: (e2 as Error).stack,
      });
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    console.warn('[ImplicitTraitService] parseExtractionResponse: parsed 不是对象', {
      contentPreview: content.slice(0, 200),
    });
    return {};
  }

  const now = Math.floor(Date.now() / 1000);
  const result: {
    weighted_interest_tags?: WeightedInterestTag[];
    psychometrics?: Psychometrics;
    family_structure?: ImplicitTraits['family_structure'];
    profession_hints?: string[];
  } = {};

  if (Array.isArray(parsed.weighted_interest_tags)) {
    result.weighted_interest_tags = parsed.weighted_interest_tags.map((t: any) => ({
      value: String(t.value || '').trim() || 'unknown',
      weight: Number(t.weight) || 0,
      confidence: Number(t.confidence) || 0.5,
      source_event: String(t.source_event || '').trim() || defaultSourceEvent,
      last_updated: now,
    }));
  }

  if (parsed.psychometrics) {
    const n = (v: unknown, d: number) => {
      const x = Number(v);
      return Number.isFinite(x) ? Math.round(Math.max(0, Math.min(100, x))) : d;
    };
    result.psychometrics = {
      decisiveness: n(parsed.psychometrics.decisiveness, 50),
      empathy: n(parsed.psychometrics.empathy, 50),
      drive: n(parsed.psychometrics.drive, 50),
      stability: n(parsed.psychometrics.stability, 50),
      curiosity: n(parsed.psychometrics.curiosity, 50),
      sociability: n(parsed.psychometrics.sociability, 50),
    };
  }

  if (parsed.family_structure && typeof parsed.family_structure === 'object') {
    result.family_structure = {
      has_spouse:
        typeof parsed.family_structure.has_spouse === 'boolean'
          ? parsed.family_structure.has_spouse
          : undefined,
      has_children:
        typeof parsed.family_structure.has_children === 'boolean'
          ? parsed.family_structure.has_children
          : undefined,
      children_count:
        typeof parsed.family_structure.children_count === 'number'
          ? parsed.family_structure.children_count
          : undefined,
    };
  }

  if (Array.isArray(parsed.profession_hints)) {
    result.profession_hints = parsed.profession_hints
      .filter((h: any) => typeof h === 'string')
      .slice(0, 10);
  }

  return result;
}

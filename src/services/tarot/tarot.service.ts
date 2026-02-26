import * as llmService from '../llm.service';
import { TarotPromptGenerator, TarotIntent, ZiweiProfile } from './tarotPromptGenerator';
import { ContextBuilder } from '../context/ContextBuilder';
import { getStarChart } from '../astrology.service';

export interface TarotSpread {
  name: string;
  chineseName: string;
  description: string;
  positionCount: number;
}

export interface TarotCardRequest {
  name: string;
  chineseName: string;
  orientation: 'upright' | 'reversed';
  position: string;
  positionIndex: number;
}

export interface TarotRequest {
  userId: string;
  question: string;
  spread?: TarotSpread;
  cards?: TarotCardRequest[];
}

export interface TarotResult {
  intent: TarotIntent;
  verdict: {
    direct_answer: {
      verdict: string;
      tone: 'gentle' | 'neutral' | 'direct';
      buffered_version: string;
    };
    core_card: string;
    energy_level: 'low' | 'medium' | 'high';
    energy_label: string;
    headline: string;
    summary: string;
    energy_assessment: {
      current_state: '阻滞' | '顺畅' | '波动';
      trend: 'improving' | 'stable' | 'declining';
      dimension: 'overall' | 'emotional' | 'practical' | 'spiritual';
      description: string;
    };
    fortune_stage?: {
      stage_name: string;
      stage_description: string;
      trend: '短期阻滞，长期顺畅' | '短期顺畅，长期阻滞' | '整体顺畅' | '整体阻滞' | '波动中上升' | '波动中下降';
    };
  };
  card_matrix: Array<{
    position: string;
    card: string;
    connection_type: 'support' | 'conflict' | 'neutral';
    contextual_meaning: string;
  }>;
  soul_action: {
    title: string;
    simple_version: {
      action: string;
      duration: string;
    };
    full_version: {
      steps: Array<{
        step: number;
        action: string;
        duration: string;
        items: string[];
        energy_meaning: string;
      }>;
    };
  };
}

function validateAIOutput(output: any, expectedCardCount?: number): TarotResult | null {
  try {
    if (!output || typeof output !== 'object') {
      return null;
    }

    const required = [
      'verdict.direct_answer.verdict',
      'verdict.energy_assessment.current_state',
      'verdict.core_card',
      'verdict.headline',
      'verdict.summary',
    ];

    for (const path of required) {
      const keys = path.split('.');
      let value = output;
      for (const key of keys) {
        if (value === undefined || value === null) {
          return null;
        }
        value = value[key];
      }
    }

    const validStates = ['阻滞', '顺畅', '波动'];
    const state = output.verdict?.energy_assessment?.current_state;
    if (!validStates.includes(state)) {
      return null;
    }

    // ✅ 新增：验证 card_matrix 数量是否匹配
    if (expectedCardCount !== undefined) {
      const cardMatrix = output.card_matrix;
      if (!Array.isArray(cardMatrix) || cardMatrix.length !== expectedCardCount) {
        console.warn('[Tarot Service] card_matrix 数量不匹配', {
          expected: expectedCardCount,
          actual: cardMatrix?.length || 0,
        });
        // 不直接返回 null，允许降级处理
      }
    }

    return output as TarotResult;
  } catch (error) {
    console.error('[Tarot Service] 验证AI输出失败:', error);
    return null;
  }
}

function fallbackOutput(intent: TarotIntent): TarotResult {
  return {
    intent,
    verdict: {
      direct_answer: {
        verdict: '牌阵信息复杂，请结合详细解读理解',
        tone: 'neutral',
        buffered_version: '牌阵信息复杂，请结合详细解读理解',
      },
      core_card: 'The Fool',
      energy_level: 'medium',
      energy_label: '能量状态',
      headline: '命运的迷雾',
      summary: '牌阵信息复杂，需要进一步分析。请结合详细解读理解。',
      energy_assessment: {
        current_state: '波动',
        trend: 'stable',
        dimension: 'overall',
        description: '能量状态需要进一步分析',
      },
      fortune_stage: {
        stage_name: '待定',
        stage_description: '需要进一步分析',
        trend: '波动中上升',
      },
    },
    card_matrix: [],
    soul_action: {
      title: '静心冥想',
      simple_version: {
        action: '闭上眼睛，深呼吸3次，默念：「我接受当下的指引」',
        duration: '30秒',
      },
      full_version: {
        steps: [
          {
            step: 1,
            action: '找一个安静的地方，坐下或躺下',
            duration: '1分钟',
            items: [],
            energy_meaning: '创造安静的环境',
          },
          {
            step: 2,
            action: '闭眼深呼吸，专注于当下',
            duration: '5分钟',
            items: [],
            energy_meaning: '连接内在智慧',
          },
        ],
      },
    },
  };
}

/**
 * 卡牌名称映射表（基于前端标准格式）
 * 用于规范化 AI 返回的卡牌名称，确保与前端 storyTarotData.ts 中的 name 字段完全一致
 */
const CARD_NAME_MAPPING: Record<string, string> = {
  // 大牌（Major Arcana）- 带 The 前缀
  'The Fool': 'The Fool',
  'The Magician': 'The Magician',
  'The High Priestess': 'The High Priestess',
  'The Empress': 'The Empress',
  'The Emperor': 'The Emperor',
  'The Hierophant': 'The Hierophant',
  'The Lovers': 'The Lovers',
  'The Chariot': 'The Chariot',
  'Strength': 'Strength',
  'The Hermit': 'The Hermit',
  'Wheel of Fortune': 'Wheel of Fortune',
  'Justice': 'Justice',
  'The Hanged Man': 'The Hanged Man',
  'Death': 'Death',
  'Temperance': 'Temperance',
  'The Devil': 'The Devil',
  'The Tower': 'The Tower',
  'The Star': 'The Star',
  'The Moon': 'The Moon',
  'The Sun': 'The Sun',
  'Judgement': 'Judgement',
  'The World': 'The World',
  
  // 大牌（不带 The 前缀的变体）
  'Fool': 'The Fool',
  'Magician': 'The Magician',
  'High Priestess': 'The High Priestess',
  'Empress': 'The Empress',
  'Emperor': 'The Emperor',
  'Hierophant': 'The Hierophant',
  'Lovers': 'The Lovers',
  'Chariot': 'The Chariot',
  'Hermit': 'The Hermit',
  'Hanged Man': 'The Hanged Man',
  'Devil': 'The Devil',
  'Tower': 'The Tower',
  'Star': 'The Star',
  'Moon': 'The Moon',
  'Sun': 'The Sun',
  'World': 'The World',
};

/**
 * 规范化卡牌名称
 * 将 AI 返回的卡牌名称映射到前端标准格式
 * 
 * @param cardName AI 返回的卡牌名称（可能格式不一致）
 * @param userCards 用户实际抽到的卡牌列表（包含标准格式的 name）
 * @returns 规范化后的卡牌名称（与前端 storyTarotData.ts 中的 name 字段完全一致）
 */
function normalizeCardName(cardName: string, userCards?: TarotCardRequest[]): string {
  if (!cardName || typeof cardName !== 'string') {
    console.warn('[Tarot Service] 卡牌名称为空或格式错误:', cardName);
    return cardName || '';
  }

  const trimmedName = cardName.trim();
  
  // 1. 优先使用用户传递的卡牌作为映射表（最准确）
  if (userCards && userCards.length > 0) {
    // 精确匹配（英文名）
    const exactMatch = userCards.find(card => 
      card.name === trimmedName || 
      card.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (exactMatch) {
      return exactMatch.name;
    }

    // 精确匹配（中文名）
    const chineseMatch = userCards.find(card => 
      card.chineseName === trimmedName ||
      card.chineseName === cardName
    );
    if (chineseMatch) {
      return chineseMatch.name;
    }

    // 模糊匹配（忽略大小写和 The 前缀）
    const normalizedInput = trimmedName.toLowerCase().replace(/^the\s+/, '');
    const fuzzyMatch = userCards.find(card => {
      const normalizedCard = card.name.toLowerCase().replace(/^the\s+/, '');
      return normalizedCard === normalizedInput;
    });
    if (fuzzyMatch) {
      return fuzzyMatch.name;
    }

    // 部分匹配（包含关系）
    const partialMatch = userCards.find(card => {
      const cardNameLower = card.name.toLowerCase();
      const inputLower = trimmedName.toLowerCase();
      return cardNameLower.includes(inputLower) || inputLower.includes(cardNameLower);
    });
    if (partialMatch) {
      console.warn('[Tarot Service] 使用部分匹配规范化卡牌名称', {
        input: trimmedName,
        normalized: partialMatch.name,
      });
      return partialMatch.name;
    }
  }

  // 2. 使用静态映射表
  if (CARD_NAME_MAPPING[trimmedName]) {
    return CARD_NAME_MAPPING[trimmedName];
  }

  // 3. 处理小牌（Minor Arcana）格式
  // 小牌格式："[Number] of [Suit]"（不带 The）
  // 例如："Ace of Wands", "Two of Cups", "King of Swords"
  const minorArcanaPattern = /^(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)\s+of\s+(wands|cups|swords|pentacles)$/i;
  if (minorArcanaPattern.test(trimmedName)) {
    // 小牌格式应该已经是标准格式，直接返回
    return trimmedName;
  }

  // 4. 处理带 The 前缀的小牌（错误格式）
  const minorArcanaWithThePattern = /^the\s+(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)\s+of\s+(wands|cups|swords|pentacles)$/i;
  if (minorArcanaWithThePattern.test(trimmedName)) {
    // 移除 The 前缀
    const normalized = trimmedName.replace(/^the\s+/i, '');
    console.warn('[Tarot Service] 移除小牌的 The 前缀', {
      input: trimmedName,
      normalized,
    });
    return normalized;
  }

  // 5. 无法规范化，记录错误并返回原名称
  console.error('[Tarot Service] 无法规范化卡牌名称', {
    input: trimmedName,
    userCards: userCards?.map(c => ({ name: c.name, chineseName: c.chineseName })),
  });
  
  return trimmedName;
}

async function getZiweiProfile(userId: string): Promise<ZiweiProfile | null> {
  try {
    const starChart = await getStarChart(userId);
    if (!starChart || !starChart.chart_structure) {
      return null;
    }

    const chart = starChart.chart_structure;
    
    const mainStar = chart.mingGong?.mainStar || chart.mingGong?.stars?.[0]?.name;
    const transformations = chart.transformations || [];
    const element = chart.element || chart.wuXing?.element;

    if (!mainStar) {
      return null;
    }

    return {
      mainStar,
      transformations: Array.isArray(transformations) ? transformations : [],
      element,
    };
  } catch (error) {
    console.error('[Tarot Service] 获取紫微数据失败:', error);
    return null;
  }
}

export async function generateTarotReading(request: TarotRequest): Promise<TarotResult> {
  const { userId, question, spread, cards } = request;

  if (!question || question.trim().length === 0) {
    throw new Error('问题不能为空');
  }

  // ✅ 新增：验证牌阵和卡牌信息
  if (spread && cards) {
    if (cards.length !== spread.positionCount) {
      throw new Error(`卡牌数量 (${cards.length}) 与牌阵位置数量 (${spread.positionCount}) 不匹配`);
    }
    
    // 验证每张卡牌的必要字段
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card.name || !card.chineseName || !card.position) {
        throw new Error(`卡牌 ${i + 1} 缺少必要字段 (name, chineseName, position)`);
      }
      if (card.orientation !== 'upright' && card.orientation !== 'reversed') {
        throw new Error(`卡牌 ${i + 1} 的正逆位信息无效 (orientation)`);
      }
    }
  }

  const intent = TarotPromptGenerator.identifyIntent(question);

  const { userContext, implicitTraits } = await ContextBuilder.getUserContext(userId);
  const ziweiProfile = await getZiweiProfile(userId);

  const prompt = await TarotPromptGenerator.generatePrompt({
    userId,
    question,
    userContext,
    implicitTraits,
    ziweiProfile: ziweiProfile || undefined,
    spread,
    cards,
  });

  console.log('[Tarot Service] 生成Prompt完成', {
    userId,
    intent,
    hasZiweiProfile: !!ziweiProfile,
    promptLength: prompt.length,
  });

  try {
    const llmResponse = await llmService.callLLM({
      prompt,
      systemPrompt: TarotPromptGenerator.SYSTEM_PROMPT_V2_1,
      temperature: 0.8,
      maxTokens: 2000,
    });

    let parsedOutput: any;
    try {
      const content = llmResponse.content.trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedOutput = JSON.parse(jsonMatch[0]);
      } else {
        parsedOutput = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('[Tarot Service] JSON解析失败:', {
        error: parseError,
        content: llmResponse.content.substring(0, 500),
      });
      return fallbackOutput(intent);
    }

    const expectedCardCount = cards?.length;
    const validated = validateAIOutput(parsedOutput, expectedCardCount);
    if (!validated) {
      console.warn('[Tarot Service] AI输出验证失败，使用降级方案');
      return fallbackOutput(intent);
    }

    validated.intent = intent;

    // ✅ 核心修复：规范化卡牌名称，确保与前端 storyTarotData.ts 中的 name 字段完全一致
    if (validated.card_matrix && Array.isArray(validated.card_matrix)) {
      validated.card_matrix = validated.card_matrix.map(cardItem => ({
        ...cardItem,
        card: normalizeCardName(cardItem.card, cards),
      }));
    }

    // ✅ 规范化 core_card
    if (validated.verdict.core_card) {
      validated.verdict.core_card = normalizeCardName(validated.verdict.core_card, cards);
    }

    console.log('[Tarot Service] 塔罗解读生成成功', {
      userId,
      intent: validated.intent,
      directAnswer: validated.verdict.direct_answer.verdict,
      energyState: validated.verdict.energy_assessment.current_state,
      cardMatrixCount: validated.card_matrix?.length || 0,
      coreCard: validated.verdict.core_card,
    });

    return validated;
  } catch (error: any) {
    console.error('[Tarot Service] LLM调用失败:', {
      userId,
      error: error.message,
    });
    
    return fallbackOutput(intent);
  }
}

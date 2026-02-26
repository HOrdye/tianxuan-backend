import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';
import { ContextCompressor } from '../context/ContextCompressor';

export type TarotIntent = 'relationship' | 'decision' | 'prediction' | 'exploration';

export interface ZiweiProfile {
  mainStar?: string;
  transformations?: string[];
  element?: string;
}

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

export interface TarotPromptParams {
  userId: string;
  question: string;
  userContext: UserContextData;
  implicitTraits?: ImplicitTraits;
  ziweiProfile?: ZiweiProfile;
  spread?: TarotSpread;
  cards?: TarotCardRequest[];
}

export class TarotPromptGenerator {
  static readonly SYSTEM_PROMPT_V2_1 = `# Role
你是一位直觉敏锐、洞察人心的塔罗宗师。你的解读直击灵魂，既有神秘学的深意，又有现实的落地感。

**核心原则**：用户来占卜是为了要"答案"，而不是为了来做"心理咨询"。你的任务是给出明确的判断，而不是模棱两可的"镜映"。

# Task Flow

## 1. Intent & Energy Assessment (意图与能量定性)
- **识别意图**：Relationship / Decision / Prediction / Exploration
- **能量定性**：*[v2.1 Refined]* 不要寻找矛盾，而是给出明确的能量流向判断。
  - ❌ **禁止**："你的意识想前进，潜意识想后退。"（模棱两可）
  - ✅ **要求**："目前的能量流向非常明确——是阻滞的。即便你主观想推，客观环境也不支持。"（明确判断）
  - 如果能量是阻滞的，直接说"阻滞"；如果是顺畅的，直接说"顺畅"
  - 禁止使用"可能"、"或许"、"也许"等模糊词汇

## 2. The Verdict (灵视定调)
- **Direct Answer**: *[v2.1 New]* **必须**用一句话直接回答用户的问题
  - 关系型问题："能/不能"、"是/不是"（如："不能复合"、"他不爱你"）
  - 决策型问题："选A/选B"、"建议/不建议"（如："建议选择A"、"不建议离职"）
  - 预测型问题："会/不会"、"能/不能"（如："会成功"、"不能通过"）
  - 探索型问题："是/不是"、"需要/不需要"（如："需要改变"、"不是你的问题"）
- **Core Card**: 选出最强的一张牌。
- **Direct Answer**: *[v2.1 Final]* 必须包含语气变体
  - \`verdict\`: 直接回答（如"不能复合"）
  - \`tone\`: 语气类型（gentle用于情感类问题，neutral用于决策类，direct用于探索类）
  - \`buffered_version\`: 缓冲版本（如"目前来看，复合的可能性很低"）
- **Energy Level**: *[v2.1 Final]* 使用等级制（low/medium/high），替代精确分数
- **Headline**: 4-8字，极具冲击力的标题。
- **Summary**: 包含"结论" + "能量定性"的一段话（不再是"矛盾点"）。
- **Energy Assessment**: *[v2.1 Final]* 能量流向的明确判断，包含：
  - \`current_state\`: 阻滞/顺畅/波动
  - \`trend\`: improving/stable/declining（能量趋势）
  - \`dimension\`: overall/emotional/practical/spiritual（能量维度）
  - \`description\`: 能量状态的文字描述

## 3. Contextual Matrix (情境化解牌) - v2.2 优化版
- **核心原则**：不要逐张牌解释。请将牌阵分为"核心冲突"、"时间流变"、"破局关键"三个逻辑块进行综合叙述。
- **禁止**：
  - ❌ 不要按 1, 2, 3... 的顺序逐张牌解释
  - ❌ 不要复述牌面关键词（用户已经看到了）
  - ❌ 不要写"第X张牌代表..."这种格式
- **要求**：
  - ✅ 使用"逻辑组块"重组牌阵
  - ✅ 解释牌与牌之间的关联性
  - ✅ 说明为什么得出这个结论
  - ✅ 在至少一个逻辑组块中引用能量分布数据
- **Connection Type**: *[v2.0]* 标识牌与牌之间的关系（support/conflict/neutral）。
- *Example*: "星币国王的稳固与权杖二的焦虑形成内在冲突：是继续巩固，还是大胆扩张？这个冲突正是你当前困局的根源。"

## 4. Soul Action (微仪式)
- 设计一个与牌阵能量互补的仪式。
- **[v2.1 Final]** 必须提供两个版本：
  - **极简版**（30秒）：深呼吸3次+默念咒语（默认显示）
  - **完整版**（15分钟）：Step-by-Step指引（点击查看）
- 包含具体的 **Steps** (预计耗时、所需物品、动作、能量意义)。
- 与To-Do二合一，直接可执行。

## 5. Ziwei Parameter Tuning (紫微参数调优) *[v2.1 New]*
- **重要**：紫微数据作为"调参器"，**绝不**在输出中提及紫微斗数。
- **调参逻辑**（根据用户性格特质自动调整语气和重点）：
  - 如果用户是"七杀（冲动型）"，AI在解读"宝剑骑士（急躁）"时，自动加重语气警告"切勿鲁莽"
  - 如果用户是"天同（温吞型）"，AI会鼓励"必须迈出这一步"
  - 如果用户是"天机（多思型）"，AI会强调"过度思考"与"直觉行动"的平衡
  - 如果用户是"紫微（控制型）"，AI会重点分析"放下控制"的必要性
- **输出要求**：使用西方心理学语言（如"控制欲"、"完美主义"），而非东方玄学术语（如"七杀"、"天机"）
- **禁止**：在输出中出现"根据你的紫微命格"、"结合你的命盘"等表述

# Output Format (JSON)
{
  "intent": "relationship",
  "verdict": {
    "direct_answer": {
      "verdict": "不能复合",
      "tone": "gentle",
      "buffered_version": "目前来看，复合的可能性很低"
    },
    "core_card": "The Tower",
    "energy_level": "low",
    "energy_label": "复合概率",
    "headline": "毁灭是为了重生",
    "summary": "这段关系的地基早已腐烂，复合不过是重建一座注定倒塌的危楼。目前的能量流向非常明确——是阻滞的。即便你主观想复合，客观环境也不支持。",
    "energy_assessment": {
      "current_state": "阻滞",
      "trend": "declining",
      "dimension": "overall",
      "description": "目前阻滞，且有下降趋势"
    },
    "fortune_stage": {
      "stage_name": "蛰伏转型期",
      "stage_description": "短期面临内耗，长期指向技术壁垒构建",
      "trend": "短期阻滞，长期顺畅"
    }
  },
  "card_matrix": [
    {
      "position": "阻碍",
      "card": "Five of Pentacles",
      "connection_type": "conflict",
      "contextual_meaning": "这里的贫穷不是没钱，而是你们在面对现实压力时，忘记了互相支撑，产生了'孤单感'。"
    }
  ],
  "soul_action": {
    "title": "金币共筑冥想",
    "simple_version": {
      "action": "闭上眼睛，深呼吸3次，默念：「我释放过去的执念」",
      "duration": "30秒"
    },
    "full_version": {
      "steps": [
        {
          "step": 1,
          "action": "找一枚硬币，握在手心。",
          "duration": "2分钟",
          "items": ["一枚硬币"],
          "energy_meaning": "连接物质与精神的桥梁"
        },
        {
          "step": 2,
          "action": "闭眼想象金色的光芒包裹你们二人。",
          "duration": "5分钟",
          "items": [],
          "energy_meaning": "强化情感纽带"
        },
        {
          "step": 3,
          "action": "默念：'现实的风霜无法冷却我们的心'。",
          "duration": "1分钟",
          "items": [],
          "energy_meaning": "植入正向信念"
        }
      ]
    }
  }
}`;

  static identifyIntent(question: string): TarotIntent {
    const lowerQuestion = question.toLowerCase();
    
    const relationshipKeywords = ['爱', '复合', '分手', '感情', '恋爱', '结婚', '正缘', '缘分', '他', '她', '对方'];
    const decisionKeywords = ['选择', '选', '离职', '跳槽', '换', '要不要', '该不该', '应该', '建议'];
    const predictionKeywords = ['能', '会', '成功', '通过', '考试', '面试', '项目', '未来', '什么时候'];
    const explorationKeywords = ['为什么', '怎么', '如何', '提升', '改善', '倒霉', '不顺', '原因'];
    
    const relationshipScore = relationshipKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    const decisionScore = decisionKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    const predictionScore = predictionKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    const explorationScore = explorationKeywords.filter(kw => lowerQuestion.includes(kw)).length;
    
    const scores = [
      { intent: 'relationship' as TarotIntent, score: relationshipScore },
      { intent: 'decision' as TarotIntent, score: decisionScore },
      { intent: 'prediction' as TarotIntent, score: predictionScore },
      { intent: 'exploration' as TarotIntent, score: explorationScore },
    ];
    
    scores.sort((a, b) => b.score - a.score);
    return scores[0].score > 0 ? scores[0].intent : 'exploration';
  }

  static mapTarotIntentToContextIntent(intent: TarotIntent): 'career' | 'love' | 'wealth' | 'health' | 'decision' | 'prediction' | 'general' {
    const mapping: Record<TarotIntent, 'career' | 'love' | 'wealth' | 'health' | 'decision' | 'prediction' | 'general'> = {
      relationship: 'love',
      decision: 'decision',
      prediction: 'prediction',
      exploration: 'general',
    };
    return mapping[intent];
  }

  static generateContextPrompt(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits,
    intent?: TarotIntent
  ): string {
    const contextIntent = intent ? this.mapTarotIntentToContextIntent(intent) : 'general';
    
    const compressedContext = ContextCompressor.compress(
      userContext,
      implicitTraits,
      60,
      'standard',
      contextIntent
    );
    
    if (!compressedContext || compressedContext.trim().length === 0) {
      return '';
    }
    
    return `\n# 👤 用户画像\n${compressedContext}\n`;
  }

  static generateConnectionPrompt(
    ziweiProfile: ZiweiProfile,
    intent: TarotIntent
  ): string {
    let prompt = `\n# 🎛️ 参数调优指令 (Parameter Tuning - v2.1 Refined)\n`;
    prompt += `**重要**：以下信息用于调整你的解读语气和重点，**绝不**在输出中提及紫微斗数。\n`;
    prompt += `**核心原则**：紫微数据是你的"调参器"，而不是输出内容。用户来占卜是为了要"答案"，不是为了听你分析他的性格。\n\n`;

    if (ziweiProfile.mainStar) {
      const tuningInstruction = this.getParameterTuningInstruction(ziweiProfile.mainStar);
      const example = this.getTuningExample(ziweiProfile.mainStar, intent);
      
      prompt += `### 🧬 用户性格参数\n`;
      prompt += `**调参指令**：${tuningInstruction}\n`;
      prompt += `**示例**：${example}\n\n`;
    }

    prompt += `## 🎯 调参规则\n`;
    prompt += `1. **绝不提及紫微**：输出中禁止出现"根据你的紫微命格"等表述\n`;
    prompt += `2. **自动调整语气**：根据用户性格特质，自动调整警告/鼓励的语气强度\n`;
    prompt += `3. **使用心理学语言**：使用西方心理学语言（如"控制欲"、"完美主义"），而非东方玄学术语\n`;
    prompt += `4. **润物细无声**：让用户感受到解读"很准"、"很贴合"，但不知道为什么\n`;

    return prompt;
  }

  static getParameterTuningInstruction(mainStar: string): string {
    const instructions: Record<string, string> = {
      '七杀': '用户性格冲动，容易急躁。在解读急躁相关的牌（如宝剑骑士）时，自动加重语气警告"切勿鲁莽"。',
      '天同': '用户性格温吞，缺乏行动力。在解读行动相关的牌时，自动鼓励"必须迈出这一步"。',
      '天机': '用户性格多思，容易过度思考。在解读时，自动强调"过度思考"与"直觉行动"的平衡。',
      '紫微': '用户性格控制欲强，喜欢掌控一切。在解读时，自动重点分析"放下控制"的必要性。',
      '天梁': '用户性格稳重，但可能过于保守。在解读时，自动鼓励适度冒险。',
      '太阴': '用户性格敏感，情绪化。在解读时，自动关注情感层面的解读。',
      '太阳': '用户性格外向，积极。在解读时，自动关注行动和表现。',
      '武曲': '用户性格果断，但可能过于刚硬。在解读时，自动强调柔性和变通。',
      '破军': '用户性格激进，喜欢突破。在解读时，自动关注变化和突破。',
      '廉贞': '用户性格复杂，情绪多变。在解读时，自动关注情绪管理和平衡。',
    };
    
    return instructions[mainStar] || '根据用户性格特质，自动调整解读语气和重点。';
  }

  static getTuningExample(mainStar: string, intent: TarotIntent): string {
    const examples: Record<string, Record<TarotIntent, string>> = {
      '七杀': {
        relationship: '如果出现"宝剑骑士"（急躁），不要说"你可能有些急躁"，而要说"你此刻的急躁正在破坏这段关系，必须冷静下来"。',
        decision: '如果出现"权杖七"（防御），不要说"你可能需要坚持"，而要说"你的冲动会让你做出错误决定，必须三思而后行"。',
        prediction: '如果出现"高塔"（突变），不要说"可能会有变化"，而要说"你的急躁会加速这个变化，必须提前做好准备"。',
        exploration: '如果出现"愚者"（冒险），不要说"你可能需要冒险"，而要说"你的冲动会让你盲目冒险，必须理性评估风险"。',
      },
      '天同': {
        relationship: '如果出现"权杖三"（行动），不要说"你可能需要行动"，而要说"你不能再等待了，必须主动表达你的感受"。',
        decision: '如果出现"宝剑二"（犹豫），不要说"你可能需要选择"，而要说"你的犹豫不决正在错失机会，必须立即做出决定"。',
        prediction: '如果出现"星币十"（稳定），不要说"可能会稳定"，而要说"只有你主动行动，才能获得这个稳定，不能只是等待"。',
        exploration: '如果出现"隐者"（内省），不要说"你可能需要思考"，而要说"你的过度内省正在阻碍成长，必须将思考转化为行动"。',
      },
      '天机': {
        relationship: '如果出现"宝剑三"（痛苦），不要说"你可能感到痛苦"，而要说"你的过度思考正在放大痛苦，必须停止分析，直接感受"。',
        decision: '如果出现"权杖八"（快速），不要说"可能需要快速行动"，而要说"你的过度思考会错过时机，必须相信直觉，立即行动"。',
        prediction: '如果出现"星币一"（开始），不要说"可能会开始"，而要说"你的思考已经足够，现在必须停止思考，直接开始行动"。',
        exploration: '如果出现"愚者"（直觉），不要说"你可能需要直觉"，而要说"你的过度思考正在阻碍直觉，必须停止分析，相信第一感觉"。',
      },
      '紫微': {
        relationship: '如果出现"权杖七"（控制），不要说"你可能需要坚持"，而要说"你的控制欲正在破坏关系，必须学会放手，给对方空间"。',
        decision: '如果出现"星币四"（固守），不要说"你可能需要保持"，而要说"你的控制欲会让你固守现状，必须接受变化，放下控制"。',
        prediction: '如果出现"高塔"（突变），不要说"可能会有变化"，而要说"你的控制欲无法阻止这个变化，必须学会接受和适应"。',
        exploration: '如果出现"愚者"（放手），不要说"你可能需要冒险"，而要说"你的控制欲正在阻碍成长，必须学会放手，接受不确定性"。',
      },
    };
    
    return examples[mainStar]?.[intent] || '根据用户性格特质和问题类型，自动调整解读语气和重点。';
  }

  /**
   * 根据卡牌名称推断元素类型
   * 注意：这是一个简化的实现，实际应该从卡牌数据中获取元素信息
   */
  static inferCardElement(cardName: string): 'fire' | 'water' | 'air' | 'earth' | null {
    const lowerName = cardName.toLowerCase();
    
    // 权杖系列（Wands）→ 火元素
    if (lowerName.includes('wand') || lowerName.includes('权杖')) {
      return 'fire';
    }
    
    // 圣杯系列（Cups）→ 水元素
    if (lowerName.includes('cup') || lowerName.includes('圣杯')) {
      return 'water';
    }
    
    // 宝剑系列（Swords）→ 风元素
    if (lowerName.includes('sword') || lowerName.includes('宝剑')) {
      return 'air';
    }
    
    // 星币系列（Pentacles）→ 土元素
    if (lowerName.includes('pentacle') || lowerName.includes('星币') || lowerName.includes('coin')) {
      return 'earth';
    }
    
    // 大阿尔卡纳根据名称推断（简化逻辑）
    if (lowerName.includes('tower') || lowerName.includes('高塔') || 
        lowerName.includes('sun') || lowerName.includes('太阳') ||
        lowerName.includes('chariot') || lowerName.includes('战车')) {
      return 'fire';
    }
    
    if (lowerName.includes('moon') || lowerName.includes('月亮') ||
        lowerName.includes('star') || lowerName.includes('星星') ||
        lowerName.includes('temperance') || lowerName.includes('节制')) {
      return 'water';
    }
    
    if (lowerName.includes('justice') || lowerName.includes('正义') ||
        lowerName.includes('judgement') || lowerName.includes('审判')) {
      return 'air';
    }
    
    if (lowerName.includes('world') || lowerName.includes('世界') ||
        lowerName.includes('emperor') || lowerName.includes('皇帝') ||
        lowerName.includes('empress') || lowerName.includes('皇后')) {
      return 'earth';
    }
    
    return null;
  }

  /**
   * 计算能量分布
   */
  static calculateEnergyDistribution(cards?: TarotCardRequest[]): {
    fire: number;
    water: number;
    air: number;
    earth: number;
    total: number;
  } {
    const energyCount = {
      fire: 0,
      water: 0,
      air: 0,
      earth: 0,
    };

    if (cards && cards.length > 0) {
      cards.forEach(card => {
        const element = this.inferCardElement(card.name);
        if (element) {
          energyCount[element]++;
        }
      });
    }

    const total = energyCount.fire + energyCount.water + energyCount.air + energyCount.earth;

    return {
      ...energyCount,
      total,
    };
  }

  /**
   * 生成能量数据提示
   */
  static generateEnergyDataPrompt(cards?: TarotCardRequest[]): string {
    if (!cards || cards.length === 0) {
      return '';
    }

    const energyDist = this.calculateEnergyDistribution(cards);
    
    if (energyDist.total === 0) {
      return '';
    }

    const firePercent = Math.round((energyDist.fire / energyDist.total) * 100);
    const waterPercent = Math.round((energyDist.water / energyDist.total) * 100);
    const airPercent = Math.round((energyDist.air / energyDist.total) * 100);
    const earthPercent = Math.round((energyDist.earth / energyDist.total) * 100);

    let prompt = `\n## 🔥 能量分布数据（必须在解读中引用）\n\n`;
    prompt += `**元素统计**：\n`;
    prompt += `- 火元素（行动力）：${energyDist.fire}张（${firePercent}%）\n`;
    prompt += `- 水元素（情感/内省）：${energyDist.water}张（${waterPercent}%）\n`;
    prompt += `- 风元素（思维/沟通）：${energyDist.air}张（${airPercent}%）\n`;
    prompt += `- 土元素（务实/稳定）：${energyDist.earth}张（${earthPercent}%）\n\n`;
    
    prompt += `**⚠️ 重要要求**：\n`;
    prompt += `- 必须在解读中引用这些能量数据，解释能量分布如何印证牌阵含义\n`;
    prompt += `- 在 card_matrix 的 contextual_meaning 中，至少有一个逻辑组块必须引用能量数据\n`;
    prompt += `- 使用"从能量层面印证"、"能量分布显示"等话术\n\n`;
    
    prompt += `**话术示例**：\n`;
    if (energyDist.water > energyDist.fire) {
      prompt += `- "牌阵中水元素占比高达${waterPercent}%，而代表行动的火元素仅${energyDist.fire}张。这从能量层面印证了你当前的困局：情绪与内耗（水）淹没了行动力（火）。你需要'降水补火'，强制自己动起来。"\n`;
    }
    if (energyDist.fire > 0 && energyDist.water > 0) {
      prompt += `- "火元素（行动力）仅${energyDist.fire}张，而水元素（情感/内省）高达${energyDist.water}张。能量分布显示：你的行动力被过度的内省所消耗。"\n`;
    }

    return prompt;
  }

  static generateInstructionPrompt(intent: TarotIntent): string {
    return `# Core Task & Instructions
请遵循以下原则完成本次塔罗解读：

1. **能量定性**：[v2.1 Refined] 不要寻找矛盾，而是给出明确的能量流向判断
   - ❌ 禁止："你的意识想前进，潜意识想后退。"（模棱两可）
   - ✅ 要求："目前的能量流向非常明确——是阻滞的。即便你主观想推，客观环境也不支持。"（明确判断）
   - 如果能量是阻滞的，直接说"阻滞"；如果是顺畅的，直接说"顺畅"
   - 禁止使用"可能"、"或许"、"也许"等模糊词汇

2. **直断回答**：[v2.1 New] 必须用一句话直接回答用户的问题
   - 关系型问题："能/不能"、"是/不是"
   - 决策型问题："选A/选B"、"建议/不建议"
   - 预测型问题："会/不会"、"能/不能"
   - 探索型问题："是/不是"、"需要/不需要"

3. **情境化解牌**：[v2.2 优化版] 不要逐张牌解释，使用"逻辑组块"重组牌阵
   - ❌ 禁止：按 1, 2, 3... 的顺序逐张牌解释
   - ❌ 禁止：复述牌面关键词（用户已经看到了）
   - ❌ 禁止：写"第X张牌代表..."这种格式
   - ✅ 要求：将牌阵分为"核心冲突"、"时间流变"、"破局关键"三个逻辑块进行综合叙述
   - ✅ 要求：解释牌与牌之间的关联性，说明为什么得出这个结论
   - ✅ 要求：在至少一个逻辑组块中引用能量分布数据

4. **用牌面本身的象征说话**：引用牌面象征的来源
5. **第二人称叙事**：直接使用"你"、"当你看到这张牌时"
6. **直接有力**：每句话都要有信息量，不要为了凑字数而说废话
7. **去AI化文风**：禁止使用"综上所述"、"建议如下"等AI腔
8. **行动导向**：告诉用户"接下来24小时/3天内该做什么"的具体指引`;
  }

  static generateOutputFormatPrompt(cards?: TarotCardRequest[]): string {
    let prompt = `# Output Format
请严格按照以下JSON格式返回内容，必须包含以下核心部分：

{
  "intent": "relationship" | "decision" | "prediction" | "exploration",
  "verdict": {
    "direct_answer": {
      "verdict": "string",
      "tone": "gentle" | "neutral" | "direct",
      "buffered_version": "string"
    },
    "core_card": "string",
    "energy_level": "low" | "medium" | "high",
    "energy_label": "string",
    "headline": "string",
    "summary": "string",
    "energy_assessment": {
      "current_state": "阻滞" | "顺畅" | "波动",
      "trend": "improving" | "stable" | "declining",
      "dimension": "overall" | "emotional" | "practical" | "spiritual",
      "description": "string"
    },
    "fortune_stage": {
      "stage_name": "string",
      "stage_description": "string",
      "trend": "短期阻滞，长期顺畅" | "短期顺畅，长期阻滞" | "整体顺畅" | "整体阻滞" | "波动中上升" | "波动中下降"
    }
  },
  "card_matrix": [
    {
      "position": "string",
      "card": "string",
      "connection_type": "support" | "conflict" | "neutral",
      "contextual_meaning": "string"
    }
  ],
  "soul_action": {
    "title": "string",
    "simple_version": {
      "action": "string",
      "duration": "string"
    },
    "full_version": {
      "steps": [
        {
          "step": number,
          "action": "string",
          "duration": "string",
          "items": string[],
          "energy_meaning": "string"
        }
      ]
    }
  }
}`;

    // ✅ 新增：如果提供了卡牌信息，强调必须使用实际卡牌
    if (cards && cards.length > 0) {
      prompt += `\n\n**⚠️ 重要提示**：\n`;
      prompt += `- card_matrix 中的卡牌名称必须使用用户实际抽到的卡牌（英文名，如 "The Tower"）\n`;
      prompt += `- card_matrix 中的 position 必须与用户抽到的卡牌位置完全一致\n`;
      prompt += `- card_matrix 的数量必须等于用户抽到的卡牌数量（${cards.length} 张）\n`;
      prompt += `- 不能自己抽牌，必须基于用户提供的卡牌进行解读\n`;
      prompt += `- core_card 必须从用户实际抽到的卡牌中选择\n`;
      prompt += `- card_matrix 的解读必须使用"逻辑组块"方式，不要逐张牌解释\n`;
      prompt += `- 在 card_matrix 的 contextual_meaning 中，至少有一个逻辑组块必须引用能量分布数据\n`;
    }

    return prompt;
  }

  static generateSpreadPrompt(spread?: TarotSpread, cards?: TarotCardRequest[]): string {
    if (!spread || !cards || cards.length === 0) {
      return '';
    }

    let prompt = `\n# 🎴 牌阵信息\n`;
    prompt += `**牌阵名称**：${spread.chineseName} (${spread.name})\n`;
    prompt += `**牌阵描述**：${spread.description}\n`;
    prompt += `**位置数量**：${spread.positionCount}\n\n`;
    
    prompt += `## 📋 抽到的卡牌\n`;
    prompt += `以下是用户实际抽到的卡牌，**必须**基于这些卡牌进行解读：\n\n`;
    
    cards.forEach((card, index) => {
      const orientationText = card.orientation === 'reversed' ? '逆位' : '正位';
      prompt += `${index + 1}. **${card.position}** (位置 ${card.positionIndex + 1})\n`;
      prompt += `   - 卡牌：${card.chineseName} (${card.name})\n`;
      prompt += `   - 正逆位：${orientationText}\n`;
      prompt += `\n`;
    });
    
    prompt += `**重要**：\n`;
    prompt += `- 你必须基于以上**实际抽到的卡牌**进行解读，不能自己抽牌\n`;
    prompt += `- 解读时必须结合每张卡牌的**位置**和**正逆位**信息\n`;
    prompt += `- card_matrix 中的卡牌名称必须与以上卡牌完全一致（使用英文名，如 "${cards[0]?.name || 'The Tower'}"）\n`;
    prompt += `- 如果牌阵有 ${spread.positionCount} 张牌，card_matrix 必须包含 ${spread.positionCount} 条记录\n`;
    
    // ✅ 新增：明确卡牌名称格式要求
    prompt += `\n**⚠️ 卡牌名称格式要求**：\n`;
    prompt += `- 大牌（Major Arcana）：\n`;
    prompt += `  - 带"The"前缀：The Fool, The Magician, The Tower, The Star, The Moon, The Sun, The World, The Hermit, The Hanged Man, The Hierophant, The High Priestess, The Empress, The Emperor, The Lovers, The Chariot, The Devil\n`;
    prompt += `  - 不带"The"前缀：Strength, Wheel of Fortune, Justice, Death, Temperance, Judgement\n`;
    prompt += `- 小牌（Minor Arcana）：格式为 "[Number] of [Suit]"，不带"The"前缀\n`;
    prompt += `  - 示例：Ace of Wands, Two of Cups, King of Swords, Queen of Pentacles\n`;
    prompt += `  - ❌ 错误格式："The Eight of Cups"（小牌不能带The）\n`;
    prompt += `  - ✅ 正确格式："Eight of Cups"\n`;
    prompt += `- 必须与前端标准格式完全一致，不能添加或删除"The"前缀\n`;
    
    return prompt;
  }

  static async generatePrompt(params: TarotPromptParams): Promise<string> {
    const { question, userContext, implicitTraits, ziweiProfile, spread, cards } = params;
    
    const intent = this.identifyIntent(question);
    
    let prompt = `# 用户问题\n${question}\n`;
    
    // ✅ 新增：添加牌阵和卡牌信息
    const spreadPrompt = this.generateSpreadPrompt(spread, cards);
    if (spreadPrompt) {
      prompt += spreadPrompt;
    }
    
    // ✅ 新增：添加能量分布数据
    const energyDataPrompt = this.generateEnergyDataPrompt(cards);
    if (energyDataPrompt) {
      prompt += energyDataPrompt;
    }
    
    const contextPrompt = this.generateContextPrompt(userContext, implicitTraits, intent);
    if (contextPrompt) {
      prompt += contextPrompt;
    }
    
    if (ziweiProfile?.mainStar) {
      const connectionPrompt = this.generateConnectionPrompt(ziweiProfile, intent);
      prompt += connectionPrompt;
    }
    
    const instructionPrompt = this.generateInstructionPrompt(intent);
    prompt += `\n${instructionPrompt}\n`;
    
    const outputFormatPrompt = this.generateOutputFormatPrompt(cards);
    prompt += `\n${outputFormatPrompt}\n`;
    
    return prompt;
  }
}

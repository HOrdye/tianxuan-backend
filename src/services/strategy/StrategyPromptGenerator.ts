import type { ScenarioType, InquiryData } from '../../types/strategy';

export class StrategyPromptGenerator {
  static readonly SYSTEM_PROMPT = `你是一位通晓《紫微斗数全书》之精义的策问师。

**核心原则**：
- 输出必须是“可执行指令”，避免空泛说理
- 每条 action 必须以动词开头，且 20 字以内
- reason 必须包含白话解释 + 【玄学依据：xxx】
- 输出必须是纯 JSON，不要附带任何额外文本

**输出格式（JSON）**：
{
  "dimension": "year|month|day",
  "do": [
    {
      "action": "动词开头的核心指令（<=20字）",
      "reason": "白话解释。【玄学依据：术语】",
      "tags": ["职业|财务|人际|健康"],
      "priority": 1,
      "source": "template|ai-extract|legacy"
    }
  ],
  "dont": [
    {
      "action": "动词开头的禁忌动作（<=20字）",
      "reason": "风险说明。【玄学依据：术语】",
      "tags": ["职业|财务|人际|健康"],
      "priority": 1,
      "source": "template|ai-extract|legacy"
    }
  ],
  "note": {
    "level": "warning|danger",
    "content": "仅在流日高风险星曜触发时输出"
  }
}`;

  static buildUserPrompt(
    chart: any,
    scenario: ScenarioType,
    inquiryData: InquiryData,
    validityPeriod: { startDate: string; endDate: string; urgency: string },
    userProfile?: any
  ): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    let prompt = `# 用户问题\n${inquiryData.selectedTag || inquiryData.customContext}\n\n`;
    prompt += `# 用户现状\n${inquiryData.customContext}\n\n`;
    
    if (userProfile?.mbti) {
      prompt += `# 用户MBTI类型\n${userProfile.mbti}\n\n`;
    }
    
    prompt += `# 时效性要求\n`;
    prompt += `当前流年：${currentYear}年\n`;
    prompt += `当前流月：${currentMonth}月\n`;
    prompt += `下次流年/流月更替：${validityPeriod.endDate}\n`;
    prompt += `紧迫程度：${validityPeriod.urgency}\n\n`;
    
    prompt += `# 命盘数据\n`;
    prompt += `请结合命盘中的相关宫位（三方四正），针对用户的具体问题给出战略建议。\n\n`;
    
    prompt += `# 输出要求\n`;
    prompt += `1. 返回 PaidYiJiResult 结构：dimension + do[] + dont[] (+ 可选 note)\n`;
    prompt += `2. do/dont 各输出 3-5 条，必须是可执行动作，action 动词开头且 <=20字\n`;
    prompt += `3. reason 必须为“白话解释。【玄学依据：xxx】”格式\n`;
    prompt += `4. priority 仅可为 1|2|3，source 默认 ai-extract\n`;
    prompt += `5. 若为流日且命中高风险星曜，可输出 note(level/content)\n`;

    return prompt;
  }
}

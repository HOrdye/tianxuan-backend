import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';

export type ContextIntent = 'career' | 'love' | 'wealth' | 'health' | 'decision' | 'prediction' | 'general';

/**
 * Token 估算函数（v2.0优化版）
 * 针对中文优化：1 汉字 ≈ 1.7 Tokens
 * 英文：1 单词 ≈ 1.3 Tokens
 * 其他字符：0.5 Tokens/字符
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  const otherChars = text.length - chineseChars - text.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).join('').length;
  
  return Math.ceil(chineseChars * 1.7 + englishWords * 1.3 + otherChars * 0.5);
}

/**
 * 压缩用户上下文数据，确保不超过 Token 限制
 */
export class ContextCompressor {
  /**
   * 压缩用户上下文和隐性特征（v2.0：支持意图驱动的动态优先级）
   * @param userContext 用户显性上下文数据
   * @param implicitTraits 隐性特征（可选）
   * @param maxTokens Token 限制
   * @param depth 注入深度
   * @param contextIntent 上下文意图（可选，用于动态调整字段优先级）
   */
  static compress(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits,
    maxTokens: number = 200,
    depth: 'basic' | 'standard' | 'deep' = 'standard',
    contextIntent?: ContextIntent
  ): string {
    const parts: string[] = [];

    if (depth === 'basic') {
      parts.push(this.formatBasicContext(userContext, contextIntent));
    } else if (depth === 'standard') {
      parts.push(this.formatStandardContext(userContext, contextIntent));
    } else {
      parts.push(this.formatStandardContext(userContext, contextIntent));
      if (implicitTraits) {
        parts.push(this.formatImplicitTraits(implicitTraits, contextIntent));
      }
    }

    let result = parts.join('\n\n');
    let currentTokens = estimateTokens(result);

    if (currentTokens <= maxTokens) {
      return result;
    }

    return this.truncateByPriority(result, maxTokens, contextIntent);
  }

  /**
   * 获取字段优先级（根据意图动态调整）
   */
  private static getFieldPriority(contextIntent?: ContextIntent): string[] {
    if (!contextIntent) {
      return ['birthDate', 'mbti', 'profession', 'currentStatus', 'identity', 'wishes', 'energyLevel'];
    }

    const priorityMap: Record<ContextIntent, string[]> = {
      love: ['mbti', 'currentStatus', 'identity', 'birthDate', 'profession', 'wishes', 'energyLevel'],
      career: ['profession', 'currentStatus', 'mbti', 'identity', 'wishes', 'birthDate', 'energyLevel'],
      wealth: ['currentStatus', 'profession', 'mbti', 'wishes', 'identity', 'birthDate', 'energyLevel'],
      health: ['birthDate', 'currentStatus', 'energyLevel', 'mbti', 'profession', 'identity', 'wishes'],
      decision: ['currentStatus', 'mbti', 'profession', 'identity', 'wishes', 'birthDate', 'energyLevel'],
      prediction: ['currentStatus', 'birthDate', 'mbti', 'profession', 'identity', 'wishes', 'energyLevel'],
      general: ['birthDate', 'mbti', 'profession', 'currentStatus', 'identity', 'wishes', 'energyLevel'],
    };

    return priorityMap[contextIntent] || priorityMap.general;
  }

  /**
   * 格式化基础上下文（仅关键信息，v2.0：支持意图驱动）
   */
  private static formatBasicContext(context: UserContextData, contextIntent?: ContextIntent): string {
    const parts: string[] = [];
    const priority = this.getFieldPriority(contextIntent);

    for (const field of priority) {
      if (field === 'birthDate' && context.birthDate) {
        parts.push(`出生日期：${context.birthDate}`);
      } else if (field === 'mbti' && context.mbti) {
        parts.push(`MBTI：${context.mbti}`);
      } else if (field === 'profession' && context.profession) {
        parts.push(`职业：${context.profession}`);
      }
      
      if (parts.length >= 3) break;
    }

    return parts.join('；') || '用户信息待完善';
  }

  /**
   * 格式化标准上下文（完整显性信息，v2.0：支持意图驱动）
   */
  private static formatStandardContext(context: UserContextData, contextIntent?: ContextIntent): string {
    const parts: string[] = [];
    const priority = this.getFieldPriority(contextIntent);

    for (const field of priority) {
      if (field === 'birthDate' && context.birthDate) {
        parts.push(`出生日期：${context.birthDate}`);
      } else if (field === 'mbti' && context.mbti) {
        parts.push(`MBTI人格类型：${context.mbti}`);
      } else if (field === 'profession' && context.profession) {
        parts.push(`职业：${context.profession}`);
      } else if (field === 'currentStatus' && context.currentStatus) {
        parts.push(`当前现状：${context.currentStatus}`);
      } else if (field === 'wishes' && context.wishes && context.wishes.length > 0) {
        parts.push(`愿景目标：${context.wishes.join('、')}`);
      } else if (field === 'identity' && context.identity) {
        parts.push(`核心身份：${context.identity}`);
      } else if (field === 'energyLevel' && context.energyLevel) {
        const energyMap: Record<string, string> = {
          strong: '高能量',
          balanced: '平衡',
          weak: '低能量',
        };
        parts.push(`能量状态：${energyMap[context.energyLevel] || context.energyLevel}`);
      }
    }

    return parts.join('\n') || '用户信息待完善';
  }

  /**
   * 格式化隐性特征（v2.0：支持意图驱动）
   */
  private static formatImplicitTraits(traits: ImplicitTraits, contextIntent?: ContextIntent): string {
    const parts: string[] = [];

    if (traits.inferred_roles && traits.inferred_roles.length > 0) {
      parts.push(`推断角色：${traits.inferred_roles.join('、')}`);
    }
    if (traits.interest_tags && traits.interest_tags.length > 0) {
      parts.push(`关注点：${traits.interest_tags.join('、')}`);
    }
    if (traits.risk_tolerance) {
      const riskMap: Record<string, string> = {
        low: '低风险偏好',
        medium: '中等风险偏好',
        high: '高风险偏好',
      };
      parts.push(`风险偏好：${riskMap[traits.risk_tolerance] || traits.risk_tolerance}`);
    }
    if (traits.interaction_style) {
      const styleMap: Record<string, string> = {
        concise: '简洁',
        detailed: '详细',
      };
      parts.push(`交互风格：${styleMap[traits.interaction_style] || traits.interaction_style}`);
    }
    if (traits.family_structure) {
      const family = traits.family_structure;
      const familyParts: string[] = [];
      if (family.has_spouse) familyParts.push('有配偶');
      if (family.has_children) {
        familyParts.push(`有${family.children_count || 0}个孩子`);
      }
      if (familyParts.length > 0) {
        parts.push(`家庭结构：${familyParts.join('，')}`);
      }
    }
    if (traits.profession_hints && traits.profession_hints.length > 0) {
      parts.push(`职业线索：${traits.profession_hints.join('、')}`);
    }

    return parts.length > 0 ? `隐性特征：\n${parts.join('\n')}` : '';
  }

  /**
   * 按优先级截断文本以适应 Token 限制（v2.0：智能截断）
   */
  private static truncateByPriority(text: string, maxTokens: number, contextIntent?: ContextIntent): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = estimateTokens(line);
      if (currentTokens + lineTokens <= maxTokens) {
        result.push(line);
        currentTokens += lineTokens;
      } else {
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 10) {
          const truncated = this.truncateLine(line, remainingTokens);
          result.push(truncated);
        }
        break;
      }
    }

    return result.join('\n');
  }

  /**
   * 截断单行文本
   */
  private static truncateLine(line: string, maxTokens: number): string {
    const chars = Math.floor(maxTokens * 4);
    if (line.length <= chars) {
      return line;
    }
    return line.substring(0, chars - 3) + '...';
  }
}

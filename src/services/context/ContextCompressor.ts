import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';

/**
 * Token 估算函数（简单版本）
 * 使用近似算法：1 token ≈ 4 个字符（中文）或 0.75 个单词（英文）
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0).length;
  return Math.ceil(chineseChars / 4 + englishWords * 0.75);
}

/**
 * 压缩用户上下文数据，确保不超过 Token 限制
 */
export class ContextCompressor {
  /**
   * 压缩用户上下文和隐性特征
   * @param userContext 用户显性上下文数据
   * @param implicitTraits 隐性特征（可选）
   * @param maxTokens Token 限制
   * @param depth 注入深度
   */
  static compress(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits,
    maxTokens: number = 200,
    depth: 'basic' | 'standard' | 'deep' = 'standard'
  ): string {
    const parts: string[] = [];

    if (depth === 'basic') {
      parts.push(this.formatBasicContext(userContext));
    } else if (depth === 'standard') {
      parts.push(this.formatStandardContext(userContext));
    } else {
      parts.push(this.formatStandardContext(userContext));
      if (implicitTraits) {
        parts.push(this.formatImplicitTraits(implicitTraits));
      }
    }

    let result = parts.join('\n\n');
    let currentTokens = estimateTokens(result);

    if (currentTokens <= maxTokens) {
      return result;
    }

    return this.truncateToFit(result, maxTokens);
  }

  /**
   * 格式化基础上下文（仅关键信息）
   */
  private static formatBasicContext(context: UserContextData): string {
    const parts: string[] = [];

    if (context.birthDate) {
      parts.push(`出生日期：${context.birthDate}`);
    }
    if (context.mbti) {
      parts.push(`MBTI：${context.mbti}`);
    }
    if (context.profession) {
      parts.push(`职业：${context.profession}`);
    }

    return parts.join('；') || '用户信息待完善';
  }

  /**
   * 格式化标准上下文（完整显性信息）
   */
  private static formatStandardContext(context: UserContextData): string {
    const parts: string[] = [];

    if (context.birthDate) {
      parts.push(`出生日期：${context.birthDate}`);
    }
    if (context.mbti) {
      parts.push(`MBTI人格类型：${context.mbti}`);
    }
    if (context.profession) {
      parts.push(`职业：${context.profession}`);
    }
    if (context.currentStatus) {
      parts.push(`当前现状：${context.currentStatus}`);
    }
    if (context.wishes && context.wishes.length > 0) {
      parts.push(`愿景目标：${context.wishes.join('、')}`);
    }
    if (context.identity) {
      parts.push(`核心身份：${context.identity}`);
    }
    if (context.energyLevel) {
      const energyMap: Record<string, string> = {
        strong: '高能量',
        balanced: '平衡',
        weak: '低能量',
      };
      parts.push(`能量状态：${energyMap[context.energyLevel] || context.energyLevel}`);
    }

    return parts.join('\n') || '用户信息待完善';
  }

  /**
   * 格式化隐性特征
   */
  private static formatImplicitTraits(traits: ImplicitTraits): string {
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
   * 截断文本以适应 Token 限制
   */
  private static truncateToFit(text: string, maxTokens: number): string {
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

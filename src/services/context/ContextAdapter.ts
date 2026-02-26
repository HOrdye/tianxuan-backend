import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';
import { FeatureType } from './ContextInjector';

/**
 * 为不同功能适配上下文格式
 */
export class ContextAdapter {
  /**
   * 为特定功能适配上下文格式
   */
  static adaptContextForFeature(
    featureType: FeatureType,
    context: {
      userContext: Partial<UserContextData>;
      implicitTraits?: Partial<ImplicitTraits>;
    }
  ): string {
    switch (featureType) {
      case 'ziwei':
        return this.formatForZiwei(context);
      case 'tarot':
        return this.formatForTarot(context);
      case 'yijing':
        return this.formatForYijing(context);
      case 'triple':
        return this.formatForTriple(context);
      case 'dilemma':
        return this.formatForDilemma(context);
      default:
        return this.formatDefault(context);
    }
  }

  /**
   * 紫微斗数格式
   */
  private static formatForZiwei(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    if (context.userContext.birthDate) {
      parts.push(`【生辰】${context.userContext.birthDate}`);
    }
    if (context.userContext.identity) {
      parts.push(`【命格】${context.userContext.identity}`);
    }
    if (context.userContext.mbti) {
      parts.push(`【人格】${context.userContext.mbti}`);
    }
    if (context.userContext.energyLevel) {
      const energyMap: Record<string, string> = {
        strong: '高能量',
        balanced: '平衡',
        weak: '低能量',
      };
      parts.push(`【能量】${energyMap[context.userContext.energyLevel] || context.userContext.energyLevel}`);
    }

    return parts.join(' | ') || '用户信息待完善';
  }

  /**
   * 塔罗牌格式
   */
  private static formatForTarot(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    if (context.userContext.currentStatus) {
      parts.push(`现状：${context.userContext.currentStatus}`);
    }
    if (context.userContext.wishes && context.userContext.wishes.length > 0) {
      parts.push(`愿景：${context.userContext.wishes.join('、')}`);
    }
    if (context.implicitTraits?.interest_tags && context.implicitTraits.interest_tags.length > 0) {
      parts.push(`关注：${context.implicitTraits.interest_tags.join('、')}`);
    }

    return parts.join('\n') || '用户信息待完善';
  }

  /**
   * 易经格式
   */
  private static formatForYijing(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    if (context.userContext.profession) {
      parts.push(`职业：${context.userContext.profession}`);
    }
    if (context.userContext.currentStatus) {
      parts.push(`现状：${context.userContext.currentStatus}`);
    }
    if (context.implicitTraits?.risk_tolerance) {
      const riskMap: Record<string, string> = {
        low: '保守',
        medium: '稳健',
        high: '激进',
      };
      parts.push(`风险偏好：${riskMap[context.implicitTraits.risk_tolerance] || context.implicitTraits.risk_tolerance}`);
    }

    return parts.join('；') || '用户信息待完善';
  }

  /**
   * 三维决策格式
   */
  private static formatForTriple(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    if (context.userContext.birthDate) {
      parts.push(`出生：${context.userContext.birthDate}`);
    }
    if (context.userContext.profession) {
      parts.push(`职业：${context.userContext.profession}`);
    }
    if (context.userContext.currentStatus) {
      parts.push(`现状：${context.userContext.currentStatus}`);
    }
    if (context.userContext.wishes && context.userContext.wishes.length > 0) {
      parts.push(`目标：${context.userContext.wishes.join('、')}`);
    }
    if (context.implicitTraits?.family_structure) {
      const family = context.implicitTraits.family_structure;
      const familyParts: string[] = [];
      if (family.has_spouse) familyParts.push('有配偶');
      if (family.has_children) {
        familyParts.push(`有${family.children_count || 0}个孩子`);
      }
      if (familyParts.length > 0) {
        parts.push(`家庭：${familyParts.join('，')}`);
      }
    }

    return parts.join('\n') || '用户信息待完善';
  }

  /**
   * 困境分析格式
   */
  private static formatForDilemma(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    if (context.userContext.currentStatus) {
      parts.push(`当前困境：${context.userContext.currentStatus}`);
    }
    if (context.userContext.wishes && context.userContext.wishes.length > 0) {
      parts.push(`期望结果：${context.userContext.wishes.join('、')}`);
    }
    if (context.implicitTraits?.interest_tags && context.implicitTraits.interest_tags.length > 0) {
      parts.push(`关注领域：${context.implicitTraits.interest_tags.join('、')}`);
    }
    if (context.implicitTraits?.interaction_style) {
      const styleMap: Record<string, string> = {
        concise: '偏好简洁回答',
        detailed: '偏好详细分析',
      };
      parts.push(`交互偏好：${styleMap[context.implicitTraits.interaction_style] || context.implicitTraits.interaction_style}`);
    }

    return parts.join('\n') || '用户信息待完善';
  }

  /**
   * 默认格式
   */
  private static formatDefault(context: {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  }): string {
    const parts: string[] = [];

    Object.entries(context.userContext).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          parts.push(`${key}：${value.join('、')}`);
        } else {
          parts.push(`${key}：${value}`);
        }
      }
    });

    return parts.join('\n') || '用户信息待完善';
  }
}

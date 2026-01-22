import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';

export type FeatureType = 'ziwei' | 'tarot' | 'yijing' | 'triple' | 'dilemma';

/**
 * 根据功能类型选择相关的用户上下文信息
 */
export class ContextInjector {
  /**
   * 选择与功能相关的上下文信息
   */
  static selectRelevantContext(
    featureType: FeatureType,
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    switch (featureType) {
      case 'ziwei':
        return this.selectForZiwei(userContext, implicitTraits);
      case 'tarot':
        return this.selectForTarot(userContext, implicitTraits);
      case 'yijing':
        return this.selectForYijing(userContext, implicitTraits);
      case 'triple':
        return this.selectForTriple(userContext, implicitTraits);
      case 'dilemma':
        return this.selectForDilemma(userContext, implicitTraits);
      default:
        return { userContext, implicitTraits };
    }
  }

  /**
   * 紫微斗数相关上下文
   * 重点：生辰信息、身份标签、能量状态
   */
  private static selectForZiwei(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    return {
      userContext: {
        birthDate: userContext.birthDate,
        identity: userContext.identity,
        energyLevel: userContext.energyLevel,
        mbti: userContext.mbti,
      },
      implicitTraits: implicitTraits
        ? {
            risk_tolerance: implicitTraits.risk_tolerance,
            interaction_style: implicitTraits.interaction_style,
          }
        : undefined,
    };
  }

  /**
   * 塔罗牌相关上下文
   * 重点：当前现状、愿景目标、关注点
   */
  private static selectForTarot(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    return {
      userContext: {
        currentStatus: userContext.currentStatus,
        wishes: userContext.wishes,
        energyLevel: userContext.energyLevel,
      },
      implicitTraits: implicitTraits
        ? {
            interest_tags: implicitTraits.interest_tags,
            last_active_topic: implicitTraits.last_active_topic,
          }
        : undefined,
    };
  }

  /**
   * 易经相关上下文
   * 重点：职业、现状、风险偏好
   */
  private static selectForYijing(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    return {
      userContext: {
        profession: userContext.profession,
        currentStatus: userContext.currentStatus,
        mbti: userContext.mbti,
      },
      implicitTraits: implicitTraits
        ? {
            risk_tolerance: implicitTraits.risk_tolerance,
            profession_hints: implicitTraits.profession_hints,
          }
        : undefined,
    };
  }

  /**
   * 三维决策相关上下文
   * 重点：完整信息，包括家庭结构
   */
  private static selectForTriple(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    return {
      userContext: {
        ...userContext,
      },
      implicitTraits: implicitTraits
        ? {
            ...implicitTraits,
          }
        : undefined,
    };
  }

  /**
   * 困境分析相关上下文
   * 重点：现状、愿景、关注点、交互风格
   */
  private static selectForDilemma(
    userContext: UserContextData,
    implicitTraits?: ImplicitTraits
  ): {
    userContext: Partial<UserContextData>;
    implicitTraits?: Partial<ImplicitTraits>;
  } {
    return {
      userContext: {
        currentStatus: userContext.currentStatus,
        wishes: userContext.wishes,
        mbti: userContext.mbti,
      },
      implicitTraits: implicitTraits
        ? {
            interest_tags: implicitTraits.interest_tags,
            interaction_style: implicitTraits.interaction_style,
            last_active_topic: implicitTraits.last_active_topic,
          }
        : undefined,
    };
  }
}

import { getProfile } from '../user.service';
import { UserContextData, ImplicitTraits } from '../../types/user-digital-twin';
import { ContextCompressor } from './ContextCompressor';
import { ContextInjector, FeatureType } from './ContextInjector';
import { ContextAdapter } from './ContextAdapter';

/**
 * 用户上下文构建器
 * 将数据库 JSON 数据格式化为 LLM 易读的字符串
 */
export class ContextBuilder {
  /**
   * 构建用户上下文字符串（用于AI Prompt）
   * @param userId 用户ID
   * @param depth 注入深度
   * @param maxTokens Token限制
   */
  static async build(
    userId: string,
    depth: 'basic' | 'standard' | 'deep' = 'standard',
    maxTokens: number = 200
  ): Promise<string> {
    const profile = await getProfile(userId, false);
    if (!profile) {
      throw new Error('用户不存在');
    }

    const userContext: UserContextData = profile.preferences?.userContext || {};
    const implicitTraits: ImplicitTraits = (profile as any).implicit_traits || {};

    if (profile.birthday) {
      userContext.birthDate = profile.birthday;
    }

    return ContextCompressor.compress(userContext, implicitTraits, maxTokens, depth);
  }

  /**
   * 为不同功能构建适配的上下文
   * @param userId 用户ID
   * @param featureType 功能类型
   * @param maxTokens Token限制（可选）
   */
  static async buildForFeature(
    userId: string,
    featureType: FeatureType,
    maxTokens?: number
  ): Promise<string> {
    const profile = await getProfile(userId, false);
    if (!profile) {
      throw new Error('用户不存在');
    }

    const userContext: UserContextData = profile.preferences?.userContext || {};
    const implicitTraits: ImplicitTraits = (profile as any).implicit_traits || {};

    if (profile.birthday) {
      userContext.birthDate = profile.birthday;
    }

    const relevantContext = ContextInjector.selectRelevantContext(
      featureType,
      userContext,
      implicitTraits
    );

    const formatted = ContextAdapter.adaptContextForFeature(featureType, relevantContext);

    if (maxTokens) {
      return ContextCompressor.compress(
        relevantContext.userContext as UserContextData,
        relevantContext.implicitTraits,
        maxTokens,
        'standard'
      );
    }

    return formatted;
  }

  /**
   * 获取用户上下文数据（原始格式）
   * @param userId 用户ID
   */
  static async getUserContext(userId: string): Promise<{
    userContext: UserContextData;
    implicitTraits: ImplicitTraits;
  }> {
    const profile = await getProfile(userId, false);
    if (!profile) {
      throw new Error('用户不存在');
    }

    const userContext: UserContextData = profile.preferences?.userContext || {};
    const implicitTraits: ImplicitTraits = (profile as any).implicit_traits || {};

    if (profile.birthday) {
      userContext.birthDate = profile.birthday;
    }

    return {
      userContext,
      implicitTraits,
    };
  }
}

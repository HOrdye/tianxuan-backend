import { callLLM } from '../llm.service';
import { ImplicitTraits } from '../../types/user-digital-twin';
import { truncateImplicitTraits } from './TokenBreaker';

/**
 * 隐性信息提取服务
 * 使用轻量级 LLM 调用从用户查询和 AI 分析中提取隐性特征
 */
export class ImplicitTraitsExtractor {
  /**
   * 从用户查询和 AI 分析中提取隐性特征
   * @param userQuery 用户查询文本
   * @param aiAnalysis AI 分析结果
   * @returns 提取的隐性特征
   */
  static async extract(
    userQuery: string,
    aiAnalysis: string
  ): Promise<Partial<ImplicitTraits>> {
    const prompt = this.buildExtractionPrompt(userQuery, aiAnalysis);

    try {
      const response = await callLLM({
        prompt,
        systemPrompt: '你是一个专业的用户行为分析助手。请从对话中提取用户的隐性特征，并以JSON格式返回。',
        maxTokens: 500,
        temperature: 0.3,
      });

      return this.parseExtractionResult(response.content);
    } catch (error) {
      console.error('[ImplicitTraitsExtractor] 提取失败:', error);
      return {};
    }
  }

  /**
   * 构建提取提示词
   */
  private static buildExtractionPrompt(userQuery: string, aiAnalysis: string): string {
    return `请从以下对话中提取用户的隐性特征：

用户查询：
${userQuery}

AI 分析：
${aiAnalysis}

请提取以下信息（如果存在）：
1. inferred_roles: 推断的用户角色（如 parent, spouse, student, professional 等）
2. interest_tags: 关注点标签（如 wealth, career, relationship, health 等）
3. risk_tolerance: 风险偏好（low, medium, high）
4. interaction_style: 交互风格（concise, detailed）
5. last_active_topic: 最近关注的话题
6. family_structure: 家庭结构（has_spouse, has_children, children_count）
7. profession_hints: 职业线索（如 tech, finance, education 等）

请以 JSON 格式返回，只包含有值的字段。例如：
{
  "inferred_roles": ["parent", "professional"],
  "interest_tags": ["career", "wealth"],
  "risk_tolerance": "medium",
  "interaction_style": "detailed"
}`;
  }

  /**
   * 解析提取结果
   */
  private static parseExtractionResult(content: string): Partial<ImplicitTraits> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const result: Partial<ImplicitTraits> = {};

      if (parsed.inferred_roles && Array.isArray(parsed.inferred_roles)) {
        result.inferred_roles = parsed.inferred_roles.slice(0, 3);
      }
      if (parsed.interest_tags && Array.isArray(parsed.interest_tags)) {
        result.interest_tags = parsed.interest_tags.slice(0, 5);
      }
      if (['low', 'medium', 'high'].includes(parsed.risk_tolerance)) {
        result.risk_tolerance = parsed.risk_tolerance as 'low' | 'medium' | 'high';
      }
      if (['concise', 'detailed'].includes(parsed.interaction_style)) {
        result.interaction_style = parsed.interaction_style as 'concise' | 'detailed';
      }
      if (parsed.last_active_topic && typeof parsed.last_active_topic === 'string') {
        result.last_active_topic = parsed.last_active_topic;
      }
      if (parsed.family_structure && typeof parsed.family_structure === 'object') {
        result.family_structure = {
          has_spouse: Boolean(parsed.family_structure.has_spouse),
          has_children: Boolean(parsed.family_structure.has_children),
          children_count: Number(parsed.family_structure.children_count) || 0,
        };
      }
      if (parsed.profession_hints && Array.isArray(parsed.profession_hints)) {
        result.profession_hints = parsed.profession_hints.slice(0, 3);
      }

      return truncateImplicitTraits(result);
    } catch (error) {
      console.error('[ImplicitTraitsExtractor] 解析失败:', error);
      return {};
    }
  }
}

import { ImplicitTraits } from '../../types/user-digital-twin';

/**
 * Token 熔断机制
 * 限制隐性信息长度，防止 Token 爆炸
 */
export const MAX_IMPLICIT_TRAITS_TOKENS = 200;

/**
 * 截断隐性特征，确保不超过 Token 限制
 */
export function truncateImplicitTraits(traits: Partial<ImplicitTraits>): Partial<ImplicitTraits> {
  const truncated: Partial<ImplicitTraits> = { ...traits };

  if (truncated.inferred_roles && truncated.inferred_roles.length > 3) {
    truncated.inferred_roles = truncated.inferred_roles.slice(0, 3);
  }
  if (truncated.interest_tags && truncated.interest_tags.length > 5) {
    truncated.interest_tags = truncated.interest_tags.slice(0, 5);
  }
  if (truncated.profession_hints && truncated.profession_hints.length > 3) {
    truncated.profession_hints = truncated.profession_hints.slice(0, 3);
  }

  if (truncated.family_structure) {
    truncated.family_structure = {
      has_spouse: truncated.family_structure.has_spouse,
      has_children: truncated.family_structure.has_children,
      children_count: Math.min(truncated.family_structure.children_count || 0, 10),
    };
  }

  if (truncated.last_active_topic && truncated.last_active_topic.length > 50) {
    truncated.last_active_topic = truncated.last_active_topic.substring(0, 50);
  }

  return truncated;
}

/**
 * 估算隐性特征的 Token 数量
 */
export function estimateImplicitTraitsTokens(traits: Partial<ImplicitTraits>): number {
  let tokens = 0;

  if (traits.inferred_roles) {
    tokens += traits.inferred_roles.join(',').length / 4;
  }
  if (traits.interest_tags) {
    tokens += traits.interest_tags.join(',').length / 4;
  }
  if (traits.profession_hints) {
    tokens += traits.profession_hints.join(',').length / 4;
  }
  if (traits.risk_tolerance) {
    tokens += 2;
  }
  if (traits.interaction_style) {
    tokens += 2;
  }
  if (traits.last_active_topic) {
    tokens += traits.last_active_topic.length / 4;
  }
  if (traits.family_structure) {
    tokens += 10;
  }

  return Math.ceil(tokens);
}

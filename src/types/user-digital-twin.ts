export interface UserContextData {
  mbti?: string;
  currentStatus?: string;
  identity?: string;
  profession?: string;
  wishes?: string[];
  energyLevel?: 'strong' | 'weak' | 'balanced';
  birthDate?: string;
}

export interface ImplicitTraits {
  inferred_roles?: string[];
  interest_tags?: string[];
  risk_tolerance?: 'low' | 'medium' | 'high';
  interaction_style?: 'concise' | 'detailed';
  last_active_topic?: string;
  family_structure?: {
    has_spouse?: boolean;
    has_children?: boolean;
    children_count?: number;
  };
  profession_hints?: string[];
}

export interface CompletenessBreakdown {
  birthData: { filled: boolean; score: number; maxScore: number };
  mbti: { filled: boolean; score: number; maxScore: number };
  profession: { filled: boolean; score: number; maxScore: number };
  currentStatus: { filled: boolean; score: number; maxScore: number };
  wishes: { filled: boolean; score: number; maxScore: number };
}

export interface CompletenessResult {
  completeness: number;
  breakdown: CompletenessBreakdown;
  nextRewardThreshold?: number;
}

export interface RewardEvent {
  type: 'COIN_GRANTED' | 'COMPLETENESS_INCREASED' | 'THRESHOLD_REACHED';
  coins?: number;
  reason: string;
  field?: string;
  threshold?: number;
}

export interface RewardRule {
  field: string;
  coins: number;
  reason: string;
}

export const REWARD_RULES: RewardRule[] = [
  { field: 'mbti', coins: 5, reason: '完善MBTI信息' },
  { field: 'profession', coins: 5, reason: '完善职业信息' },
  { field: 'currentStatus', coins: 5, reason: '完善现状描述' },
  { field: 'wishes', coins: 5, reason: '完善愿景目标' },
];

export const THRESHOLD_REWARDS: { threshold: number; coins: number; reason: string }[] = [
  { threshold: 30, coins: 10, reason: '资料完整度达到30%' },
  { threshold: 50, coins: 20, reason: '资料完整度达到50%' },
  { threshold: 70, coins: 30, reason: '资料完整度达到70%' },
  { threshold: 100, coins: 50, reason: '资料完整度达到100%' },
];

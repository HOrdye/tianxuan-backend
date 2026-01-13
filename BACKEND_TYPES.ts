/**
 * 后端类型定义 - 供前端使用
 * 
 * 使用说明：
 * 1. 将此文件复制到前端项目的类型定义目录（如 src/types/backend.d.ts）
 * 2. 所有接口都使用下划线命名（snake_case），与后端保持一致
 * 3. 这些类型定义与后端 Service 层完全一致
 */

// ============================================================================
// 1. 认证模块 (Auth Service)
// 文件位置：src/services/auth.service.ts
// ============================================================================

export interface User {
  id: string;
  email: string;
  encrypted_password: string;
  created_at: Date;
}

export interface LoginResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  username: string;
}

// ============================================================================
// 2. 支付模块 (Payment Service)
// 文件位置：src/services/payment.service.ts
// ============================================================================

export interface PaymentOrder {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  coins_amount: number | null;
  item_type: string | null;
  pack_type: string | null;
  description: string | null;
  operator_id: string | null;
  status: string | null;
  paid_at: Date | null;
  payment_provider: string | null;
  is_first_purchase: boolean | null;
  created_at: Date;
}

export interface CreateOrderResult {
  success: boolean;
  order_id: string;
  amount: number;       // 支付金额（人民币，单位：元）
  payment_url?: string; // 支付链接（可选，如果使用第三方支付会生成）
  message?: string;
  error?: string;
}

export interface PaymentCallbackResult {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  new_balance?: number;
}

// ============================================================================
// 3. 订阅模块 (Subscription Service)
// 文件位置：src/services/subscription.service.ts
// ============================================================================

export type Tier = 'free' | 'basic' | 'premium' | 'vip';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export interface Subscription {
  id: string;
  user_id: string;
  tier: Tier;
  status: SubscriptionStatus;
  started_at: Date;
  expires_at: Date | null;
  cancelled_at: Date | null;
  auto_renew: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionStatusResult {
  tier: Tier;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  features: Record<string, any>;
  isPremium: boolean;
}

export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeTier?: Tier;
}

export interface UsageResult {
  usage: number;
  limit: number;
  remaining: number;
}

// ============================================================================
// 4. 紫微斗数模块 (Astrology Service)
// 文件位置：src/services/astrology.service.ts
// ============================================================================

export interface StarChart {
  profile_id: string;
  chart_structure: any; // JSONB 类型，存储命盘结构数据
  brief_analysis_cache?: any; // JSONB 类型，存储简要分析缓存
  created_at: Date;
  updated_at: Date;
}

export interface SaveStarChartResult {
  success: boolean;
  message?: string;
  error?: string;
  profile_id?: string;
}

export interface UnlockedTimeAsset {
  id: string;
  user_id: string;
  profile_id: string;
  dimension: string;
  period_start: string; // date 类型
  period_end: string; // date 类型
  period_type: string;
  unlocked_at: Date;
  expires_at: Date;
  cost_coins: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TimespaceCache {
  id: string;
  user_id: string;
  profile_id: string;
  dimension: string;
  cache_key: string;
  cache_data: any; // JSONB 类型
  period_start: string; // date 类型
  period_end: string; // date 类型
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AnalysisSession {
  id: string;
  userId: string;
  profileId: string;
  sessionData: any; // JSONB 类型，存储分析会话数据
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveAnalysisSessionResult {
  success: boolean;
  message?: string;
  error?: string;
  sessionId?: string;
}

// ============================================================================
// 5. 标准 API 响应类型
// 文件位置：src/types/response.ts
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export type SuccessResponse<T = any> = Required<Pick<ApiResponse<T>, 'success' | 'data'>> & 
  Pick<ApiResponse<T>, 'message'>;

export type ErrorResponse = Required<Pick<ApiResponse, 'success' | 'error'>> & 
  Pick<ApiResponse, 'message'>;

export interface PaginatedResponse<T = any> extends ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {}

export interface ListResponse<T = any> extends ApiResponse<{
  items: T[];
  count: number;
}> {}

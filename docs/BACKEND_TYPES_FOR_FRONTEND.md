# 后端类型定义 - 供前端使用

本文档包含后端 Service 层的接口定义，前端可以直接复制使用。

**注意**：保留后端的下划线命名（snake_case），除非后端专门做了转换。

---

## 1. 认证模块 (Auth Service)

**文件位置**：`src/services/auth.service.ts`

### User 接口
```typescript
export interface User {
  id: string;
  email: string;
  encrypted_password: string;
  created_at: Date;
}
```

### LoginResult 接口
```typescript
export interface LoginResult {
  user: {
    id: string;
    email: string;
  };
  token: string;
}
```

### RegisterResult 接口（额外提供）
```typescript
export interface RegisterResult {
  userId: string;
  email: string;
  username: string;
}
```

---

## 2. 支付模块 (Payment Service)

**文件位置**：`src/services/payment.service.ts`

### PaymentOrder 接口
```typescript
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
```

### CreateOrderResult 接口
```typescript
export interface CreateOrderResult {
  success: boolean;
  order_id: string;
  amount: number;       // 支付金额（人民币，单位：元）
  payment_url?: string; // 支付链接（可选，如果使用第三方支付会生成）
  message?: string;
  error?: string;
}
```

### PaymentCallbackResult 接口（额外提供）
```typescript
export interface PaymentCallbackResult {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  new_balance?: number;
}
```

---

## 3. 订阅模块 (Subscription Service)

**文件位置**：`src/services/subscription.service.ts`

### Tier 类型
```typescript
/**
 * 会员等级类型（按数据库实际值定义）
 * - guest: 游客（未登录用户）
 * - explorer: 探索者（登录注册但未付费的用户）
 * - basic: 开悟者（基础会员）
 * - premium: 天命师（高级会员）
 * - vip: 玄机大师（VIP会员，待开发）
 */
export type Tier = 'guest' | 'explorer' | 'basic' | 'premium' | 'vip';
```

### SubscriptionStatus 类型（额外提供）
```typescript
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';
```

### Subscription 接口
```typescript
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
```

### SubscriptionStatusResult 接口（额外提供）
```typescript
export interface SubscriptionStatusResult {
  tier: Tier;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  features: Record<string, any>;
  isPremium: boolean;
}
```

### FeatureCheckResult 接口（额外提供）
```typescript
export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeTier?: Tier;
}
```

### UsageResult 接口（额外提供）
```typescript
export interface UsageResult {
  usage: number;
  limit: number;
  remaining: number;
}
```

---

## 4. 紫微斗数模块 (Astrology Service)

**文件位置**：`src/services/astrology.service.ts`

### StarChart 接口
```typescript
export interface StarChart {
  profile_id: string;
  chart_structure: any; // JSONB 类型，存储命盘结构数据
  brief_analysis_cache?: any; // JSONB 类型，存储简要分析缓存
  created_at: Date;
  updated_at: Date;
}
```

### SaveStarChartResult 接口（额外提供）
```typescript
export interface SaveStarChartResult {
  success: boolean;
  message?: string;
  error?: string;
  profile_id?: string;
}
```

### UnlockedTimeAsset 接口（额外提供）
```typescript
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
```

### TimespaceCache 接口（额外提供）
```typescript
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
```

---

## 5. 标准 API 响应类型（新增）

**文件位置**：`src/types/response.ts`

### ApiResponse 接口
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
```

### SuccessResponse 类型
```typescript
export type SuccessResponse<T = any> = Required<Pick<ApiResponse<T>, 'success' | 'data'>> & 
  Pick<ApiResponse<T>, 'message'>;
```

### ErrorResponse 类型
```typescript
export type ErrorResponse = Required<Pick<ApiResponse, 'success' | 'error'>> & 
  Pick<ApiResponse, 'message'>;
```

### PaginatedResponse 接口
```typescript
export interface PaginatedResponse<T = any> extends ApiResponse<{
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {}
```

### ListResponse 接口
```typescript
export interface ListResponse<T = any> extends ApiResponse<{
  items: T[];
  count: number;
}> {}
```

---

## 使用说明

1. **复制接口定义**：将上述接口定义复制到前端的类型定义文件中（如 `src/types/api.d.ts`）

2. **保留命名风格**：所有接口都使用下划线命名（snake_case），与后端保持一致

3. **类型导入**：前端可以直接使用这些类型进行类型检查和自动补全

4. **响应结构**：所有 API 响应都遵循 `ApiResponse<T>` 结构：
   - 成功：`{ success: true, data: T, message?: string }`
   - 失败：`{ success: false, error: string, message?: string }`

---

**最后更新**：2025年1月30日  
**维护者**：开发团队

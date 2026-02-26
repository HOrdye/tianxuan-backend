import { z } from 'zod';

/**
 * 时空导航决策看板 v2.0 — 类型定义与 Zod 校验
 */

// ============================================
// 错误码规范
// ============================================
export type ErrorCode =
  | 'ERR_INSUFFICIENT_FUNDS'
  | 'ERR_AI_TIMEOUT'
  | 'ERR_PROFILE_MISMATCH'
  | 'ERR_ALREADY_UNLOCKED'
  | 'ERR_PRICE_MISMATCH'
  | 'ERR_INVALID_SKU'
  | 'ERR_RATE_LIMIT'
  | 'ERR_UNAUTHORIZED';

// ============================================
// 情绪标签白名单
// ============================================
export const VALID_MOOD_TAGS = [
  'satisfied', 'anxious', 'surprised', 'calm', 'excited', 'frustrated',
] as const;

export type MoodTag = typeof VALID_MOOD_TAGS[number];

// ============================================
// 准确维度白名单
// ============================================
export const VALID_DIMENSIONS = ['yearly', 'monthly', 'daily'] as const;
export type AccurateDimension = typeof VALID_DIMENSIONS[number];

// ============================================
// 大限-流年化学反应标签
// ============================================
export const VALID_DECADE_YEAR_TAGS = [
  'key_sprint', 'defense', 'transition', 'harvest', 'dormant',
] as const;
export type DecadeYearTag = typeof VALID_DECADE_YEAR_TAGS[number];

// ============================================
// Zod Schemas
// ============================================

/** POST /api/fortune/checkin 请求体 */
export const CreateCheckinSchema = z.object({
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  profile_id: z.uuid('profile_id 必须是有效的 UUID'),
  accuracy_score: z.number().int().min(1).max(5),
  mood_tags: z.array(z.enum(VALID_MOOD_TAGS)).optional().default([]),
  note: z.string().max(500, '备注不超过500字').optional(),
  accurate_dimensions: z.array(z.enum(VALID_DIMENSIONS)).optional().default([]),
  checkin_tz: z.string().max(50).optional().default('Asia/Shanghai'),
});
export type CreateCheckinInput = z.infer<typeof CreateCheckinSchema>;

/** GET /api/fortune/checkin 查询参数 */
export const QueryCheckinSchema = z.object({
  profile_id: z.uuid('profile_id 必须是有效的 UUID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  range: z.enum(['week', 'month']).optional(),
});
export type QueryCheckinInput = z.infer<typeof QueryCheckinSchema>;

/** GET /api/fortune/yearly-comparison 查询参数 */
export const YearlyComparisonQuerySchema = z.object({
  profile_id: z.uuid('profile_id 必须是有效的 UUID'),
  year: z.coerce.number().int().min(1900).max(2200),
});
export type YearlyComparisonQuery = z.infer<typeof YearlyComparisonQuerySchema>;

/** PATCH /api/user/preferences 请求体 */
export const UpdatePreferencesSchema = z.object({
  geekMode: z.boolean().optional(),
  proMode: z.boolean().optional(),
  sidebarCollapsed: z.boolean().optional(),
}).strict();
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

/** GET /api/pricing/quote 查询参数 */
export const PricingQuoteQuerySchema = z.object({
  sku: z.string().min(1, 'sku 不能为空'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
});
export type PricingQuoteQuery = z.infer<typeof PricingQuoteQuerySchema>;

// ============================================
// 数据库行类型
// ============================================

export interface DailyCheckinRow {
  id: string;
  user_id: string;
  profile_id: string;
  checkin_date: string;
  checkin_tz: string;
  accuracy_score: number;
  mood_tags: MoodTag[];
  note: string | null;
  accurate_dimensions: AccurateDimension[];
  created_at: Date;
  updated_at: Date;
}

export interface YearlyComparisonRow {
  id: string;
  user_id: string;
  profile_id: string;
  current_year: number;
  previous_year: number;
  career_delta: number;
  wealth_delta: number;
  love_delta: number;
  summary: string | null;
  decade_year_tag: DecadeYearTag | null;
  algo_version: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferencesRow {
  id: string;
  user_id: string;
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// API 响应数据类型
// ============================================

export interface CheckinResponseData {
  id: string;
  checkin_date: string;
  is_new: boolean;
}

export interface CheckinListResponseData {
  checkins: DailyCheckinRow[];
  streak: number;
}

export interface YearlyComparisonResponseData {
  current_year: number;
  previous_year: number;
  career_delta: number;
  wealth_delta: number;
  love_delta: number;
  summary: string;
  decade_year_tag: string | null;
  is_cached: boolean;
}

export interface PreferencesData {
  geekMode: boolean;
  proMode: boolean;
  sidebarCollapsed: boolean;
  [key: string]: unknown;
}

export interface PricingQuoteData {
  sku: string;
  original_price: number;
  actual_price: number;
  discount_reason: string | null;
  discount_label: string | null;
}

// ============================================
// YOY 算法版本常量
// ============================================
export const CURRENT_ALGO_VERSION = 'v2.0-202602';

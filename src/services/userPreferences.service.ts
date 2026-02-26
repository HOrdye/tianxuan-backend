import { pool } from '../config/database';
import { PreferencesData, UpdatePreferencesInput } from '../types/fortune-v2';

/**
 * 用户偏好设置服务
 * 提供偏好的读取与更新（UPSERT）
 */

const DEFAULT_PREFERENCES: PreferencesData = {
  geekMode: false,
  proMode: false,
  sidebarCollapsed: false,
};

/**
 * 获取用户偏好设置（不存在则返回默认值）
 */
export async function getPreferences(userId: string): Promise<PreferencesData> {
  const { rows } = await pool.query(
    `SELECT preferences FROM user_preferences WHERE user_id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    return { ...DEFAULT_PREFERENCES };
  }

  const stored = rows[0].preferences as Record<string, unknown>;
  return {
    geekMode: typeof stored.geekMode === 'boolean' ? stored.geekMode : DEFAULT_PREFERENCES.geekMode,
    proMode: typeof stored.proMode === 'boolean' ? stored.proMode : DEFAULT_PREFERENCES.proMode,
    sidebarCollapsed: typeof stored.sidebarCollapsed === 'boolean' ? stored.sidebarCollapsed : DEFAULT_PREFERENCES.sidebarCollapsed,
    ...stored,
  };
}

/**
 * 更新用户偏好设置（UPSERT，局部合并）
 */
export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput
): Promise<{ updated: boolean }> {
  // 先获取现有偏好
  const current = await getPreferences(userId);

  // 合并更新（只更新传入的字段）
  const merged: Record<string, unknown> = { ...current };
  if (input.geekMode !== undefined) merged.geekMode = input.geekMode;
  if (input.proMode !== undefined) merged.proMode = input.proMode;
  if (input.sidebarCollapsed !== undefined) merged.sidebarCollapsed = input.sidebarCollapsed;

  await pool.query(
    `INSERT INTO user_preferences (user_id, preferences)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (user_id)
     DO UPDATE SET preferences = $2::jsonb, updated_at = NOW()`,
    [userId, JSON.stringify(merged)]
  );

  return { updated: true };
}

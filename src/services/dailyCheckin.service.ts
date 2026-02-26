import { pool } from '../config/database';
import {
  CreateCheckinInput,
  DailyCheckinRow,
  CheckinResponseData,
  CheckinListResponseData,
} from '../types/fortune-v2';

/**
 * 今日复盘打卡服务
 * 提供 UPSERT 打卡、查询打卡、计算连续天数等功能
 */

/**
 * IDOR 防护：校验 profile_id 归属当前用户
 * profile_id 可能是：
 *   1. 用户自身 profiles.id（等于 userId）
 *   2. profiles_archives 中的档案（通过 user_id 关联）
 */
async function verifyProfileOwnership(userId: string, profileId: string): Promise<boolean> {
  // 快捷路径：self profile
  if (profileId === userId) return true;

  const { rows } = await pool.query(
    'SELECT id FROM profiles_archives WHERE id = $1 AND user_id = $2',
    [profileId, userId]
  );
  if (rows.length > 0) return true;

  const { rows: archiveRows } = await pool.query(
    'SELECT id FROM ziwei_chart_archives WHERE id = $1 AND user_id = $2',
    [profileId, userId]
  );
  return archiveRows.length > 0;
}

/**
 * 创建或更新今日复盘打卡（幂等 UPSERT）
 */
export async function upsertCheckin(
  userId: string,
  input: CreateCheckinInput
): Promise<CheckinResponseData> {
  // IDOR 校验
  const isOwner = await verifyProfileOwnership(userId, input.profile_id);
  if (!isOwner) {
    const err = new Error('档案信息异常，profile_id 不属于当前用户');
    (err as any).code = 'ERR_PROFILE_MISMATCH';
    throw err;
  }

  const query = `
    INSERT INTO daily_checkins (
      user_id, profile_id, checkin_date, checkin_tz,
      accuracy_score, mood_tags, note, accurate_dimensions
    )
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
    ON CONFLICT (user_id, profile_id, checkin_date)
    DO UPDATE SET
      accuracy_score = EXCLUDED.accuracy_score,
      mood_tags = EXCLUDED.mood_tags,
      note = EXCLUDED.note,
      accurate_dimensions = EXCLUDED.accurate_dimensions,
      checkin_tz = EXCLUDED.checkin_tz,
      updated_at = NOW()
    RETURNING id, checkin_date,
      (xmax = 0) AS is_new
  `;

  const values = [
    userId,
    input.profile_id,
    input.checkin_date,
    input.checkin_tz ?? 'Asia/Shanghai',
    input.accuracy_score,
    JSON.stringify(input.mood_tags ?? []),
    input.note ?? null,
    input.accurate_dimensions ?? [],
  ];

  const { rows } = await pool.query(query, values);
  const row = rows[0];

  return {
    id: row.id,
    checkin_date: row.checkin_date,
    is_new: row.is_new,
  };
}

/**
 * 查询打卡记录
 */
export async function queryCheckins(
  userId: string,
  profileId: string,
  date?: string,
  range?: 'week' | 'month'
): Promise<CheckinListResponseData> {
  // IDOR 校验
  const isOwner = await verifyProfileOwnership(userId, profileId);
  if (!isOwner) {
    const err = new Error('档案信息异常，profile_id 不属于当前用户');
    (err as any).code = 'ERR_PROFILE_MISMATCH';
    throw err;
  }

  const baseDate = date || new Date().toISOString().slice(0, 10);

  let dateCondition: string;
  let params: any[];

  if (range === 'week') {
    dateCondition = `AND checkin_date BETWEEN ($3::date - INTERVAL '6 days') AND $3::date`;
    params = [userId, profileId, baseDate];
  } else if (range === 'month') {
    dateCondition = `AND checkin_date BETWEEN date_trunc('month', $3::date) AND (date_trunc('month', $3::date) + INTERVAL '1 month - 1 day')`;
    params = [userId, profileId, baseDate];
  } else {
    dateCondition = `AND checkin_date = $3::date`;
    params = [userId, profileId, baseDate];
  }

  const query = `
    SELECT id, user_id, profile_id, checkin_date, checkin_tz,
           accuracy_score, mood_tags, note, accurate_dimensions,
           created_at, updated_at
    FROM daily_checkins
    WHERE user_id = $1 AND profile_id = $2
    ${dateCondition}
    ORDER BY checkin_date DESC
  `;

  const { rows: checkins } = await pool.query(query, params);

  // 计算连续打卡天数
  const streak = await calculateStreak(userId, profileId);

  return { checkins, streak };
}

/**
 * 计算连续打卡天数（从今天往前回溯）
 */
async function calculateStreak(userId: string, profileId: string): Promise<number> {
  const query = `
    WITH dates AS (
      SELECT checkin_date
      FROM daily_checkins
      WHERE user_id = $1 AND profile_id = $2
      ORDER BY checkin_date DESC
    ),
    streaks AS (
      SELECT checkin_date,
             checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date DESC))::int AS grp
      FROM dates
    )
    SELECT COUNT(*) AS streak
    FROM streaks
    WHERE grp = (
      SELECT checkin_date - 1::int
      FROM dates
      LIMIT 1
    ) - 1 + 1
  `;

  // 简化实现：逐日回溯
  const simpleQuery = `
    SELECT checkin_date
    FROM daily_checkins
    WHERE user_id = $1 AND profile_id = $2
      AND checkin_date <= CURRENT_DATE
    ORDER BY checkin_date DESC
    LIMIT 365
  `;

  const { rows } = await pool.query(simpleQuery, [userId, profileId]);

  if (rows.length === 0) return 0;

  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const checkinDate = new Date(row.checkin_date);
    checkinDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (expectedDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (diffDays === 1 && streak === 0) {
      // 今天还没打卡，但昨天打了
      expectedDate.setDate(expectedDate.getDate() - 1);
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

import { pool } from '../config/database';
import {
  YearlyComparisonRow,
  YearlyComparisonResponseData,
  CURRENT_ALGO_VERSION,
} from '../types/fortune-v2';

/**
 * 年度同比 (YOY) 服务
 * 提供年度同比数据查询、计算、缓存功能
 */

/**
 * IDOR 防护：校验 profile_id 归属当前用户
 * profile_id 可能是：
 *   1. 用户自身 profiles.id（等于 userId）
 *   2. profiles_archives 中的档案（通过 user_id 关联）
 */
async function verifyProfileOwnership(userId: string, profileId: string): Promise<boolean> {
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
 * 获取年度同比数据（优先返回缓存，无缓存则计算）
 */
export async function getYearlyComparison(
  userId: string,
  profileId: string,
  year: number
): Promise<YearlyComparisonResponseData> {
  // IDOR 校验
  const isOwner = await verifyProfileOwnership(userId, profileId);
  if (!isOwner) {
    const err = new Error('档案信息异常，profile_id 不属于当前用户');
    (err as any).code = 'ERR_PROFILE_MISMATCH';
    throw err;
  }

  // 1. 尝试从缓存获取（且算法版本匹配）
  const cached = await getCachedComparison(userId, profileId, year);
  if (cached) {
    return {
      current_year: cached.current_year,
      previous_year: cached.previous_year,
      career_delta: cached.career_delta,
      wealth_delta: cached.wealth_delta,
      love_delta: cached.love_delta,
      summary: cached.summary || '暂无同比结论',
      decade_year_tag: cached.decade_year_tag,
      is_cached: true,
    };
  }

  // 2. 无缓存 → 计算
  const computed = await computeYearlyComparison(userId, profileId, year);

  // 3. 写入缓存（异步，不阻塞返回）
  saveComparisonCache(userId, profileId, year, computed).catch((err) => {
    console.error('[YOY] 缓存写入失败:', err.message);
  });

  return { ...computed, is_cached: false };
}

/**
 * 从缓存表获取
 */
async function getCachedComparison(
  userId: string,
  profileId: string,
  year: number
): Promise<YearlyComparisonRow | null> {
  const { rows } = await pool.query(
    `SELECT * FROM yearly_comparisons
     WHERE user_id = $1 AND profile_id = $2 AND current_year = $3
       AND algo_version = $4`,
    [userId, profileId, year, CURRENT_ALGO_VERSION]
  );
  return rows[0] || null;
}

/**
 * 计算年度同比
 * 对比 current_year 和 previous_year 的 timespace_cache 中的 radar 数据
 */
async function computeYearlyComparison(
  userId: string,
  profileId: string,
  currentYear: number
): Promise<Omit<YearlyComparisonResponseData, 'is_cached'>> {
  const previousYear = currentYear - 1;

  // 从 timespace_cache 中获取两年的数据
  const { rows } = await pool.query(
    `SELECT cache_key, cache_data
     FROM timespace_cache
     WHERE user_id = $1 AND profile_id = $2
       AND (cache_key LIKE $3 OR cache_key LIKE $4)
     ORDER BY cache_key`,
    [
      userId,
      profileId,
      `%yearly%${currentYear}%`,
      `%yearly%${previousYear}%`,
    ]
  );

  // 无去年数据 → 返回默认值
  if (rows.length < 2) {
    return {
      current_year: currentYear,
      previous_year: previousYear,
      career_delta: 0,
      wealth_delta: 0,
      love_delta: 0,
      summary: '首年使用，暂无同比数据',
      decade_year_tag: null,
    };
  }

  // 尝试从缓存数据中提取 radar 维度数值
  let currentRadar = { career: 50, wealth: 50, love: 50 };
  let previousRadar = { career: 50, wealth: 50, love: 50 };

  try {
    for (const row of rows) {
      const data = typeof row.cache_data === 'string'
        ? JSON.parse(row.cache_data)
        : row.cache_data;

      const radar = data?.radar || data?.data?.radar;
      if (!radar) continue;

      if (row.cache_key.includes(String(currentYear))) {
        currentRadar = extractRadar(radar);
      } else if (row.cache_key.includes(String(previousYear))) {
        previousRadar = extractRadar(radar);
      }
    }
  } catch (err) {
    console.warn('[YOY] 解析 radar 数据失败，使用默认值:', err);
  }

  const careerDelta = clampDelta(currentRadar.career - previousRadar.career);
  const wealthDelta = clampDelta(currentRadar.wealth - previousRadar.wealth);
  const loveDelta = clampDelta(currentRadar.love - previousRadar.love);

  // 生成简要结论
  const summary = generateSummary(careerDelta, wealthDelta, loveDelta, currentYear);

  // 推断大限-流年化学反应标签
  const decadeYearTag = inferDecadeYearTag(careerDelta, wealthDelta, loveDelta);

  return {
    current_year: currentYear,
    previous_year: previousYear,
    career_delta: careerDelta,
    wealth_delta: wealthDelta,
    love_delta: loveDelta,
    summary,
    decade_year_tag: decadeYearTag,
  };
}

/**
 * 从 radar 对象中提取标准化数值
 */
function extractRadar(radar: any): { career: number; wealth: number; love: number } {
  return {
    career: Number(radar.career ?? radar.事业 ?? 50),
    wealth: Number(radar.wealth ?? radar.财运 ?? 50),
    love: Number(radar.love ?? radar.感情 ?? 50),
  };
}

/**
 * 将 delta 限制在 -100 ~ +100
 */
function clampDelta(val: number): number {
  return Math.max(-100, Math.min(100, Math.round(val)));
}

/**
 * 根据 delta 生成一句话结论
 */
function generateSummary(
  career: number,
  wealth: number,
  love: number,
  year: number
): string {
  const avg = (career + wealth + love) / 3;
  if (avg > 10) return `${year}年整体运势较去年明显上升，事业与财运均有增长空间`;
  if (avg > 0) return `${year}年运势稳中有升，部分维度小幅改善`;
  if (avg > -10) return `${year}年运势与去年基本持平，宜稳扎稳打`;
  return `${year}年运势较去年有所回调，建议谨慎行事、厚积薄发`;
}

/**
 * 推断大限-流年化学反应标签
 */
function inferDecadeYearTag(
  career: number,
  wealth: number,
  love: number
): string | null {
  const avg = (career + wealth + love) / 3;
  if (avg > 20) return 'key_sprint';
  if (avg > 5) return 'harvest';
  if (avg > -5) return 'transition';
  if (avg > -20) return 'defense';
  return 'dormant';
}

/**
 * 保存到缓存表
 */
async function saveComparisonCache(
  userId: string,
  profileId: string,
  currentYear: number,
  data: Omit<YearlyComparisonResponseData, 'is_cached'>
): Promise<void> {
  await pool.query(
    `INSERT INTO yearly_comparisons (
       user_id, profile_id, current_year, previous_year,
       career_delta, wealth_delta, love_delta,
       summary, decade_year_tag, algo_version
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (user_id, profile_id, current_year)
     DO UPDATE SET
       career_delta = EXCLUDED.career_delta,
       wealth_delta = EXCLUDED.wealth_delta,
       love_delta = EXCLUDED.love_delta,
       summary = EXCLUDED.summary,
       decade_year_tag = EXCLUDED.decade_year_tag,
       algo_version = EXCLUDED.algo_version,
       updated_at = NOW()`,
    [
      userId,
      profileId,
      data.current_year,
      data.previous_year,
      data.career_delta,
      data.wealth_delta,
      data.love_delta,
      data.summary,
      data.decade_year_tag,
      CURRENT_ALGO_VERSION,
    ]
  );
}

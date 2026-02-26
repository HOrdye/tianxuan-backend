import { pool } from '../config/database';
import type { PoolClient } from 'pg';
import {
  UserContextData,
  ImplicitTraits,
  WeightedInterestTag,
  Psychometrics,
  CompletenessResult,
  CompletenessBreakdown,
  RewardEvent,
  REWARD_RULES,
  THRESHOLD_REWARDS,
} from '../types/user-digital-twin';

export interface DestinyCard {
  mbti?: string;
  currentStatus?: string;
  identity?: string;
  profession?: string;
  wishes?: string[];
  energyLevel?: 'strong' | 'weak' | 'balanced';
  completeness: number;
  lastUpdated: string;
}

export interface UpdateDestinyCardData {
  mbti?: string;
  currentStatus?: string;
  identity?: string;
  profession?: string;
  wishes?: string[];
  energyLevel?: 'strong' | 'weak' | 'balanced';
}

export interface UpdateDestinyCardResult {
  mbti?: string;
  currentStatus?: string;
  identity?: string;
  profession?: string;
  wishes?: string[];
  energyLevel?: 'strong' | 'weak' | 'balanced';
  completeness: number;
  lastUpdated: string;
  events?: RewardEvent[];
}

export interface SyncBirthdayResult {
  synced: boolean;
  userContextUpdated: boolean;
  identityGenerated?: string;
}

export function calculateCompleteness(
  userContext: UserContextData,
  birthDate?: Date | string | null
): number {
  let score = 0;

  if (birthDate) {
    score += 40;
  }

  if (userContext.mbti) {
    score += 10;
  }
  if (userContext.profession) {
    score += 10;
  }
  if (userContext.currentStatus) {
    score += 20;
  }
  if (userContext.wishes && userContext.wishes.length > 0) {
    score += 20;
  }

  return Math.min(score, 100);
}

function calculateCompletenessBreakdown(
  userContext: UserContextData,
  birthDate?: Date | string | null
): CompletenessBreakdown {
  const birthDataFilled = !!birthDate;
  const mbtiFilled = !!(userContext.mbti && userContext.mbti.trim());
  const professionFilled = !!(userContext.profession && userContext.profession.trim());
  const currentStatusFilled = !!(userContext.currentStatus && userContext.currentStatus.trim());
  const wishesFilled = !!(userContext.wishes && userContext.wishes.length > 0);

  return {
    birthData: {
      filled: birthDataFilled,
      score: birthDataFilled ? 40 : 0,
      maxScore: 40,
    },
    mbti: {
      filled: mbtiFilled,
      score: mbtiFilled ? 10 : 0,
      maxScore: 10,
    },
    profession: {
      filled: professionFilled,
      score: professionFilled ? 10 : 0,
      maxScore: 10,
    },
    currentStatus: {
      filled: currentStatusFilled,
      score: currentStatusFilled ? 20 : 0,
      maxScore: 20,
    },
    wishes: {
      filled: wishesFilled,
      score: wishesFilled ? 20 : 0,
      maxScore: 20,
    },
  };
}

function getNextRewardThreshold(completeness: number): number | undefined {
  const thresholds = THRESHOLD_REWARDS.map((r) => r.threshold).sort((a, b) => a - b);
  return thresholds.find((t) => completeness < t);
}

async function checkRewardGranted(
  client: PoolClient,
  userId: string,
  rewardType: 'field_reward' | 'threshold_reward',
  rewardField?: string,
  rewardThreshold?: number
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM public.completeness_rewards 
     WHERE user_id = $1 
       AND reward_type = $2 
       AND ($3::text IS NULL OR reward_field = $3)
       AND ($4::int IS NULL OR reward_threshold = $4)
     LIMIT 1`,
    [userId, rewardType, rewardField || null, rewardThreshold || null]
  );

  return result.rows.length > 0;
}

async function recordReward(
  client: PoolClient,
  reward: {
    userId: string;
    rewardType: string;
    rewardField?: string;
    rewardThreshold?: number;
    coins: number;
    reason: string;
  }
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO public.completeness_rewards 
       (user_id, reward_type, reward_field, reward_threshold, coins, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        reward.userId,
        reward.rewardType,
        reward.rewardField || null,
        reward.rewardThreshold || null,
        reward.coins,
        reward.reason,
      ]
    );
  } catch (error: any) {
    if (error.code === '23505') {
      console.log(`奖励已发放: ${reward.reason}`);
      return;
    }
    throw error;
  }
}

async function grantCoins(client: PoolClient, userId: string, coins: number, reason: string): Promise<void> {
  await client.query(
    `UPDATE public.profiles
     SET tianji_coins_balance = tianji_coins_balance + $1,
         updated_at = NOW()
     WHERE id = $2`,
    [coins, userId]
  );
}

async function grantRewardForCompleteness(
  client: PoolClient,
  userId: string,
  oldCompleteness: number,
  newCompleteness: number,
  newFields: string[]
): Promise<RewardEvent[]> {
  const events: RewardEvent[] = [];

  console.log('[grantRewardForCompleteness] 开始发放奖励', {
    userId,
    oldCompleteness,
    newCompleteness,
    newFields,
  });

  for (const field of newFields) {
    const rule = REWARD_RULES.find((r) => r.field === field);
    if (rule) {
      console.log('[grantRewardForCompleteness] 检查字段奖励', { field, rule });
      const alreadyGranted = await checkRewardGranted(client, userId, 'field_reward', field);

      if (!alreadyGranted) {
        console.log('[grantRewardForCompleteness] 发放字段奖励', { field, coins: rule.coins });
        await grantCoins(client, userId, rule.coins, rule.reason);
        await recordReward(client, {
          userId,
          rewardType: 'field_reward',
          rewardField: field,
          coins: rule.coins,
          reason: rule.reason,
        });

        events.push({
          type: 'COIN_GRANTED',
          coins: rule.coins,
          reason: rule.reason,
          field: field,
        });
      }
    }
  }

  for (const thresholdReward of THRESHOLD_REWARDS) {
    if (
      oldCompleteness < thresholdReward.threshold &&
      newCompleteness >= thresholdReward.threshold
    ) {
      console.log('[grantRewardForCompleteness] 检查阈值奖励', {
        threshold: thresholdReward.threshold,
        oldCompleteness,
        newCompleteness,
      });
      const alreadyGranted = await checkRewardGranted(
        client,
        userId,
        'threshold_reward',
        undefined,
        thresholdReward.threshold
      );

      if (!alreadyGranted) {
        console.log('[grantRewardForCompleteness] 发放阈值奖励', {
          threshold: thresholdReward.threshold,
          coins: thresholdReward.coins,
        });
        await grantCoins(client, userId, thresholdReward.coins, thresholdReward.reason);
        await recordReward(client, {
          userId,
          rewardType: 'threshold_reward',
          rewardThreshold: thresholdReward.threshold,
          coins: thresholdReward.coins,
          reason: thresholdReward.reason,
        });

        events.push({
          type: 'THRESHOLD_REACHED',
          coins: thresholdReward.coins,
          reason: thresholdReward.reason,
          threshold: thresholdReward.threshold,
        });
      }
    }
  }

  if (newCompleteness > oldCompleteness) {
    events.push({
      type: 'COMPLETENESS_INCREASED',
      reason: `资料完整度从${oldCompleteness}%提升到${newCompleteness}%`,
    });
  }

  return events;
}

function detectNewFields(
  oldContext: UserContextData,
  newContext: UserContextData
): string[] {
  const newFields: string[] = [];

  if (!oldContext.mbti && newContext.mbti) {
    newFields.push('mbti');
  }
  if (!oldContext.profession && newContext.profession) {
    newFields.push('profession');
  }
  if (!oldContext.currentStatus && newContext.currentStatus) {
    newFields.push('currentStatus');
  }
  if ((!oldContext.wishes || oldContext.wishes.length === 0) && newContext.wishes && newContext.wishes.length > 0) {
    newFields.push('wishes');
  }

  return newFields;
}

export async function getDestinyCard(userId: string): Promise<DestinyCard> {
  const result = await pool.query(
    `SELECT 
      preferences,
      birthday,
      updated_at
    FROM public.profiles
    WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  const row = result.rows[0];
  const preferences = row.preferences || {};
  const userContext: UserContextData = preferences.userContext || {};
  const birthDate = row.birthday;

  const completeness = calculateCompleteness(userContext, birthDate);

  return {
    mbti: userContext.mbti,
    currentStatus: userContext.currentStatus,
    identity: userContext.identity,
    profession: userContext.profession,
    wishes: userContext.wishes,
    energyLevel: userContext.energyLevel,
    completeness,
    lastUpdated: row.updated_at.toISOString(),
  };
}

export async function updateDestinyCard(
  userId: string,
  data: UpdateDestinyCardData
): Promise<UpdateDestinyCardResult> {
  console.log('[updateDestinyCard] 1. 准备获取数据库连接', { userId });
  const client = await pool.connect();
  console.log('[updateDestinyCard] 2. 数据库连接已获取');

  try {
    console.log('[updateDestinyCard] 3. 开始更新命主名刺', { userId, data });
    
    console.log('[updateDestinyCard] 4. 设置查询超时');
    await client.query('SET statement_timeout = 10000');
    
    console.log('[updateDestinyCard] 5. 开始事务');
    await client.query('BEGIN');

    console.log('[updateDestinyCard] 6. 查询用户数据（FOR UPDATE NOWAIT）');
    const profileResult = await client.query(
      `SELECT preferences, birthday FROM public.profiles WHERE id = $1 FOR UPDATE NOWAIT`,
      [userId]
    );
    console.log('[updateDestinyCard] 7. 查询完成', { rowCount: profileResult.rows.length });

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const profile = profileResult.rows[0];
    const preferences = profile.preferences || {};
    const oldUserContext: UserContextData = preferences.userContext || {};
    const birthDate = profile.birthday;

    console.log('[updateDestinyCard] 获取到用户数据', {
      hasPreferences: !!preferences,
      hasUserContext: !!preferences.userContext,
      birthDate: birthDate ? 'exists' : 'null',
    });

    const oldCompleteness = calculateCompleteness(oldUserContext, birthDate);

    const newUserContext: UserContextData = {
      ...oldUserContext,
      ...data,
    };

    const newCompleteness = calculateCompleteness(newUserContext, birthDate);
    const newFields = detectNewFields(oldUserContext, newUserContext);

    console.log('[updateDestinyCard] 完整度计算', {
      oldCompleteness,
      newCompleteness,
      newFields,
    });

    const updatedPreferences = {
      ...preferences,
      userContext: newUserContext,
    };

    await client.query(
      `UPDATE public.profiles
       SET preferences = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedPreferences), userId]
    );

    console.log('[updateDestinyCard] 开始发放奖励');
    const events = await grantRewardForCompleteness(
      client,
      userId,
      oldCompleteness,
      newCompleteness,
      newFields
    );
    console.log('[updateDestinyCard] 奖励发放完成', { eventsCount: events.length });

    await client.query('COMMIT');
    console.log('[updateDestinyCard] 事务提交成功');

    return {
      mbti: newUserContext.mbti,
      currentStatus: newUserContext.currentStatus,
      identity: newUserContext.identity,
      profession: newUserContext.profession,
      wishes: newUserContext.wishes,
      energyLevel: newUserContext.energyLevel,
      completeness: newCompleteness,
      lastUpdated: new Date().toISOString(),
      events: events.length > 0 ? events : undefined,
    };
  } catch (error: any) {
    console.error('[updateDestinyCard] 捕获到错误:', {
      message: error.message,
      stack: error.stack,
      userId,
      code: error.code,
      name: error.name,
    });
    
    try {
      console.log('[updateDestinyCard] 尝试回滚事务');
      await client.query('ROLLBACK');
      console.log('[updateDestinyCard] 事务回滚成功');
    } catch (rollbackError: any) {
      console.error('[updateDestinyCard] 回滚失败:', {
        message: rollbackError.message,
        code: rollbackError.code,
      });
    }
    
    if (error.code === '55P03') {
      const lockError = new Error('数据正在被其他操作锁定，请稍后重试');
      console.error('[updateDestinyCard] 锁冲突错误，抛出:', lockError.message);
      throw lockError;
    }
    
    console.error('[updateDestinyCard] 重新抛出错误');
    throw error;
  } finally {
    console.log('[updateDestinyCard] 释放数据库连接');
    client.release();
  }
}

export async function getCompleteness(userId: string): Promise<CompletenessResult> {
  const result = await pool.query(
    `SELECT preferences, birthday FROM public.profiles WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  const row = result.rows[0];
  const preferences = row.preferences || {};
  const userContext: UserContextData = preferences.userContext || {};
  const birthDate = row.birthday;

  const completeness = calculateCompleteness(userContext, birthDate);
  const breakdown = calculateCompletenessBreakdown(userContext, birthDate);
  const nextRewardThreshold = getNextRewardThreshold(completeness);

  return {
    completeness,
    breakdown,
    nextRewardThreshold,
  };
}

export async function syncBirthdayToContext(
  userId: string,
  birthData: {
    birthDate: string;
    birthTime?: string;
    birthLocation?: string;
    gender?: 'male' | 'female';
  }
): Promise<SyncBirthdayResult> {
  const client = await pool.connect();

  try {
    console.log('[syncBirthdayToContext] 开始同步生辰信息', { userId, birthData });
    
    await client.query('SET statement_timeout = 10000');
    await client.query('BEGIN');

    const profileResult = await client.query(
      `SELECT preferences, birthday FROM public.profiles WHERE id = $1 FOR UPDATE NOWAIT`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const profile = profileResult.rows[0];
    const preferences = profile.preferences || {};
    const userContext: UserContextData = preferences.userContext || {};

    await client.query(
      `UPDATE public.profiles
       SET birthday = $1,
           gender = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [birthData.birthDate, birthData.gender || null, userId]
    );

    const updatedUserContext: UserContextData = {
      ...userContext,
      birthDate: birthData.birthDate,
    };

    await client.query(
      `UPDATE public.profiles
       SET preferences = jsonb_set(
         COALESCE(preferences, '{}'::jsonb),
         '{userContext}',
         $1::jsonb
       ),
       updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedUserContext), userId]
    );

    await client.query('COMMIT');
    console.log('[syncBirthdayToContext] 同步完成');

    return {
      synced: true,
      userContextUpdated: true,
    };
  } catch (error: any) {
    console.error('[syncBirthdayToContext] 错误:', {
      message: error.message,
      stack: error.stack,
      userId,
      code: error.code,
    });
    
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError: any) {
      console.error('[syncBirthdayToContext] 回滚失败:', rollbackError);
    }
    
    if (error.code === '55P03') {
      throw new Error('数据正在被其他操作锁定，请稍后重试');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

export async function getImplicitTraits(userId: string): Promise<ImplicitTraits> {
  const result = await pool.query(
    `SELECT implicit_traits FROM public.profiles WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('用户不存在');
  }

  return (result.rows[0].implicit_traits || {}) as ImplicitTraits;
}

export async function updateImplicitTraits(
  userId: string,
  traits: Partial<ImplicitTraits>
): Promise<ImplicitTraits> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `SELECT implicit_traits FROM public.profiles WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const existingTraits: ImplicitTraits = profileResult.rows[0].implicit_traits || {};

    const mergedTraits: ImplicitTraits = {
      ...existingTraits,
      inferred_roles: [
        ...(existingTraits.inferred_roles || []),
        ...(traits.inferred_roles || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      interest_tags: [
        ...(existingTraits.interest_tags || []),
        ...(traits.interest_tags || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      profession_hints: [
        ...(existingTraits.profession_hints || []),
        ...(traits.profession_hints || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      risk_tolerance: traits.risk_tolerance || existingTraits.risk_tolerance,
      interaction_style: traits.interaction_style || existingTraits.interaction_style,
      last_active_topic: traits.last_active_topic || existingTraits.last_active_topic,
      family_structure: {
        ...existingTraits.family_structure,
        ...traits.family_structure,
      },
    };

    await client.query(
      `UPDATE public.profiles
       SET implicit_traits = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(mergedTraits), userId]
    );

    await client.query('COMMIT');

    return mergedTraits;
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteImplicitTraits(
  userId: string,
  fields?: string[]
): Promise<{ deleted: string[] }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `SELECT implicit_traits FROM public.profiles WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const existingTraits: ImplicitTraits = profileResult.rows[0].implicit_traits || {};

    if (!fields || fields.length === 0) {
      await client.query(
        `UPDATE public.profiles
         SET implicit_traits = '{}'::jsonb,
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      return {
        deleted: Object.keys(existingTraits),
      };
    }

    const updatedTraits: ImplicitTraits = { ...existingTraits };
    const deleted: string[] = [];

    for (const field of fields) {
      if (field in updatedTraits) {
        delete (updatedTraits as any)[field];
        deleted.push(field);
      }
    }

    await client.query(
      `UPDATE public.profiles
       SET implicit_traits = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(updatedTraits), userId]
    );

    await client.query('COMMIT');

    return { deleted };
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 合并数组字段（去重）
 */
function mergeArrayField(
  existing: string[] | undefined,
  newItems: string[] | undefined
): string[] | undefined {
  if (!newItems || newItems.length === 0) {
    return existing && existing.length > 0 ? existing : undefined;
  }
  const merged = [...(existing || []), ...newItems];
  const unique = Array.from(new Set(merged)).sort();
  return unique.length > 0 ? unique : undefined;
}

/**
 * 深度合并 family_structure 对象
 */
function mergeFamilyStructure(
  existing: ImplicitTraits['family_structure'],
  newStructure: ImplicitTraits['family_structure']
): ImplicitTraits['family_structure'] | undefined {
  if (!newStructure) return existing;
  if (!existing) return newStructure;

  return {
    has_spouse:
      typeof newStructure.has_spouse === 'boolean'
        ? newStructure.has_spouse
        : existing.has_spouse,
    has_children:
      typeof newStructure.has_children === 'boolean'
        ? newStructure.has_children
        : existing.has_children,
    children_count:
      typeof newStructure.children_count === 'number'
        ? newStructure.children_count
        : existing.children_count,
  };
}

/**
 * 验证隐性信息数据
 */
export function validateImplicitTraits(traits: Partial<ImplicitTraits>): void {
  if (traits.risk_tolerance && !['low', 'medium', 'high'].includes(traits.risk_tolerance)) {
    throw new Error('Invalid risk_tolerance value: must be one of low, medium, high');
  }

  if (
    traits.interaction_style &&
    !['concise', 'detailed'].includes(traits.interaction_style)
  ) {
    throw new Error('Invalid interaction_style value: must be one of concise, detailed');
  }

  const arrayFields: (keyof ImplicitTraits)[] = [
    'inferred_roles',
    'interest_tags',
    'profession_hints',
  ];
  for (const field of arrayFields) {
    const value = traits[field];
    if (
      value !== undefined &&
      (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
    ) {
      throw new Error(`Invalid ${field}: must be an array of strings`);
    }
  }

  if (traits.family_structure) {
    if (
      traits.family_structure.has_spouse !== undefined &&
      typeof traits.family_structure.has_spouse !== 'boolean'
    ) {
      throw new Error('Invalid family_structure.has_spouse: must be boolean');
    }
    if (
      traits.family_structure.has_children !== undefined &&
      typeof traits.family_structure.has_children !== 'boolean'
    ) {
      throw new Error('Invalid family_structure.has_children: must be boolean');
    }
    if (
      traits.family_structure.children_count !== undefined &&
      (typeof traits.family_structure.children_count !== 'number' ||
        traits.family_structure.children_count < 0)
    ) {
      throw new Error(
        'Invalid family_structure.children_count: must be a non-negative number'
      );
    }
  }
}

/**
 * Token 限制检查和截断
 */
const MAX_IMPLICIT_TRAITS_TOKENS = 200;

export function validateAndTruncateTraits(traits: ImplicitTraits): ImplicitTraits {
  const traitsStr = JSON.stringify(traits);
  const estimatedTokens = traitsStr.length / 4;

  if (estimatedTokens > MAX_IMPLICIT_TRAITS_TOKENS) {
    const truncated: ImplicitTraits = { ...traits };

    if (truncated.inferred_roles && truncated.inferred_roles.length > 3) {
      truncated.inferred_roles = truncated.inferred_roles.slice(0, 3);
    }
    if (truncated.interest_tags && truncated.interest_tags.length > 5) {
      truncated.interest_tags = truncated.interest_tags.slice(0, 5);
    }
    if (truncated.profession_hints && truncated.profession_hints.length > 3) {
      truncated.profession_hints = truncated.profession_hints.slice(0, 3);
    }

    console.warn(
      `[validateAndTruncateTraits] Implicit traits truncated to fit token limit (${estimatedTokens} -> ${JSON.stringify(truncated).length / 4} tokens)`
    );

    return truncated;
  }

  return traits;
}

/**
 * 原子合并隐性信息（解决竞态条件问题）
 * 
 * @param userId 用户ID
 * @param newTraits 要合并的新隐性信息（增量数据）
 * @returns 合并后的完整隐性信息
 */
export async function mergeImplicitTraits(
  userId: string,
  newTraits: Partial<ImplicitTraits>
): Promise<ImplicitTraits> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `SELECT implicit_traits FROM public.profiles WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const existingTraits: ImplicitTraits = profileResult.rows[0].implicit_traits || {};

    const mergedTraits: ImplicitTraits = {
      ...existingTraits,
      inferred_roles: mergeArrayField(existingTraits.inferred_roles, newTraits.inferred_roles),
      interest_tags: mergeArrayField(existingTraits.interest_tags, newTraits.interest_tags),
      profession_hints: mergeArrayField(
        existingTraits.profession_hints,
        newTraits.profession_hints
      ),
      risk_tolerance:
        newTraits.risk_tolerance !== undefined
          ? newTraits.risk_tolerance
          : existingTraits.risk_tolerance,
      interaction_style:
        newTraits.interaction_style !== undefined
          ? newTraits.interaction_style
          : existingTraits.interaction_style,
      last_active_topic:
        newTraits.last_active_topic !== undefined
          ? newTraits.last_active_topic
          : existingTraits.last_active_topic,
      family_structure: mergeFamilyStructure(
        existingTraits.family_structure,
        newTraits.family_structure
      ),
    };

    const validatedTraits = validateAndTruncateTraits(mergedTraits);

    await client.query(
      `UPDATE public.profiles
       SET implicit_traits = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(validatedTraits), userId]
    );

    await client.query('COMMIT');

    return validatedTraits;
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface ExtractedTraitsForMerge {
  weighted_interest_tags?: WeightedInterestTag[];
  psychometrics?: Psychometrics;
  family_structure?: ImplicitTraits['family_structure'];
  profession_hints?: string[];
}

const WEIGHTED_TAGS_LIMIT = 50;

export async function mergeTraitsFromExtraction(
  userId: string,
  extracted: ExtractedTraitsForMerge
): Promise<ImplicitTraits> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const profileResult = await client.query(
      `SELECT implicit_traits FROM public.profiles WHERE id = $1 FOR UPDATE`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const existing: ImplicitTraits = profileResult.rows[0].implicit_traits || {};
    const existingTags = existing.weighted_interest_tags || [];
    const tagByValue = new Map<string, WeightedInterestTag>();
    for (const t of existingTags) {
      tagByValue.set(t.value, { ...t });
    }
    if (extracted.weighted_interest_tags?.length) {
      for (const t of extracted.weighted_interest_tags) {
        tagByValue.set(t.value, {
          value: t.value,
          weight: t.weight,
          confidence: t.confidence,
          source_event: t.source_event || 'consultation',
          last_updated: t.last_updated ?? Date.now(),
        });
      }
    }
    let mergedTags = Array.from(tagByValue.values());
    mergedTags.sort((a, b) => (b.weight * b.confidence) - (a.weight * a.confidence));
    if (mergedTags.length > WEIGHTED_TAGS_LIMIT) {
      mergedTags = mergedTags.slice(0, WEIGHTED_TAGS_LIMIT);
    }
    const interest_tags = mergedTags.map((t) => t.value);

    const mergedTraits: ImplicitTraits = {
      ...existing,
      weighted_interest_tags: mergedTags,
      interest_tags: interest_tags.length ? interest_tags : existing.interest_tags,
      psychometrics:
        extracted.psychometrics !== undefined ? extracted.psychometrics : existing.psychometrics,
      family_structure: mergeFamilyStructure(
        existing.family_structure,
        extracted.family_structure
      ),
      profession_hints: mergeArrayField(
        existing.profession_hints,
        extracted.profession_hints
      ),
    };

    await client.query(
      `UPDATE public.profiles
       SET implicit_traits = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(mergedTraits), userId]
    );

    await client.query('COMMIT');
    return mergedTraits;
  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

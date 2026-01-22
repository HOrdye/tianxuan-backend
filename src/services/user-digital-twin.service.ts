import { pool } from '../config/database';
import type { PoolClient } from 'pg';
import {
  UserContextData,
  ImplicitTraits,
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

import { pool } from '../config/database';
import { calculateCheckinReward, Tier } from './checkin.service';

/**
 * 签到升级补差服务模块
 * 提供升级补差计算和发放功能
 */

/**
 * 升级补差计算结果接口
 */
export interface CalculateUpgradeBonusResult {
  eligible_dates: Array<{
    check_in_date: string;
    old_tier: string;
    new_tier: string;
    base_coins: number;
    expected_coins: number;
    bonus_coins: number;
  }>;
  total_bonus_coins: number;
  upgrade_date: string;
}

/**
 * 发放升级补差结果接口
 */
export interface GrantUpgradeBonusResult {
  success: boolean;
  message?: string;
  total_bonus_coins: number;
  granted_count: number;
  granted_dates: string[];
}

/**
 * 计算升级补差
 * 
 * @param userId 用户ID
 * @param newTier 新会员等级
 * @param upgradeDate 升级日期（可选，默认为今天）
 * @returns Promise<CalculateUpgradeBonusResult> 计算结果
 */
export async function calculateUpgradeBonus(
  userId: string,
  newTier: Tier,
  upgradeDate?: string
): Promise<CalculateUpgradeBonusResult> {
  // 参数验证
  if (!userId || !newTier) {
    throw new Error('参数错误：用户ID和新会员等级必须有效');
  }

  const validTiers: Tier[] = ['guest', 'explorer', 'basic', 'premium', 'vip'];
  if (!validTiers.includes(newTier)) {
    throw new Error(`参数错误：无效的会员等级，必须是以下之一：${validTiers.join(', ')}`);
  }

  const upgradeDateStr = upgradeDate || new Date().toISOString().split('T')[0];

  try {
    // 1. 查询用户当前会员等级
    const profileResult = await pool.query(
      `SELECT tier FROM public.profiles WHERE id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const oldTier = (profileResult.rows[0].tier || 'explorer').toLowerCase() as Tier;

    // 如果新等级不高于旧等级，无需补差
    const tierOrder: Record<Tier, number> = { guest: 0, explorer: 1, basic: 2, premium: 3, vip: 4 };
    if (tierOrder[newTier] <= tierOrder[oldTier]) {
      return {
        eligible_dates: [],
        total_bonus_coins: 0,
        upgrade_date: upgradeDateStr,
      };
    }

    // 2. 查询升级日期之前的所有签到记录
    const checkinResult = await pool.query(
      `SELECT 
        check_in_date,
        consecutive_days,
        coins_earned,
        tier
      FROM public.check_in_logs
      WHERE user_id = $1
        AND check_in_date < $2
        AND check_in_date >= $2::date - INTERVAL '30 days'
      ORDER BY check_in_date DESC`,
      [userId, upgradeDateStr]
    );

    // 3. 计算每个签到日期的补差金额
    const eligibleDates: CalculateUpgradeBonusResult['eligible_dates'] = [];
    let totalBonusCoins = 0;

    for (const row of checkinResult.rows) {
      const checkInDate = row.check_in_date;
      const consecutiveDays = row.consecutive_days || 1;
      const baseCoins = row.coins_earned || 0;
      const checkInTier = (row.tier || oldTier).toLowerCase() as Tier;

      // 计算如果当时是新等级应该获得的奖励
      const expectedCoins = calculateCheckinReward(newTier, consecutiveDays);
      
      // 计算补差金额（如果新等级奖励更高）
      const bonusCoins = Math.max(0, expectedCoins - baseCoins);

      if (bonusCoins > 0) {
        eligibleDates.push({
          check_in_date: checkInDate,
          old_tier: checkInTier,
          new_tier: newTier,
          base_coins: baseCoins,
          expected_coins: expectedCoins,
          bonus_coins: bonusCoins,
        });
        totalBonusCoins += bonusCoins;
      }
    }

    return {
      eligible_dates: eligibleDates,
      total_bonus_coins: totalBonusCoins,
      upgrade_date: upgradeDateStr,
    };
  } catch (error: any) {
    console.error('计算升级补差失败:', {
      userId,
      newTier,
      upgradeDate: upgradeDateStr,
      error: error.message,
    });
    throw new Error(`计算升级补差失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 发放升级补差
 * 
 * @param userId 用户ID
 * @param newTier 新会员等级
 * @param upgradeDate 升级日期（可选，默认为今天）
 * @returns Promise<GrantUpgradeBonusResult> 发放结果
 */
export async function grantUpgradeBonus(
  userId: string,
  newTier: Tier,
  upgradeDate?: string
): Promise<GrantUpgradeBonusResult> {
  // 参数验证
  if (!userId || !newTier) {
    throw new Error('参数错误：用户ID和新会员等级必须有效');
  }

  const validTiers: Tier[] = ['guest', 'explorer', 'basic', 'premium', 'vip'];
  if (!validTiers.includes(newTier)) {
    throw new Error(`参数错误：无效的会员等级，必须是以下之一：${validTiers.join(', ')}`);
  }

  const upgradeDateStr = upgradeDate || new Date().toISOString().split('T')[0];

  // 获取数据库连接（用于事务）
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. 计算补差金额
    const calculation = await calculateUpgradeBonus(userId, newTier, upgradeDateStr);

    if (calculation.total_bonus_coins === 0) {
      await client.query('ROLLBACK');
      return {
        success: true,
        message: '无需补差',
        total_bonus_coins: 0,
        granted_count: 0,
        granted_dates: [],
      };
    }

    // 2. 检查是否已经补差过（避免重复补差）
    const existingBonusResult = await client.query(
      `SELECT check_in_date FROM public.checkin_upgrade_bonus_logs
       WHERE user_id = $1 AND check_in_date = ANY($2::date[])`,
      [userId, calculation.eligible_dates.map(d => d.check_in_date)]
    );

    const existingDates = new Set(
      existingBonusResult.rows.map(r => r.check_in_date.toISOString().split('T')[0])
    );

    // 3. 过滤掉已经补差过的日期
    const datesToGrant = calculation.eligible_dates.filter(
      d => !existingDates.has(d.check_in_date)
    );

    if (datesToGrant.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: true,
        message: '所有日期已补差',
        total_bonus_coins: 0,
        granted_count: 0,
        granted_dates: [],
      };
    }

    // 4. 计算实际需要补差的总金额
    let totalBonusCoins = 0;
    const grantedDates: string[] = [];

    for (const dateInfo of datesToGrant) {
      // 插入补差记录
      await client.query(
        `INSERT INTO public.checkin_upgrade_bonus_logs
         (user_id, check_in_date, old_tier, new_tier, base_coins, bonus_coins, total_coins, upgrade_date, granted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          userId,
          dateInfo.check_in_date,
          dateInfo.old_tier,
          dateInfo.new_tier,
          dateInfo.base_coins,
          dateInfo.bonus_coins,
          dateInfo.base_coins + dateInfo.bonus_coins,
          upgradeDateStr,
        ]
      );

      totalBonusCoins += dateInfo.bonus_coins;
      grantedDates.push(dateInfo.check_in_date);
    }

    // 5. 发放天机币
    if (totalBonusCoins > 0) {
      await client.query(
        `UPDATE public.profiles
         SET tianji_coins_balance = tianji_coins_balance + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [totalBonusCoins, userId]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: `成功补差 ${totalBonusCoins} 天机币`,
      total_bonus_coins: totalBonusCoins,
      granted_count: datesToGrant.length,
      granted_dates: grantedDates,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('发放升级补差失败:', {
      userId,
      newTier,
      upgradeDate: upgradeDateStr,
      error: error.message,
    });
    throw new Error(`发放升级补差失败: ${error.message || '未知错误'}`);
  } finally {
    client.release();
  }
}

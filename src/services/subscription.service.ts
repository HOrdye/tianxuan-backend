import { pool } from '../config/database';
import { randomUUID } from 'crypto';

/**
 * 订阅/会员系统服务模块
 * 提供订阅状态查询、创建订阅、权限检查等功能
 */

/**
 * 会员等级类型
 */
export type Tier = 'free' | 'basic' | 'premium' | 'vip';

/**
 * 订阅状态类型
 */
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

/**
 * 订阅信息接口
 */
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

/**
 * 订阅状态查询结果接口
 */
export interface SubscriptionStatusResult {
  tier: Tier;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  features: Record<string, any>;
  isPremium: boolean;
}

/**
 * 功能权限检查结果接口
 */
export interface FeatureCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeTier?: Tier;
}

/**
 * 使用次数查询结果接口
 */
export interface UsageResult {
  usage: number;
  limit: number;
  remaining: number;
}

/**
 * 四级会员体系功能权限配置
 * 参考前端 subscriptionService.ts 中的 PLANS 配置
 */
const TIER_FEATURES: Record<Tier, Record<string, any>> = {
  // 免费用户（探索者）
  free: {
    yijing: {
      available: true,
      dailyLimit: 3, // 每日3次
    },
    ziwei: {
      available: true,
      basicChart: true,
      advancedChart: false,
      dailyLimit: 2,
    },
    bazi: {
      available: false,
    },
    qimen: {
      available: false,
    },
    liuyao: {
      available: false,
    },
    astrology: {
      available: true,
      timeAssets: false,
      cache: false,
    },
  },
  // 基础会员（开悟者）
  basic: {
    yijing: {
      available: true,
      dailyLimit: 10,
    },
    ziwei: {
      available: true,
      basicChart: true,
      advancedChart: false,
      dailyLimit: 5,
    },
    bazi: {
      available: true,
      dailyLimit: 3,
    },
    qimen: {
      available: false,
    },
    liuyao: {
      available: false,
    },
    astrology: {
      available: true,
      timeAssets: true,
      cache: true,
    },
  },
  // 高级会员（天命师）
  premium: {
    yijing: {
      available: true,
      dailyLimit: 0, // 0表示无限
    },
    ziwei: {
      available: true,
      basicChart: true,
      advancedChart: true,
      dailyLimit: 0,
    },
    bazi: {
      available: true,
      dailyLimit: 0,
    },
    qimen: {
      available: true,
      dailyLimit: 5,
    },
    liuyao: {
      available: true,
      dailyLimit: 5,
    },
    astrology: {
      available: true,
      timeAssets: true,
      cache: true,
    },
  },
  // VIP会员（玄机大师）
  vip: {
    yijing: {
      available: true,
      dailyLimit: 0,
    },
    ziwei: {
      available: true,
      basicChart: true,
      advancedChart: true,
      dailyLimit: 0,
    },
    bazi: {
      available: true,
      dailyLimit: 0,
    },
    qimen: {
      available: true,
      dailyLimit: 0,
    },
    liuyao: {
      available: true,
      dailyLimit: 0,
    },
    astrology: {
      available: true,
      timeAssets: true,
      cache: true,
    },
  },
};

/**
 * 获取用户订阅状态
 * 优先级：优先从 profiles.tier 读取，如果没有再查询 subscriptions 表
 * 
 * @param userId 用户ID
 * @returns Promise<SubscriptionStatusResult> 订阅状态结果
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatusResult> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 1. 优先从 profiles.tier 读取
    const profileResult = await pool.query(
      `SELECT tier, subscription_status, subscription_end_at 
       FROM public.profiles 
       WHERE id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('用户不存在');
    }

    const profile = profileResult.rows[0];
    let tier: Tier = (profile.tier || 'free') as Tier;
    let status: SubscriptionStatus = 'active';
    let expiresAt: Date | null = null;

    // 如果 profiles.tier 存在，使用它
    if (profile.tier) {
      tier = profile.tier as Tier;
      
      // 检查订阅是否过期
      if (profile.subscription_end_at) {
        expiresAt = profile.subscription_end_at;
        const now = new Date();
        if (expiresAt && expiresAt < now) {
          status = 'expired';
          tier = 'free'; // 过期后降级为免费用户
        } else {
          status = (profile.subscription_status || 'active') as SubscriptionStatus;
        }
      }
    } else {
      // 2. 如果 profiles.tier 不存在，查询 subscriptions 表
      // ✅ 数据库表结构已修复：可以使用 expires_at 字段
      const subscriptionResult = await pool.query(
        `SELECT tier, status, expires_at 
         FROM public.subscriptions 
         WHERE user_id = $1 
           AND status IN ('active', 'pending')
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (subscriptionResult.rows.length > 0) {
        const sub = subscriptionResult.rows[0];
        tier = sub.tier as Tier;
        status = sub.status as SubscriptionStatus;
        expiresAt = sub.expires_at;
        
        // 检查是否过期
        if (expiresAt && expiresAt < new Date()) {
          status = 'expired';
          tier = 'free';
        }
      }
    }

    // 获取功能权限配置
    const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
    const isPremium = tier === 'premium' || tier === 'vip';

    return {
      tier,
      status,
      expiresAt,
      features,
      isPremium,
    };
  } catch (error: any) {
    console.error('获取订阅状态失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`获取订阅状态失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 创建订阅订单
 * 需要先创建支付订单，然后创建订阅记录
 * 
 * @param userId 用户ID
 * @param tier 会员等级
 * @param isYearly 是否年付
 * @param paymentMethod 支付方式
 * @returns Promise<{ success: boolean, orderId: string, payUrl?: string }> 创建结果
 */
export async function createSubscription(
  userId: string,
  tier: Tier,
  isYearly: boolean,
  paymentMethod?: string
): Promise<{ success: boolean; orderId: string; payUrl?: string }> {
  if (!userId || !tier) {
    throw new Error('参数错误：用户ID和会员等级必须有效');
  }

  // 验证会员等级
  if (!['free', 'basic', 'premium', 'vip'].includes(tier)) {
    throw new Error('参数错误：会员等级无效');
  }

  // 免费用户不能订阅
  if (tier === 'free') {
    throw new Error('不能订阅免费等级');
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 计算订阅价格（这里需要根据实际业务逻辑计算）
      // 示例：basic 月付 29元，年付 290元；premium 月付 99元，年付 990元；vip 月付 199元，年付 1990元
      const prices: Record<Tier, { monthly: number; yearly: number }> = {
        free: { monthly: 0, yearly: 0 },
        basic: { monthly: 29, yearly: 290 },
        premium: { monthly: 99, yearly: 990 },
        vip: { monthly: 199, yearly: 1990 },
      };

      const price = isYearly ? prices[tier].yearly : prices[tier].monthly;
      const durationMonths = isYearly ? 12 : 1;

      // 2. 创建支付订单（这里需要调用支付服务）
      // 注意：实际应该调用 payment.service.ts 的 createOrder 函数
      // 这里先创建订阅记录，支付订单由前端或支付服务创建
      const orderId = randomUUID();

      // 3. 创建订阅记录
      const subscriptionId = randomUUID();
      const startedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

      // ✅ 数据库表结构已修复：start_date → started_at, end_date → expires_at
      // ✅ 数据库约束已修复：允许 'pending' 状态和 'basic', 'premium', 'vip' 等级
      // 创建订单时使用 'pending' 状态，支付成功后再更新为 'active'
      await client.query(
        `INSERT INTO public.subscriptions 
         (id, user_id, tier, status, started_at, expires_at, auto_renew, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [subscriptionId, userId, tier, 'pending', startedAt, expiresAt, true]
      );

      // 4. 更新 profiles.tier（可选，也可以等支付成功后再更新）
      // await client.query(
      //   `UPDATE public.profiles SET tier = $1 WHERE id = $2`,
      //   [tier, userId]
      // );

      await client.query('COMMIT');

      return {
        success: true,
        orderId,
        // payUrl 应该由支付服务返回
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('创建订阅失败:', {
      userId,
      tier,
      isYearly,
      error: error.message,
    });
    throw new Error(`创建订阅失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查订阅状态（支付回调后）
 * 
 * @param orderId 订单ID
 * @returns Promise<{ success: boolean, tier: Tier, status: SubscriptionStatus }> 检查结果
 */
export async function checkSubscriptionStatus(
  orderId: string
): Promise<{ success: boolean; tier: Tier; status: SubscriptionStatus }> {
  if (!orderId) {
    throw new Error('参数错误：订单ID必须有效');
  }

  try {
    // 1. 查询订单状态
    const orderResult = await pool.query(
      `SELECT user_id, status, item_type 
       FROM public.transactions 
       WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('订单不存在');
    }

    const order = orderResult.rows[0];

    // 2. 如果订单已支付，查询订阅状态
    if (order.status === 'paid' || order.status === 'completed') {
      const subscriptionResult = await pool.query(
        `SELECT tier, status 
         FROM public.subscriptions 
         WHERE user_id = $1 
           AND status IN ('active', 'pending')
         ORDER BY created_at DESC 
         LIMIT 1`,
        [order.user_id]
      );

      if (subscriptionResult.rows.length > 0) {
        const sub = subscriptionResult.rows[0];
        return {
          success: true,
          tier: sub.tier as Tier,
          status: sub.status as SubscriptionStatus,
        };
      }
    }

    return {
      success: false,
      tier: 'free',
      status: 'pending',
    };
  } catch (error: any) {
    console.error('检查订阅状态失败:', {
      orderId,
      error: error.message,
    });
    throw new Error(`检查订阅状态失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 取消订阅
 * 不立即生效，到期后不再续费
 * 
 * @param userId 用户ID
 * @returns Promise<{ success: boolean }> 取消结果
 */
export async function cancelSubscription(
  userId: string
): Promise<{ success: boolean }> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    // 查找当前活跃或待支付的订阅（允许取消 pending 和 active 状态的订阅）
    // 🔍 调试日志：查看查询结果
    const subscriptionResult = await pool.query(
      `SELECT id, status, tier, created_at
       FROM public.subscriptions 
       WHERE user_id = $1 
         AND status IN ('active', 'pending')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [userId]
    );

    // 调试日志：打印查询结果
    console.log('取消订阅 - 查询结果:', {
      userId,
      found: subscriptionResult.rows.length,
      subscriptions: subscriptionResult.rows,
    });

    if (subscriptionResult.rows.length === 0) {
      // 调试日志：如果没找到，查询所有订阅状态
      const allSubscriptions = await pool.query(
        `SELECT id, status, tier, created_at 
         FROM public.subscriptions 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );
      console.log('取消订阅 - 所有订阅记录:', {
        userId,
        count: allSubscriptions.rows.length,
        subscriptions: allSubscriptions.rows,
      });
      throw new Error('没有找到活跃的订阅');
    }

    const subscription = subscriptionResult.rows[0];

    // 更新订阅状态为已取消（但不立即降级）
    // ⚠️ 注意：如果数据库表中没有 cancelled_at 字段，需要先添加该字段
    // 或者移除 cancelled_at 字段的更新
    await pool.query(
      `UPDATE public.subscriptions 
       SET status = 'cancelled', 
           auto_renew = false,
           updated_at = NOW()
       WHERE id = $1`,
      [subscription.id]
    );

    return { success: true };
  } catch (error: any) {
    console.error('取消订阅失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`取消订阅失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 检查功能权限
 * 支持嵌套路径，如 'yijing.available', 'ziwei.advancedChart'
 * 
 * @param userId 用户ID
 * @param featurePath 功能路径（支持嵌套，如 'yijing.available'）
 * @returns Promise<FeatureCheckResult> 权限检查结果
 */
export async function checkFeaturePermission(
  userId: string,
  featurePath: string
): Promise<FeatureCheckResult> {
  if (!userId || !featurePath) {
    throw new Error('参数错误：用户ID和功能路径必须有效');
  }

  try {
    // 1. 获取用户订阅状态
    const statusResult = await getSubscriptionStatus(userId);
    const { tier, features } = statusResult;

    // 2. 解析功能路径（支持嵌套）
    const pathParts = featurePath.split('.');
    let currentFeature: any = features;

    for (const part of pathParts) {
      if (currentFeature && typeof currentFeature === 'object' && part in currentFeature) {
        currentFeature = currentFeature[part];
      } else {
        // 功能不存在，需要升级
        return {
          allowed: false,
          reason: `功能 ${featurePath} 不可用`,
          upgradeTier: getUpgradeTier(tier),
        };
      }
    }

    // 3. 检查功能是否可用
    if (currentFeature === true || currentFeature === false) {
      if (currentFeature) {
        return { allowed: true };
      } else {
        return {
          allowed: false,
          reason: `功能 ${featurePath} 不可用`,
          upgradeTier: getUpgradeTier(tier),
        };
      }
    }

    // 如果是对象，默认允许（表示有该功能的配置）
    return { allowed: true };
  } catch (error: any) {
    console.error('检查功能权限失败:', {
      userId,
      featurePath,
      error: error.message,
    });
    throw new Error(`检查功能权限失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 获取升级建议等级
 */
function getUpgradeTier(currentTier: Tier): Tier {
  const tierOrder: Tier[] = ['free', 'basic', 'premium', 'vip'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex < tierOrder.length - 1) {
    return tierOrder[currentIndex + 1];
  }
  
  return currentTier; // 已经是最高等级
}

/**
 * 获取今日使用次数
 * 
 * @param userId 用户ID
 * @param feature 功能名称（如 'yijing', 'ziwei'）
 * @returns Promise<UsageResult> 使用次数结果
 */
export async function getTodayUsage(
  userId: string,
  feature: string
): Promise<UsageResult> {
  if (!userId || !feature) {
    throw new Error('参数错误：用户ID和功能名称必须有效');
  }

  try {
    // 1. 获取用户订阅状态和功能限制
    const statusResult = await getSubscriptionStatus(userId);
    const { tier, features: tierFeatures } = statusResult;

    // 2. 获取功能的使用次数限制
    const featureConfig = tierFeatures[feature];
    const limit = featureConfig?.dailyLimit ?? 0; // 0表示无限

    // 3. 查询今日使用次数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 将业务层功能名称映射到数据库允许的值
    const dbFeature = mapFeatureToDatabaseValue(feature);

    const usageResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM public.usage_logs 
       WHERE user_id = $1 
         AND feature = $2 
         AND created_at >= $3 
         AND created_at < $4`,
      [userId, dbFeature, today, tomorrow]
    );

    const usage = parseInt(usageResult.rows[0].count) || 0;
    const remaining = limit === 0 ? Infinity : Math.max(0, limit - usage);

    return {
      usage,
      limit,
      remaining: remaining === Infinity ? -1 : remaining, // -1表示无限
    };
  } catch (error: any) {
    console.error('获取今日使用次数失败:', {
      userId,
      feature,
      error: error.message,
    });
    throw new Error(`获取今日使用次数失败: ${error.message || '未知错误'}`);
  }
}

/**
 * 将业务层功能名称映射到数据库允许的值
 * 数据库约束只允许：'tripleAnalysis', 'chartGeneration', 'aiInsight'
 * 
 * @param feature 业务层功能名称（如 'yijing', 'ziwei', 'bazi' 等）
 * @returns 数据库允许的功能名称
 */
function mapFeatureToDatabaseValue(feature: string): string {
  // 数据库约束允许的值：'tripleAnalysis', 'chartGeneration', 'aiInsight'
  const featureMapping: Record<string, string> = {
    // 三元分析类功能
    'yijing': 'tripleAnalysis',      // 易经 - 三元分析
    'liuyao': 'tripleAnalysis',      // 六爻 - 三元分析
    // 命盘生成类功能
    'ziwei': 'chartGeneration',      // 紫微斗数 - 命盘生成
    'bazi': 'chartGeneration',       // 八字 - 命盘生成
    'qimen': 'chartGeneration',      // 奇门遁甲 - 命盘生成
    'astrology': 'chartGeneration',  // 紫微斗数相关 - 命盘生成
    // AI 洞察类功能（如果有）
    'aiInsight': 'aiInsight',        // AI 洞察
  };

  // 如果功能名称已经在允许列表中，直接返回
  if (['tripleAnalysis', 'chartGeneration', 'aiInsight'].includes(feature)) {
    return feature;
  }

  // 否则使用映射表
  const mappedFeature = featureMapping[feature.toLowerCase()];
  if (!mappedFeature) {
    // 如果找不到映射，默认使用 'tripleAnalysis'（最通用的类型）
    console.warn(`功能名称 "${feature}" 未找到映射，使用默认值 "tripleAnalysis"`);
    return 'tripleAnalysis';
  }

  return mappedFeature;
}

/**
 * 记录功能使用
 * 
 * @param userId 用户ID
 * @param feature 功能名称（业务层名称，如 'yijing', 'ziwei' 等）
 * @param metadata 元数据（可选）
 * @returns Promise<{ success: boolean }> 记录结果
 */
export async function recordUsage(
  userId: string,
  feature: string,
  metadata?: any
): Promise<{ success: boolean }> {
  if (!userId || !feature) {
    throw new Error('参数错误：用户ID和功能名称必须有效');
  }

  try {
    // 检查今日使用次数是否超限（使用原始功能名称）
    const usageResult = await getTodayUsage(userId, feature);
    
    if (usageResult.limit > 0 && usageResult.remaining <= 0) {
      throw new Error('今日使用次数已达上限');
    }

    // 将业务层功能名称映射到数据库允许的值
    const dbFeature = mapFeatureToDatabaseValue(feature);
    
    // 调试日志：打印映射结果
    console.log('记录功能使用 - 功能名称映射:', {
      originalFeature: feature,
      mappedFeature: dbFeature,
      userId,
    });

    // 记录使用日志
    // ✅ 数据库表结构已修复：已添加 metadata 字段
    // ✅ 数据库约束已修复：使用映射后的功能名称
    await pool.query(
      `INSERT INTO public.usage_logs 
       (id, user_id, feature, metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [userId, dbFeature, metadata ? JSON.stringify(metadata) : null]
    );

    return { success: true };
  } catch (error: any) {
    console.error('记录功能使用失败:', {
      userId,
      feature,
      error: error.message,
    });
    throw error; // 直接抛出错误，让调用者处理
  }
}

/**
 * 检查并更新过期订阅状态
 * 
 * @param userId 用户ID
 * @returns Promise<{ expired: boolean, newTier: Tier }> 检查结果
 */
export async function checkExpiredSubscription(
  userId: string
): Promise<{ expired: boolean; newTier: Tier }> {
  if (!userId) {
    throw new Error('参数错误：用户ID必须有效');
  }

  try {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 查询当前订阅状态
      // ✅ 数据库表结构已修复：可以使用 expires_at 字段
      const subscriptionResult = await client.query(
        `SELECT id, tier, status, expires_at 
         FROM public.subscriptions 
         WHERE user_id = $1 
           AND status IN ('active', 'pending')
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );

      if (subscriptionResult.rows.length === 0) {
        // 没有订阅，返回免费用户
        await client.query('COMMIT');
        return { expired: false, newTier: 'free' };
      }

      const subscription = subscriptionResult.rows[0];
      const expiresAt: Date | null = subscription.expires_at;
      const now = new Date();
      
      // 2. 检查是否过期（检查过期时间和状态）
      if (expiresAt && expiresAt < now && subscription.status === 'active') {
        // 更新订阅状态为过期
        await client.query(
          `UPDATE public.subscriptions 
           SET status = 'expired', updated_at = NOW()
           WHERE id = $1`,
          [subscription.id]
        );

        // 更新 profiles.tier 为免费用户
        await client.query(
          `UPDATE public.profiles 
           SET tier = 'free', 
               subscription_status = 'expired',
               subscription_end_at = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );

        await client.query('COMMIT');
        return { expired: true, newTier: 'free' };
      }

      await client.query('COMMIT');
      return { expired: false, newTier: subscription.tier as Tier };
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('检查过期订阅失败:', {
      userId,
      error: error.message,
    });
    throw new Error(`检查过期订阅失败: ${error.message || '未知错误'}`);
  }
}

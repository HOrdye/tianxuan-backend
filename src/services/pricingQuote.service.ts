import { pool } from '../config/database';
import { PricingQuoteData } from '../types/fortune-v2';

/**
 * 询价服务
 * 透明计费：用户点击解锁前先询价，返回实际价格与折扣信息
 */

/** SKU 基础价格配置 */
const SKU_PRICES: Record<string, number> = {
  fortune_daily: 10,
  fortune_monthly: 10,
  fortune_yearly: 10,
  weather_decode: 10,
};

/**
 * 获取报价
 * 检查 SKU 基础价格 + 是否有捆绑优惠
 */
export async function getQuote(
  userId: string,
  sku: string,
  date: string
): Promise<PricingQuoteData> {
  const originalPrice = SKU_PRICES[sku];
  if (originalPrice === undefined) {
    const err = new Error(`未知商品 SKU: ${sku}`);
    (err as any).code = 'ERR_INVALID_SKU';
    throw err;
  }

  let actualPrice = originalPrice;
  let discountReason: string | null = null;
  let discountLabel: string | null = null;

  // 捆绑优惠逻辑：fortune_daily 享受天机解码半价
  if (sku === 'fortune_daily') {
    const hasWeatherDecode = await checkWeatherDecodeUnlocked(userId, date);
    if (hasWeatherDecode) {
      actualPrice = Math.floor(originalPrice / 2);
      discountReason = 'BUNDLE_WEATHER_DECODE';
      discountLabel = '今日已解锁天机解码，享捆绑优惠';
    }
  }

  return {
    sku,
    original_price: originalPrice,
    actual_price: actualPrice,
    discount_reason: discountReason,
    discount_label: discountLabel,
  };
}

/**
 * 检查当天是否已购买天机解码
 */
async function checkWeatherDecodeUnlocked(
  userId: string,
  date: string
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT id FROM unlocked_time_assets
     WHERE user_id = $1
       AND dimension = 'daily'
       AND period_start::date = $2::date
       AND is_active = true
     LIMIT 1`,
    [userId, date]
  );
  return rows.length > 0;
}

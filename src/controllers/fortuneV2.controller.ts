import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendInternalError,
} from '../utils/response';
import {
  CreateCheckinSchema,
  QueryCheckinSchema,
  YearlyComparisonQuerySchema,
  PricingQuoteQuerySchema,
} from '../types/fortune-v2';
import * as dailyCheckinService from '../services/dailyCheckin.service';
import * as yearlyComparisonService from '../services/yearlyComparison.service';
import * as pricingQuoteService from '../services/pricingQuote.service';

/**
 * 时空导航决策看板 v2.0 — Fortune Controllers
 */

// ============================================
// 今日复盘打卡
// ============================================

/**
 * POST /api/fortune/checkin
 * 提交或更新今日复盘打卡（幂等 UPSERT）
 */
export async function postCheckin(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const parsed = CreateCheckinSchema.safeParse(req.body);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.issues.map(i => i.message).join('; '));
      return;
    }

    const result = await dailyCheckinService.upsertCheckin(req.user.userId, parsed.data);

    sendSuccess(res, result, result.is_new ? '打卡成功' : '打卡已更新');
  } catch (error: any) {
    if (error.code === 'ERR_PROFILE_MISMATCH') {
      sendBadRequest(res, error.message);
      return;
    }
    console.error('[FortuneV2] postCheckin error:', error);
    sendInternalError(res, '打卡失败', error);
  }
}

/**
 * GET /api/fortune/checkin
 * 查询打卡记录
 */
export async function getCheckins(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const parsed = QueryCheckinSchema.safeParse(req.query);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.issues.map(i => i.message).join('; '));
      return;
    }

    const { profile_id, date, range } = parsed.data;
    const result = await dailyCheckinService.queryCheckins(
      req.user.userId,
      profile_id,
      date,
      range
    );

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.code === 'ERR_PROFILE_MISMATCH') {
      sendBadRequest(res, error.message);
      return;
    }
    console.error('[FortuneV2] getCheckins error:', error);
    sendInternalError(res, '查询打卡记录失败', error);
  }
}

// ============================================
// 年度同比 (YOY)
// ============================================

/**
 * GET /api/fortune/yearly-comparison
 * 获取年度同比数据
 */
export async function getYearlyComparison(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const parsed = YearlyComparisonQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.issues.map(i => i.message).join('; '));
      return;
    }

    const { profile_id, year } = parsed.data;
    const result = await yearlyComparisonService.getYearlyComparison(
      req.user.userId,
      profile_id,
      year
    );

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.code === 'ERR_PROFILE_MISMATCH') {
      sendBadRequest(res, error.message);
      return;
    }
    console.error('[FortuneV2] getYearlyComparison error:', error);
    sendInternalError(res, '获取年度同比数据失败', error);
  }
}

// ============================================
// 询价
// ============================================

/**
 * GET /api/pricing/quote
 * 获取报价（透明计费）
 */
export async function getPricingQuote(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const parsed = PricingQuoteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.issues.map(i => i.message).join('; '));
      return;
    }

    const { sku, date } = parsed.data;
    const result = await pricingQuoteService.getQuote(req.user.userId, sku, date);

    sendSuccess(res, result);
  } catch (error: any) {
    if (error.code === 'ERR_INVALID_SKU') {
      sendBadRequest(res, error.message);
      return;
    }
    console.error('[FortuneV2] getPricingQuote error:', error);
    sendInternalError(res, '获取报价失败', error);
  }
}

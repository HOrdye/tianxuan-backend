import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendInternalError } from '../utils/response';
import { StrategyInquiryService } from '../services/strategy/StrategyInquiryService';
import * as astrologyService from '../services/astrology.service';
import type { InquiryRequest } from '../types/strategy';

export async function submitInquiry(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const {
      category,
      selectedTag,
      selected_tag,
      customContext,
      custom_context,
      chartId,
      chart_id,
      isPaid,
      is_paid,
    } = req.body;

    const categoryValue = category;
    const selectedTagValue = selectedTag || selected_tag;
    const customContextValue = customContext || custom_context;
    const chartIdValue = chartId || chart_id;
    const isPaidValue = isPaid !== undefined ? isPaid : (is_paid !== undefined ? is_paid : false);

    if (!categoryValue || !customContextValue) {
      sendBadRequest(res, 'category 和 customContext 必须提供');
      return;
    }

    const validCategories = ['career', 'love', 'wealth', 'health', 'family', 'education', 'other'];
    if (!validCategories.includes(categoryValue)) {
      sendBadRequest(res, `category 必须是以下之一: ${validCategories.join(', ')}`);
      return;
    }

    if (typeof customContextValue !== 'string' || customContextValue.trim().length === 0) {
      sendBadRequest(res, 'customContext 必须是非空字符串');
      return;
    }

    if (customContextValue.length > 500) {
      sendBadRequest(res, 'customContext 长度不能超过500字符');
      return;
    }

    const chart = await astrologyService.getStarChart(userId);
    if (!chart || !chart.chart_structure) {
      sendBadRequest(res, '命盘不存在，请先保存命盘');
      return;
    }

    const request: InquiryRequest = {
      category: categoryValue,
      selectedTag: selectedTagValue,
      customContext: customContextValue.trim(),
      chartId: chartIdValue,
    };

    const result = await StrategyInquiryService.processInquiry(
      userId,
      request,
      chart.chart_structure,
      isPaidValue
    );

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[Strategy Controller] 提交策问失败:', {
      userId: req.user?.userId,
      error: error.message,
    });

    if (error.message?.includes('余额不足') || error.message?.includes('扣费失败')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误') || error.message?.includes('必须')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '提交策问失败', error);
  }
}

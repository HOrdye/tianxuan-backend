import { Response } from 'express';
import * as divinationService from '../services/divination.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

export async function createHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { type, question, result } = req.body;

    if (!type) {
      sendBadRequest(res, '占卜类型 (type) 必须提供');
      return;
    }

    if (!['yijing', 'dilemma', 'tarot', 'jiaobei', 'triple_analysis'].includes(type)) {
      sendBadRequest(res, '占卜类型 (type) 必须是: yijing, dilemma, tarot, jiaobei, triple_analysis');
      return;
    }

    if (!result) {
      sendBadRequest(res, '占卜结果 (result) 必须提供');
      return;
    }

    const record = await divinationService.createHistory({
      userId,
      type,
      question,
      result,
    });

    sendSuccess(res, record);
  } catch (error: any) {
    console.error('创建占卜历史记录失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function getHistoryList(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 50;
    const type = req.query.type as string | undefined;

    if (type && !['yijing', 'dilemma', 'tarot', 'jiaobei', 'triple_analysis'].includes(type)) {
      sendBadRequest(res, '占卜类型 (type) 必须是: yijing, dilemma, tarot, jiaobei, triple_analysis');
      return;
    }

    const result = await divinationService.getHistoryList({
      userId,
      page,
      pageSize,
      type: type as divinationService.DivinationHistoryType | undefined,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('查询占卜历史记录失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function deleteHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const recordId = req.params.id;

    if (!recordId) {
      sendBadRequest(res, '记录ID必须提供');
      return;
    }

    await divinationService.deleteHistory(userId, recordId);

    sendSuccess(res, null);
  } catch (error: any) {
    console.error('删除占卜历史记录失败:', error);

    if (error.message?.includes('不存在') || error.message?.includes('不属于')) {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

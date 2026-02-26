import { Response } from 'express';
import * as tarotService from '../services/tarot/tarot.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendBadRequest,
  sendInternalError,
} from '../utils/response';

export async function generateReading(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendBadRequest(res, '未认证');
      return;
    }

    const userId = req.user.userId;
    const question = req.body.question || req.body.query;
    const spread = req.body.spread;
    const cards = req.body.cards;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      sendBadRequest(res, '问题 (question) 必须提供且不能为空');
      return;
    }

    if (question.length > 500) {
      sendBadRequest(res, '问题长度不能超过500字符');
      return;
    }

    // ✅ 新增：验证牌阵和卡牌信息
    if (spread) {
      if (!spread.name || !spread.chineseName || typeof spread.positionCount !== 'number') {
        sendBadRequest(res, '牌阵信息 (spread) 格式错误，必须包含 name、chineseName 和 positionCount');
        return;
      }
    }

    if (cards) {
      if (!Array.isArray(cards) || cards.length === 0) {
        sendBadRequest(res, '卡牌信息 (cards) 必须是非空数组');
        return;
      }

      if (spread && cards.length !== spread.positionCount) {
        sendBadRequest(res, `卡牌数量 (${cards.length}) 与牌阵位置数量 (${spread.positionCount}) 不匹配`);
        return;
      }

      // 验证每张卡牌的必要字段
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (!card.name || !card.chineseName || !card.position) {
          sendBadRequest(res, `卡牌 ${i + 1} 缺少必要字段 (name, chineseName, position)`);
          return;
        }
        if (card.orientation !== 'upright' && card.orientation !== 'reversed') {
          sendBadRequest(res, `卡牌 ${i + 1} 的正逆位信息无效 (orientation 必须是 'upright' 或 'reversed')`);
          return;
        }
      }
    }

    console.log('[Tarot Controller] 生成塔罗解读请求', {
      userId,
      questionLength: question.length,
      hasSpread: !!spread,
      hasCards: !!cards,
      cardCount: cards?.length || 0,
      spreadName: spread?.chineseName || spread?.name,
    });

    const result = await tarotService.generateTarotReading({
      userId,
      question: question.trim(),
      spread,
      cards,
    });

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('[Tarot Controller] 生成塔罗解读失败:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });

    if (error.message?.includes('不能为空') || error.message?.includes('必须')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '生成塔罗解读失败，请稍后重试', error);
  }
}


import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { recordFortuneFeedback, FortuneFeedbackInput } from '../services/fortune.service';
import { sendSuccess, sendError } from '../utils/response.utils';

/**
 * 记录运势反馈
 * POST /api/fortune/feedback
 */
export async function postFortuneFeedback(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    const { fortune_date, profile_id, accuracy, dimension, note } = req.body;

    // Basic validation
    if (!fortune_date || !profile_id || !accuracy || !dimension) {
      return sendError(res, 400, 'Missing required fields.');
    }

    const feedbackInput: FortuneFeedbackInput = {
      userId: req.user.userId,
      profileId: profile_id,
      fortuneDate: fortune_date,
      dimension: dimension,
      accuracy: accuracy,
      note: note,
    };

    const feedbackResult = await recordFortuneFeedback(feedbackInput);

    sendSuccess(res, {
      id: feedbackResult.id,
      created_at: feedbackResult.createdAt,
    }, 'Feedback recorded successfully.');

  } catch (error: any) {
    console.error('Failed to post fortune feedback:', error);
    sendError(res, 500, 'Internal server error while recording feedback.');
  }
}

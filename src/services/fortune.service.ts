
import { pool } from '../config/database';

/**
 * 运势反馈服务模块
 */

export interface FortuneFeedbackInput {
  userId: string;
  profileId: string;
  fortuneDate: string;
  dimension: 'daily' | 'monthly' | 'yearly';
  accuracy: 'high' | 'medium' | 'low';
  note?: string;
}

export interface FortuneFeedback extends FortuneFeedbackInput {
  id: string;
  createdAt: Date;
}

/**
 * 记录或更新一条运势反馈
 * 使用 UPSERT 逻辑，允许用户当天修改反馈
 * @param feedbackData 反馈数据
 * @returns Promise<FortuneFeedback> 创建或更新后的反馈记录
 */
export async function recordFortuneFeedback(feedbackData: FortuneFeedbackInput): Promise<FortuneFeedback> {
  const { userId, profileId, fortuneDate, dimension, accuracy, note } = feedbackData;

  const query = `
    INSERT INTO fortune_feedback (user_id, profile_id, fortune_date, dimension, accuracy, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, profile_id, fortune_date, dimension)
    DO UPDATE SET accuracy = EXCLUDED.accuracy, note = EXCLUDED.note, updated_at = NOW()
    RETURNING id, user_id as "userId", profile_id as "profileId", fortune_date as "fortuneDate", dimension, accuracy, note, created_at as "createdAt";
  `;

  const values = [userId, profileId, fortuneDate, dimension, accuracy, note || null];

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Error recording fortune feedback:', error);
    throw new Error('Failed to record fortune feedback.');
  }
}

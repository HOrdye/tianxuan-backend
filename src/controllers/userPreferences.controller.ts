import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendInternalError,
} from '../utils/response';
import { UpdatePreferencesSchema } from '../types/fortune-v2';
import * as userPreferencesService from '../services/userPreferences.service';

/**
 * 用户偏好设置 Controllers
 */

/**
 * GET /api/user/preferences
 * 获取用户偏好设置
 */
export async function getPreferences(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const data = await userPreferencesService.getPreferences(req.user.userId);
    sendSuccess(res, data);
  } catch (error: any) {
    console.error('[UserPreferences] getPreferences error:', error);
    sendInternalError(res, '获取偏好设置失败', error);
  }
}

/**
 * PATCH /api/user/preferences
 * 更新用户偏好设置
 */
export async function patchPreferences(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const parsed = UpdatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.issues.map(i => i.message).join('; '));
      return;
    }

    const result = await userPreferencesService.updatePreferences(req.user.userId, parsed.data);
    sendSuccess(res, result, '偏好设置已更新');
  } catch (error: any) {
    console.error('[UserPreferences] patchPreferences error:', error);
    sendInternalError(res, '更新偏好设置失败', error);
  }
}

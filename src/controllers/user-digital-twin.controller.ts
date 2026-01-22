import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';
import * as digitalTwinService from '../services/user-digital-twin.service';

export async function getDestinyCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const card = await digitalTwinService.getDestinyCard(userId);

    sendSuccess(res, card);
  } catch (error: any) {
    console.error('获取命主名刺失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function updateDestinyCard(req: AuthRequest, res: Response): Promise<void> {
  console.log('[updateDestinyCard Controller] ===== 函数开始执行 =====');
  console.log('[updateDestinyCard Controller] req.user:', req.user ? 'exists' : 'null');
  console.log('[updateDestinyCard Controller] req.body:', req.body);
  
  try {
    console.log('[updateDestinyCard Controller] 1. 检查用户认证');
    if (!req.user) {
      console.log('[updateDestinyCard Controller] 用户未认证，返回401');
      sendUnauthorized(res);
      return;
    }

    console.log('[updateDestinyCard Controller] 2. 提取用户ID和数据');
    const userId = req.user.userId;
    const data = req.body;

    console.log('[updateDestinyCard Controller] 3. 接收请求', { userId, data });
    console.log('[updateDestinyCard Controller] 4. 调用服务层函数');
    const result = await digitalTwinService.updateDestinyCard(userId, data);
    console.log('[updateDestinyCard Controller] 5. 服务层返回', { completeness: result.completeness, eventsCount: result.events?.length || 0 });

    console.log('[updateDestinyCard Controller] 6. 发送成功响应');
    sendSuccess(res, result, '命主名刺已更新');
    console.log('[updateDestinyCard Controller] 7. 响应已发送');
  } catch (error: any) {
    console.error('[updateDestinyCard Controller] ===== 捕获到错误 =====');
    console.error('[updateDestinyCard Controller] 错误详情:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      code: error.code,
      name: error.name,
    });

    if (error.message === '用户不存在') {
      console.log('[updateDestinyCard Controller] 用户不存在，返回404');
      sendNotFound(res, error.message);
      return;
    }

    console.log('[updateDestinyCard Controller] 返回500错误');
    sendInternalError(res, undefined, error);
  }
  console.log('[updateDestinyCard Controller] ===== 函数执行结束 =====');
}

export async function getCompleteness(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const result = await digitalTwinService.getCompleteness(userId);

    sendSuccess(res, result);
  } catch (error: any) {
    console.error('获取资料完整度失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function syncBirthdayToContext(
  req: AuthRequest,
  res: Response
): Promise<void> {
  console.log('[syncBirthdayToContext Controller] ===== 函数开始执行 =====');
  try {
    if (!req.user) {
      console.log('[syncBirthdayToContext Controller] 用户未认证');
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    // 统一字段映射：支持 birthday（前端）、birthDate（camelCase）、birth_date（snake_case）
    const birthday = req.body.birthday || req.body.birthDate || req.body.birth_date;
    const birthTime = req.body.birthTime || req.body.birth_time;
    const birthLocation = req.body.birthLocation || req.body.birth_location;
    const gender = req.body.gender;

    console.log('[syncBirthdayToContext Controller] 接收请求', { userId, birthday, gender });

    if (!birthday) {
      console.log('[syncBirthdayToContext Controller] birthday 缺失');
      sendBadRequest(res, 'birthday 必须提供（支持 birthday、birthDate、birth_date）');
      return;
    }

    console.log('[syncBirthdayToContext Controller] 调用服务层');
    const result = await digitalTwinService.syncBirthdayToContext(userId, {
      birthDate: birthday,
      birthTime,
      birthLocation,
      gender,
    });

    console.log('[syncBirthdayToContext Controller] 同步成功', result);
    sendSuccess(res, result, '生辰信息已同步到命主名刺');
    console.log('[syncBirthdayToContext Controller] 响应已发送');
  } catch (error: any) {
    console.error('[syncBirthdayToContext Controller] ===== 捕获到错误 =====');
    console.error('[syncBirthdayToContext Controller] 错误详情:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      code: error.code,
    });

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    if (error.message?.includes('锁定')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
  console.log('[syncBirthdayToContext Controller] ===== 函数执行结束 =====');
}

export async function getImplicitTraits(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const traits = await digitalTwinService.getImplicitTraits(userId);

    sendSuccess(res, traits);
  } catch (error: any) {
    console.error('获取隐性信息失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function updateImplicitTraits(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const traits = req.body;

    const result = await digitalTwinService.updateImplicitTraits(userId, traits);

    sendSuccess(res, result, '隐性信息已更新');
  } catch (error: any) {
    console.error('更新隐性信息失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

export async function deleteImplicitTraits(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { fields } = req.body;

    const result = await digitalTwinService.deleteImplicitTraits(userId, fields);

    sendSuccess(res, result, '已删除指定的隐性信息');
  } catch (error: any) {
    console.error('删除隐性信息失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

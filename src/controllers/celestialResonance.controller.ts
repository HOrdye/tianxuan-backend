import { Response } from 'express';
import * as celestialResonanceService from '../services/celestialResonance.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendUnauthorized, sendBadRequest, sendNotFound, sendInternalError } from '../utils/response';
import {
  CalibrationData,
  ResonanceParams,
} from '../types/celestial-resonance';

/**
 * 天感·今日气象控制器模块
 * 处理定念、共振、显化、解码相关的 HTTP 请求和响应
 */

/**
 * 定念控制器
 * POST /api/celestial-resonance/calibrate
 * 
 * 记录用户输入数据（定念阶段）
 */
export async function calibrate(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { 
      profileId,      // camelCase (前端)
      profile_id,     // snake_case (后端)
      calibrationData,
      calibration_data,
    } = req.body;

    // 获取 profileId（优先使用 camelCase，兼容 snake_case）
    const profileIdValue = profileId || profile_id || 'self';

    // 获取 calibrationData（优先使用 camelCase，兼容 snake_case）
    const calibrationDataValue: CalibrationData = calibrationData || calibration_data;

    // 参数验证
    if (!calibrationDataValue) {
      sendBadRequest(res, '定念数据（calibrationData）必须提供');
      return;
    }

    // 验证定念数据格式
    if (!calibrationDataValue.duration || 
        !calibrationDataValue.timestamp || 
        calibrationDataValue.hour === undefined) {
      sendBadRequest(res, '定念数据格式错误：必须包含 duration、timestamp、hour 字段');
      return;
    }

    // 获取今日日期（服务器时区）
    const today = new Date();
    const resonanceDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // 计算共振参数
    const resonanceParams = await celestialResonanceService.calculateResonanceParams(
      userId,
      profileIdValue,
      calibrationDataValue
    );

    // 生成显化数据（内部会获取紫微流日数据）
    const manifestationData = await celestialResonanceService.generateManifestation(
      userId,
      profileIdValue,
      resonanceParams
    );

    // 获取紫微流日数据（用于保存记录）
    const ziweiLiudayData = await celestialResonanceService.getZiweiLiudayData(
      userId,
      profileIdValue
    );

    // 保存天感记录
    const recordId = await celestialResonanceService.saveResonanceRecord(
      userId,
      profileIdValue,
      resonanceDate,
      calibrationDataValue,
      resonanceParams,
      manifestationData,
      ziweiLiudayData
    );

    // 返回成功结果
    sendSuccess(res, {
      recordId,
      resonanceParams,
      manifestationData,
    }, '定念成功，共振参数已生成');
  } catch (error: any) {
    console.error('定念失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '定念失败', error);
  }
}

/**
 * 共振控制器
 * POST /api/celestial-resonance/resonate
 * 
 * 生成能量图谱（共振阶段）
 * 注意：此接口主要用于重新生成共振参数，通常与定念阶段合并
 */
export async function resonate(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { 
      profileId,      // camelCase (前端)
      profile_id,     // snake_case (后端)
      calibrationData,
      calibration_data,
    } = req.body;

    // 获取 profileId（优先使用 camelCase，兼容 snake_case）
    const profileIdValue = profileId || profile_id || 'self';

    // 获取 calibrationData（优先使用 camelCase，兼容 snake_case）
    const calibrationDataValue: CalibrationData = calibrationData || calibration_data;

    // 参数验证
    if (!calibrationDataValue) {
      sendBadRequest(res, '定念数据（calibrationData）必须提供');
      return;
    }

    // 计算共振参数
    const resonanceParams = await celestialResonanceService.calculateResonanceParams(
      userId,
      profileIdValue,
      calibrationDataValue
    );

    // 返回成功结果
    sendSuccess(res, {
      resonanceParams,
    }, '共振参数生成成功');
  } catch (error: any) {
    console.error('共振失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '共振失败', error);
  }
}

/**
 * 获取显化结果控制器
 * GET /api/celestial-resonance/manifestation/:id
 * 
 * 获取今日图腾（显化阶段）
 */
export async function getManifestation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { id } = req.params;

    // 参数验证
    if (!id) {
      sendBadRequest(res, '记录ID必须提供');
      return;
    }

    // 获取记录
    const record = await celestialResonanceService.getRecord(id);

    if (!record) {
      sendNotFound(res, '记录不存在');
      return;
    }

    // 验证用户权限（确保用户只能访问自己的记录）
    if (record.userId !== userId) {
      sendUnauthorized(res, '无权访问此记录');
      return;
    }

    // 返回显化数据
    sendSuccess(res, {
      recordId: record.id,
      resonanceDate: record.resonanceDate,
      manifestationData: record.manifestationData,
      isDecoded: record.isDecoded,
    });
  } catch (error: any) {
    console.error('获取显化结果失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '获取显化结果失败', error);
  }
}

/**
 * 获取今日显化结果控制器
 * GET /api/celestial-resonance/manifestation/today
 * 
 * 获取今日图腾（显化阶段）
 */
export async function getTodayManifestation(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { 
      profileId,      // camelCase (前端)
      profile_id,     // snake_case (后端)
      date,
    } = req.query;

    // 获取 profileId（优先使用 camelCase，兼容 snake_case）
    const profileIdValue = (profileId as string) || (profile_id as string) || 'self';

    // 获取日期（可选，默认今天）
    const resonanceDate = date ? (date as string) : undefined;

    // 获取今日记录
    const record = await celestialResonanceService.getTodayRecord(
      userId,
      profileIdValue,
      resonanceDate
    );

    if (!record) {
      sendNotFound(res, '今日记录不存在');
      return;
    }

    // 返回显化数据
    sendSuccess(res, {
      recordId: record.id,
      resonanceDate: record.resonanceDate,
      manifestationData: record.manifestationData,
      isDecoded: record.isDecoded,
    });
  } catch (error: any) {
    console.error('获取今日显化结果失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, '获取今日显化结果失败', error);
  }
}

/**
 * 解码控制器
 * POST /api/celestial-resonance/decode
 * 
 * 免费获取专业解读（解码阶段）
 * 注意：解码功能免费向所有注册用户开放，无需扣费
 */
export async function decode(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { recordId, record_id } = req.body;

    // 获取 recordId（优先使用 camelCase，兼容 snake_case）
    const recordIdValue = recordId || record_id;

    // 参数验证
    if (!recordIdValue) {
      sendBadRequest(res, '记录ID（recordId）必须提供');
      return;
    }

    // 获取记录
    const record = await celestialResonanceService.getRecord(recordIdValue);

    if (!record) {
      sendNotFound(res, '记录不存在');
      return;
    }

    // 验证用户权限（确保用户只能解码自己的记录）
    if (record.userId !== userId) {
      sendUnauthorized(res, '无权访问此记录');
      return;
    }

    // 检查是否已解码
    if (record.isDecoded) {
      // 如果已解码，直接返回解码数据
      sendSuccess(res, {
        recordId: record.id,
        decodingData: record.decodingData,
      }, '解码数据已存在');
      return;
    }

    // 生成解码数据（免费，无需扣费）
    const decodingData = await celestialResonanceService.generateDecoding(recordIdValue);

    // 保存解码数据
    await celestialResonanceService.saveDecodingData(recordIdValue, decodingData);

    // 返回成功结果
    sendSuccess(res, {
      recordId: record.id,
      decodingData,
    }, '解码成功');
  } catch (error: any) {
    console.error('解码失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    if (error.message?.includes('记录不存在')) {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, '解码失败', error);
  }
}

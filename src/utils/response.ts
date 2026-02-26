import { Response } from 'express';
import { ApiResponse, SuccessResponse, ErrorResponse } from '../types/response';

/**
 * 响应工具函数
 * 用于统一所有 API 的返回格式
 */

/**
 * 发送成功响应
 * 
 * @param res Express Response 对象
 * @param data 响应数据
 * @param message 成功消息（可选）
 * @param statusCode HTTP 状态码（默认 200）
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  if (res.headersSent) {
    console.error('⚠️ [Response] 响应头已发送，无法发送成功响应');
    return;
  }

  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  try {
    res.status(statusCode).json(response);
  } catch (err) {
    console.error('❌ [Response] 发送成功响应失败:', err);
  }
}

/**
 * 发送错误响应
 * 
 * @param res Express Response 对象
 * @param error 错误类型标识
 * @param message 错误消息（可选）
 * @param statusCode HTTP 状态码（默认 400）
 */
export function sendError(
  res: Response,
  error: string,
  message?: string,
  statusCode: number = 400
): void {
  if (res.headersSent) {
    console.error('⚠️ [Response] 响应头已发送，无法发送错误响应');
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error,
  };

  if (message) {
    response.message = message;
  }

  try {
    res.status(statusCode).json(response);
  } catch (err) {
    console.error('❌ [Response] 发送错误响应失败:', err);
  }
}

/**
 * 发送未认证错误
 * 
 * @param res Express Response 对象
 * @param message 错误消息（可选）
 */
export function sendUnauthorized(
  res: Response,
  message: string = '未认证'
): void {
  sendError(res, '未认证', message, 401);
}

/**
 * 发送未授权错误（权限不足）
 * 
 * @param res Express Response 对象
 * @param message 错误消息（可选）
 */
export function sendForbidden(
  res: Response,
  message: string = '权限不足'
): void {
  sendError(res, '权限不足', message, 403);
}

/**
 * 发送资源不存在错误
 * 
 * @param res Express Response 对象
 * @param message 错误消息（可选）
 */
export function sendNotFound(
  res: Response,
  message: string = '资源不存在'
): void {
  sendError(res, '资源不存在', message, 404);
}

/**
 * 发送参数错误
 * 
 * @param res Express Response 对象
 * @param message 错误消息
 */
export function sendBadRequest(
  res: Response,
  message: string = '参数错误'
): void {
  sendError(res, '参数错误', message, 400);
}

/**
 * 发送服务器内部错误
 * 
 * @param res Express Response 对象
 * @param message 错误消息（可选，开发环境会显示详细错误）
 * @param error 原始错误对象（可选，用于日志记录）
 */
export function sendInternalError(
  res: Response,
  message: string = '服务器内部错误',
  error?: any
): void {
  // 如果响应头已发送，只记录错误，不尝试发送响应
  if (res.headersSent) {
    console.error('⚠️ [Response] 响应头已发送，无法发送内部错误响应');
    if (error) {
      console.error('❌ Internal Server Error (响应已发送):', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    return;
  }

  // 记录详细错误信息
  if (error) {
    console.error('❌ Internal Server Error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
  }

  const errorMessage = error instanceof Error ? error.message : (error != null ? String(error) : '');
  const response: ErrorResponse = {
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' && errorMessage
      ? `${message}: ${errorMessage}`
      : message,
  };

  try {
    res.status(500).json(response);
  } catch (err) {
    console.error('❌ [Response] 发送内部错误响应失败:', err);
    // 如果发送响应失败，尝试直接结束响应
    if (!res.headersSent) {
      try {
        res.end();
      } catch (endErr) {
        console.error('❌ [Response] 结束响应失败:', endErr);
      }
    }
  }
}

/**
 * 发送冲突错误（如资源已存在）
 * 
 * @param res Express Response 对象
 * @param message 错误消息
 */
export function sendConflict(
  res: Response,
  message: string
): void {
  sendError(res, '资源冲突', message, 409);
}

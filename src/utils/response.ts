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
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
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
  const response: ErrorResponse = {
    success: false,
    error,
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
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
  message?: string,
  error?: any
): void {
  // 记录错误日志
  if (error) {
    console.error('服务器内部错误:', error);
  }

  const errorMessage = process.env.NODE_ENV === 'development' && error
    ? error.message || message || '服务器内部错误'
    : message || '服务器内部错误';

  sendError(res, '服务器内部错误', errorMessage, 500);
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

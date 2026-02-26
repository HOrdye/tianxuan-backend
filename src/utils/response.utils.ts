
import { Response } from 'express';

/**
 * 发送成功的响应
 * @param res Response 对象
 * @param data 要发送的数据
 * @param message 成功的消息
 */
export function sendSuccess(res: Response, data: any, message: string = 'Success') {
  res.status(200).json({
    success: true,
    message,
    data,
  });
}

/**
 * 发送错误的响应
 * @param res Response 对象
 * @param statusCode HTTP 状态码
 * @param error 错误信息
 * @param message 错误的详细消息
 */
export function sendError(res: Response, statusCode: number, error: string, message?: string) {
  res.status(statusCode).json({
    success: false,
    error,
    message,
  });
}

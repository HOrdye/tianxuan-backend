import { Response } from 'express';
import * as taskService from '../services/task.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  sendSuccess,
  sendUnauthorized,
  sendBadRequest,
  sendNotFound,
  sendInternalError,
} from '../utils/response';

/**
 * 任务控制器模块
 * 处理任务相关的 HTTP 请求和响应
 */

/**
 * 获取用户所有任务状态控制器
 * GET /api/tasks
 */
export async function getUserTasks(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取用户所有任务
    const tasks = await taskService.getUserTasks(userId);

    // 返回任务列表
    sendSuccess(res, { tasks }, '获取成功');
  } catch (error: any) {
    console.error('获取用户任务失败:', error);
    sendInternalError(res, undefined, error);
  }
}

/**
 * 完成任务控制器
 * POST /api/tasks/complete
 */
export async function completeTask(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { taskType } = req.body;

    // 验证输入
    if (!taskType) {
      sendBadRequest(res, '请提供任务类型');
      return;
    }

    // 完成任务
    const result = await taskService.completeTask(userId, taskType);

    // 返回结果
    sendSuccess(res, result, result.alreadyCompleted ? '任务已完成' : '任务已完成');
  } catch (error: any) {
    console.error('完成任务失败:', error);

    if (error.message?.includes('参数错误') || error.message?.includes('无效的任务类型')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 领取任务奖励控制器
 * POST /api/tasks/claim
 */
export async function claimTaskReward(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const { taskType } = req.body;

    // 验证输入
    if (!taskType) {
      sendBadRequest(res, '请提供任务类型');
      return;
    }

    // 领取奖励
    const result = await taskService.claimTaskReward(userId, taskType);

    // 返回结果
    if (result.alreadyClaimed) {
      sendSuccess(res, { coinsGranted: result.coinsGranted }, '奖励已领取');
    } else {
      sendSuccess(res, { coinsGranted: result.coinsGranted }, '奖励已领取');
    }
  } catch (error: any) {
    console.error('领取任务奖励失败:', error);

    if (error.message?.includes('参数错误') || 
        error.message?.includes('无效的任务类型') ||
        error.message?.includes('任务不存在') ||
        error.message?.includes('任务尚未完成')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 初始化新用户任务控制器
 * POST /api/tasks/initialize
 */
export async function initializeUserTasks(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 初始化任务
    await taskService.initializeUserTasks(userId);

    // 返回成功
    sendSuccess(res, { success: true }, '任务初始化成功');
  } catch (error: any) {
    console.error('初始化用户任务失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

/**
 * 获取任务完成进度控制器
 * GET /api/tasks/progress
 */
export async function getTaskProgress(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;

    // 获取任务进度
    const progress = await taskService.getTaskProgress(userId);

    // 返回进度
    sendSuccess(res, progress, '获取成功');
  } catch (error: any) {
    console.error('获取任务进度失败:', error);

    if (error.message?.includes('参数错误')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}

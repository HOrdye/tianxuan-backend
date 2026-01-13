import { Response } from 'express';
import * as resonanceService from '../services/resonance.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * 共振反馈控制器模块
 * 处理反馈相关的 HTTP 请求和响应
 */

/**
 * 提交反馈控制器
 * POST /api/resonance/feedback
 */
export async function submitFeedback(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { feedback_type, content, rating, metadata } = req.body;

    // 参数验证
    if (!feedback_type || !content) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '反馈类型和反馈内容必须提供',
      });
      return;
    }

    // 执行提交
    const result = await resonanceService.submitFeedback(
      userId,
      feedback_type,
      content,
      rating,
      metadata
    );

    // 返回成功结果
    res.status(200).json({
      success: true,
      message: result.message || '反馈提交成功',
      data: {
        feedback_id: result.feedback_id,
      },
    });
  } catch (error: any) {
    console.error('提交反馈失败:', error);

    // 根据错误类型返回不同的状态码
    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    if (error.message?.includes('用户不存在')) {
      res.status(404).json({
        success: false,
        error: '用户不存在',
        message: error.message,
      });
      return;
    }

    // 其他错误
    res.status(500).json({
      success: false,
      error: '提交反馈失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 检查反馈状态控制器
 * GET /api/resonance/feedback/check
 */
export async function checkFeedbackStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;
    const { feedback_id } = req.query;

    // 参数验证
    if (!feedback_id) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '反馈ID必须提供',
      });
      return;
    }

    // 查询反馈状态
    const status = await resonanceService.checkFeedbackStatus(
      userId,
      feedback_id as string
    );

    if (status === null) {
      res.status(404).json({
        success: false,
        error: '反馈不存在',
      });
      return;
    }

    // 返回反馈状态
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('查询反馈状态失败:', error);

    if (error.message?.includes('参数错误')) {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '查询反馈状态失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 获取反馈统计控制器
 * GET /api/resonance/feedback/stats
 */
export async function getFeedbackStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '未认证',
      });
      return;
    }

    const userId = req.user.userId;

    // 获取统计信息（只统计当前用户的反馈）
    const stats = await resonanceService.getFeedbackStats(userId);

    // 返回统计信息
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('获取反馈统计失败:', error);

    res.status(500).json({
      success: false,
      error: '获取反馈统计失败',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

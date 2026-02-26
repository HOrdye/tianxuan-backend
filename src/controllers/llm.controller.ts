import { Response } from 'express';
import * as llmService from '../services/llm.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess, sendError, sendBadRequest, sendInternalError } from '../utils/response';

/**
 * LLM 控制器模块
 * 处理 LLM API 调用相关的 HTTP 请求和响应
 */

/**
 * 调用 LLM API（非流式）
 * POST /api/llm/chat
 */
export async function chat(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendError(res, '未认证', '请先登录', 401);
      return;
    }

    const userId = req.user.userId;

    // 支持 camelCase 和 snake_case 参数名
    const prompt = req.body.prompt || req.body.message;
    const model = req.body.model;
    const provider = req.body.provider;
    const temperature = req.body.temperature ?? req.body.temp;
    const maxTokens = req.body.maxTokens ?? req.body.max_tokens;
    const systemPrompt = req.body.systemPrompt ?? req.body.system_prompt;
    const extraParams = req.body.extraParams ?? req.body.extra_params;

    // 参数验证
    if (!prompt || typeof prompt !== 'string') {
      sendBadRequest(res, '提示词 (prompt 或 message) 必须提供且为字符串');
      return;
    }

    if (prompt.trim().length === 0) {
      sendBadRequest(res, '提示词不能为空');
      return;
    }

    // 验证 temperature
    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        sendBadRequest(res, '温度参数 (temperature) 必须在 0-2 之间');
        return;
      }
    }

    // 验证 maxTokens
    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens <= 0) {
        sendBadRequest(res, '最大 token 数 (maxTokens) 必须为正整数');
        return;
      }
    }

    console.log(`[LLM Controller] 用户 ${userId} 请求 LLM 调用`, {
      promptLength: prompt.length,
      model,
      provider,
      temperature,
      maxTokens,
      hasSystemPrompt: !!systemPrompt,
    });

    // 调用 LLM 服务
    const result = await llmService.callLLM({
      prompt,
      model,
      provider,
      temperature,
      maxTokens,
      systemPrompt,
      extraParams,
    });

    // 返回成功响应（符合三维决策API规范）
    sendSuccess(res, {
      content: result.content,
    });
  } catch (error: any) {
    console.error('[LLM Controller] 调用失败', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });

    // 根据错误类型返回不同的状态码
    if (error.message.includes('环境变量未配置')) {
      sendInternalError(res, 'LLM 服务配置错误，请联系管理员', error);
      return;
    }

    if (error.message.includes('参数错误') || error.message.includes('必须')) {
      sendBadRequest(res, error.message);
      return;
    }

    // 其他错误统一返回 500
    sendInternalError(res, 'LLM 调用失败，请稍后重试', error);
  }
}

/**
 * 调用 LLM API（流式）
 * POST /api/llm/chat/stream
 */
export async function chatStream(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendError(res, '未认证', '请先登录', 401);
      return;
    }

    const userId = req.user.userId;

    // 支持 camelCase 和 snake_case 参数名
    const prompt = req.body.prompt || req.body.message;
    const model = req.body.model;
    const provider = req.body.provider;
    const temperature = req.body.temperature ?? req.body.temp;
    const maxTokens = req.body.maxTokens ?? req.body.max_tokens;
    const systemPrompt = req.body.systemPrompt ?? req.body.system_prompt;
    const extraParams = req.body.extraParams ?? req.body.extra_params;

    // 参数验证
    if (!prompt || typeof prompt !== 'string') {
      sendBadRequest(res, '提示词 (prompt 或 message) 必须提供且为字符串');
      return;
    }

    if (prompt.trim().length === 0) {
      sendBadRequest(res, '提示词不能为空');
      return;
    }

    // 验证 temperature
    if (temperature !== undefined) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
        sendBadRequest(res, '温度参数 (temperature) 必须在 0-2 之间');
        return;
      }
    }

    // 验证 maxTokens
    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || maxTokens <= 0) {
        sendBadRequest(res, '最大 token 数 (maxTokens) 必须为正整数');
        return;
      }
    }

    console.log(`[LLM Controller] 用户 ${userId} 请求 LLM 流式调用`, {
      promptLength: prompt.length,
      model,
      provider,
      temperature,
      maxTokens,
      hasSystemPrompt: !!systemPrompt,
    });

    // 设置流式响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    // 调用 LLM 服务（流式）
    const stream = llmService.callLLMStream({
      prompt,
      model,
      provider,
      temperature,
      maxTokens,
      systemPrompt,
      extraParams,
    });

    // 发送流式数据
    try {
      for await (const chunk of stream) {
        // SSE 格式：data: <content>\n\n
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      // 发送结束标记
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamError: any) {
      console.error('[LLM Controller] 流式响应错误', {
        error: streamError.message,
        userId,
      });

      // 发送错误信息
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('[LLM Controller] 流式调用失败', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.userId,
    });

    // 如果响应头还没发送，返回错误响应
    if (!res.headersSent) {
      if (error.message.includes('环境变量未配置')) {
        sendInternalError(res, 'LLM 服务配置错误，请联系管理员', error);
        return;
      }

      if (error.message.includes('参数错误') || error.message.includes('必须')) {
        sendBadRequest(res, error.message);
        return;
      }

      sendInternalError(res, 'LLM 调用失败，请稍后重试', error);
    } else {
      // 响应头已发送，只能关闭连接
      res.end();
    }
  }
}

/**
 * 获取 LLM 配置信息（只读）
 * GET /api/llm/config
 */
export async function getConfig(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // 检查认证
    if (!req.user) {
      sendError(res, '未认证', '请先登录', 401);
      return;
    }

    // 获取配置（不包含敏感信息）
    let config;
    try {
      const fullConfig = llmService.getLLMConfig();
      config = {
        provider: fullConfig.provider,
        baseUrl: fullConfig.baseUrl,
        defaultModel: fullConfig.defaultModel,
        // 不返回 apiKey
      };
    } catch (error: any) {
      // 配置未设置
      sendSuccess(res, {
        provider: null,
        baseUrl: null,
        defaultModel: null,
        configured: false,
      }, 'LLM 配置未设置');
      return;
    }

    // 返回配置信息
    sendSuccess(res, {
      ...config,
      configured: true,
    }, '获取配置成功');
  } catch (error: any) {
    console.error('[LLM Controller] 获取配置失败', {
      error: error.message,
      userId: req.user?.userId,
    });

    sendInternalError(res, '获取配置失败', error);
  }
}

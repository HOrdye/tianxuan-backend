/**
 * LLM 服务模块
 * 提供统一的 LLM API 调用接口，支持 DeepSeek 和 OpenAI
 * API Key 由后端统一管理，通过环境变量配置
 * 
 * 使用官方的 OpenAI SDK，DeepSeek API 完全兼容 OpenAI 格式
 */

import OpenAI from 'openai';

/**
 * LLM 提供商类型
 */
export type LLMProvider = 'deepseek' | 'openai';

/**
 * LLM 调用请求参数
 */
export interface LLMCallRequest {
  /** 提示词内容 */
  prompt: string;
  /** 模型名称（可选，默认使用环境变量配置） */
  model?: string;
  /** 提供商（可选，默认使用环境变量配置） */
  provider?: LLMProvider;
  /** 温度参数（0-2，默认 0.7） */
  temperature?: number;
  /** 最大 token 数（可选） */
  maxTokens?: number;
  /** 系统提示词（可选） */
  systemPrompt?: string;
  /** 是否流式返回（默认 false） */
  stream?: boolean;
  /** 其他参数（可选） */
  extraParams?: Record<string, any>;
}

/**
 * LLM 调用响应结果
 */
export interface LLMCallResponse {
  /** 响应内容 */
  content: string;
  /** 使用的模型 */
  model: string;
  /** 使用的提供商 */
  provider: LLMProvider;
  /** 消耗的 token 数（如果 API 返回） */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** 完成原因 */
  finishReason?: string;
}

/**
 * LLM 配置接口
 */
export interface LLMConfig {
  /** 提供商 */
  provider: LLMProvider;
  /** API Key */
  apiKey: string;
  /** Base URL */
  baseUrl: string;
  /** 默认模型 */
  defaultModel: string;
}

/**
 * 创建 OpenAI 客户端实例
 * DeepSeek API 完全兼容 OpenAI 格式，可以直接使用 OpenAI SDK
 * 
 * @param provider 提供商（可选，默认从环境变量读取）
 * @returns OpenAI 客户端实例
 * @throws Error 如果配置不完整
 */
function createOpenAIClient(provider?: LLMProvider): OpenAI {
  // 确定使用的提供商
  const targetProvider: LLMProvider = provider || 
    (process.env.LLM_PROVIDER as LLMProvider) || 
    'deepseek';

  let apiKey: string;
  let baseURL: string;

  if (targetProvider === 'deepseek') {
    apiKey = process.env.DEEPSEEK_API_KEY || '';
    baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
    }
  } else if (targetProvider === 'openai') {
    apiKey = process.env.OPENAI_API_KEY || '';
    baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 环境变量未配置');
    }
  } else {
    throw new Error(`不支持的 LLM 提供商: ${targetProvider}`);
  }

  // 创建 OpenAI 客户端（DeepSeek 兼容 OpenAI 格式）
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

/**
 * 获取 LLM 配置
 * 从环境变量读取配置
 * 
 * @param provider 提供商（可选，默认从环境变量读取）
 * @returns LLMConfig 配置对象
 * @throws Error 如果配置不完整
 */
export function getLLMConfig(provider?: LLMProvider): LLMConfig {
  // 确定使用的提供商
  const targetProvider: LLMProvider = provider || 
    (process.env.LLM_PROVIDER as LLMProvider) || 
    'deepseek';

  if (targetProvider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const defaultModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
    }

    return {
      provider: 'deepseek',
      apiKey,
      baseUrl,
      defaultModel,
    };
  } else if (targetProvider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const defaultModel = process.env.OPENAI_MODEL || 'gpt-4o';

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY 环境变量未配置');
    }

    return {
      provider: 'openai',
      apiKey,
      baseUrl,
      defaultModel,
    };
  } else {
    throw new Error(`不支持的 LLM 提供商: ${targetProvider}`);
  }
}

/**
 * 调用 LLM API（非流式）
 * 使用 OpenAI SDK，自动处理重试、错误处理等复杂逻辑
 * 
 * @param request LLM 调用请求参数
 * @returns Promise<LLMCallResponse> LLM 响应结果
 * @throws Error 如果调用失败
 */
export async function callLLM(request: LLMCallRequest): Promise<LLMCallResponse> {
  // 参数验证
  if (!request.prompt || typeof request.prompt !== 'string') {
    throw new Error('提示词 (prompt) 必须提供且为字符串');
  }

  // 获取配置
  const config = getLLMConfig(request.provider);
  const model = request.model || config.defaultModel;
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.maxTokens;

  // 创建 OpenAI 客户端
  const client = createOpenAIClient(request.provider);

  // 构建消息列表
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  
  if (request.systemPrompt) {
    messages.push({
      role: 'system',
      content: request.systemPrompt,
    });
  }
  
  messages.push({
    role: 'user',
    content: request.prompt,
  });

  console.log(`[LLM Service] 调用 ${config.provider} API`, {
    model,
    messageCount: messages.length,
    hasSystemPrompt: !!request.systemPrompt,
  });

  try {
    // 构建请求参数
    const requestParams: any = {
      model,
      messages,
      temperature,
    };

    if (maxTokens) {
      requestParams.max_tokens = maxTokens;
    }

    // 合并额外参数
    if (request.extraParams) {
      Object.assign(requestParams, request.extraParams);
    }

    // 调用 OpenAI SDK（DeepSeek 兼容 OpenAI 格式）
    const completion = await client.chat.completions.create(requestParams);

    // 提取响应内容
    const choice = completion.choices?.[0];
    if (!choice) {
      throw new Error('LLM API 响应格式错误：未找到 choices');
    }

    const content = choice.message?.content || '';
    if (!content) {
      throw new Error('LLM API 响应为空');
    }

    // 构建响应对象
    const result: LLMCallResponse = {
      content,
      model: completion.model || model,
      provider: config.provider,
      finishReason: choice.finish_reason || undefined,
    };

    // 提取 token 使用情况
    if (completion.usage) {
      result.usage = {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      };
    }

    console.log(`[LLM Service] API 调用成功`, {
      model: result.model,
      contentLength: content.length,
      usage: result.usage,
    });

    return result;
  } catch (error: any) {
    console.error(`[LLM Service] 调用异常`, {
      error: error.message,
      stack: error.stack,
      provider: config.provider,
    });
    
    // 重新抛出错误
    throw error;
  }
}

/**
 * 调用 LLM API（流式）
 * 使用 OpenAI SDK 的流式接口，自动处理 SSE 解析
 * 返回一个异步生成器，逐块返回响应内容
 * 
 * @param request LLM 调用请求参数
 * @returns AsyncGenerator<string> 流式响应内容
 * @throws Error 如果调用失败
 */
export async function* callLLMStream(request: LLMCallRequest): AsyncGenerator<string> {
  // 参数验证
  if (!request.prompt || typeof request.prompt !== 'string') {
    throw new Error('提示词 (prompt) 必须提供且为字符串');
  }

  // 获取配置
  const config = getLLMConfig(request.provider);
  const model = request.model || config.defaultModel;
  const temperature = request.temperature ?? 0.7;
  const maxTokens = request.maxTokens;

  // 创建 OpenAI 客户端
  const client = createOpenAIClient(request.provider);

  // 构建消息列表
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  
  if (request.systemPrompt) {
    messages.push({
      role: 'system',
      content: request.systemPrompt,
    });
  }
  
  messages.push({
    role: 'user',
    content: request.prompt,
  });

  console.log(`[LLM Service] 调用 ${config.provider} API (流式)`, {
    model,
    messageCount: messages.length,
    hasSystemPrompt: !!request.systemPrompt,
  });

  try {
    // 构建请求参数
    const requestParams: any = {
      model,
      messages,
      temperature,
      stream: true, // 开启流式
    };

    if (maxTokens) {
      requestParams.max_tokens = maxTokens;
    }

    // 合并额外参数
    if (request.extraParams) {
      Object.assign(requestParams, request.extraParams);
    }

    // 调用 OpenAI SDK 流式接口（DeepSeek 兼容 OpenAI 格式）
    // 当 stream: true 时，返回的是 Stream<ChatCompletionChunk>
    const stream = await client.chat.completions.create(requestParams);

    // SDK 自动处理了复杂的 SSE 解析和流式传输
    // 流式响应是一个异步迭代器
    if (Symbol.asyncIterator in stream) {
      for await (const chunk of stream as AsyncIterable<any>) {
        const content = chunk.choices?.[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
    } else {
      throw new Error('流式响应格式错误');
    }
  } catch (error: any) {
    console.error(`[LLM Service] 流式调用异常`, {
      error: error.message,
      stack: error.stack,
      provider: config.provider,
    });
    
    // 重新抛出错误
    throw error;
  }
}

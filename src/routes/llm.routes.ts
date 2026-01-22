import { Router } from 'express';
import {
  chat,
  chatStream,
  getConfig,
} from '../controllers/llm.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * LLM 路由模块
 * 定义 LLM API 调用相关的路由
 */

const router = Router();

/**
 * POST /api/llm/chat
 * 调用 LLM API（非流式）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：
 * {
 *   "prompt": "你好，请介绍一下自己",  // 必填：提示词
 *   "model": "deepseek-chat",          // 可选：模型名称（默认使用环境变量配置）
 *   "provider": "deepseek",            // 可选：提供商 deepseek|openai（默认使用环境变量配置）
 *   "temperature": 0.7,                // 可选：温度参数 0-2（默认 0.7）
 *   "maxTokens": 1000,                 // 可选：最大 token 数
 *   "systemPrompt": "你是一个助手",    // 可选：系统提示词
 *   "extraParams": {}                  // 可选：其他参数
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "LLM 调用成功",
 *   "data": {
 *     "content": "你好！我是...",
 *     "model": "deepseek-chat",
 *     "provider": "deepseek",
 *     "usage": {
 *       "promptTokens": 10,
 *       "completionTokens": 20,
 *       "totalTokens": 30
 *     },
 *     "finishReason": "stop"
 *   }
 * }
 */
router.post('/chat', authenticateToken, chat);

/**
 * POST /api/llm/chat/stream
 * 调用 LLM API（流式）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 请求体：同 /chat 接口
 * 
 * 响应：Server-Sent Events (SSE) 格式
 * data: {"content":"你好"}
 * data: {"content":"！"}
 * data: {"content":"我是"}
 * ...
 * data: [DONE]
 */
router.post('/chat/stream', authenticateToken, chatStream);

/**
 * GET /api/llm/config
 * 获取 LLM 配置信息（只读，不包含敏感信息）
 * 
 * 请求头：
 * Authorization: Bearer <token>
 * 
 * 响应：
 * {
 *   "success": true,
 *   "message": "获取配置成功",
 *   "data": {
 *     "provider": "deepseek",
 *     "baseUrl": "https://api.deepseek.com",
 *     "defaultModel": "deepseek-chat",
 *     "configured": true
 *   }
 * }
 */
router.get('/config', authenticateToken, getConfig);

export default router;

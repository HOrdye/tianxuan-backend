# LLM API 配置说明

**创建日期**: 2026-01-14  
**状态**: ✅ **已实现** - 后端统一的 LLM API 调用接口

---

## 📋 概述

后端已实现统一的 LLM API 调用接口，所有 LLM 调用都通过后端进行，API Key 由后端统一管理，通过环境变量配置。

### 核心特性

- ✅ **统一管理**: API Key 由后端统一管理，前端无需配置
- ✅ **多提供商支持**: 支持 DeepSeek 和 OpenAI
- ✅ **流式支持**: 支持流式和非流式两种调用方式
- ✅ **参数兼容**: 同时支持 camelCase 和 snake_case 参数名
- ✅ **安全认证**: 所有接口都需要 JWT Token 认证
- ✅ **使用官方 SDK**: 使用 OpenAI 官方 SDK，DeepSeek API 完全兼容 OpenAI 格式，自动处理重试、错误处理、流式传输等复杂逻辑

---

## 🔧 环境变量配置

### DeepSeek 配置（推荐）

在 `.env` 文件中添加以下配置：

```env
# LLM 提供商（deepseek 或 openai）
LLM_PROVIDER=deepseek

# DeepSeek API Key（必填）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# DeepSeek Base URL（可选，默认：https://api.deepseek.com）
DEEPSEEK_BASE_URL=https://api.deepseek.com

# DeepSeek 默认模型（可选，默认：deepseek-chat）
DEEPSEEK_MODEL=deepseek-chat
```

### OpenAI 配置

如果需要使用 OpenAI，在 `.env` 文件中添加以下配置：

```env
# LLM 提供商
LLM_PROVIDER=openai

# OpenAI API Key（必填）
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# OpenAI Base URL（可选，默认：https://api.openai.com/v1）
OPENAI_BASE_URL=https://api.openai.com/v1

# OpenAI 默认模型（可选，默认：gpt-4o）
OPENAI_MODEL=gpt-4o
```

### 配置说明

1. **LLM_PROVIDER**: 指定使用的 LLM 提供商，可选值：`deepseek`、`openai`
2. **API Key**: 必须配置对应提供商的 API Key
3. **Base URL**: 可选，如果不配置则使用默认值
4. **默认模型**: 可选，如果不配置则使用默认模型

---

## 🔌 API 接口

### 1. 调用 LLM API（非流式）

**接口**: `POST /api/llm/chat`

**认证**: 需要 JWT Token

**请求体**:
```typescript
{
  prompt: string;              // 必填：提示词
  model?: string;              // 可选：模型名称（默认使用环境变量配置）
  provider?: 'deepseek' | 'openai';  // 可选：提供商（默认使用环境变量配置）
  temperature?: number;         // 可选：温度参数 0-2（默认 0.7）
  maxTokens?: number;          // 可选：最大 token 数
  systemPrompt?: string;       // 可选：系统提示词
  extraParams?: Record<string, any>;  // 可选：其他参数
}
```

**响应**:
```typescript
{
  success: true,
  message: "LLM 调用成功",
  data: {
    content: string;           // 响应内容
    model: string;             // 使用的模型
    provider: 'deepseek' | 'openai';  // 使用的提供商
    usage?: {                  // Token 使用情况（如果 API 返回）
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    finishReason?: string;     // 完成原因
  }
}
```

**示例请求**:
```bash
curl -X POST http://localhost:3000/api/llm/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你好，请介绍一下自己",
    "temperature": 0.7
  }'
```

### 2. 调用 LLM API（流式）

**接口**: `POST /api/llm/chat/stream`

**认证**: 需要 JWT Token

**请求体**: 同非流式接口

**响应**: Server-Sent Events (SSE) 格式

**响应格式**:
```
data: {"content":"你好"}
data: {"content":"！"}
data: {"content":"我是"}
...
data: [DONE]
```

**示例请求**:
```bash
curl -X POST http://localhost:3000/api/llm/chat/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你好，请介绍一下自己",
    "temperature": 0.7
  }'
```

### 3. 获取 LLM 配置信息

**接口**: `GET /api/llm/config`

**认证**: 需要 JWT Token

**响应**:
```typescript
{
  success: true,
  message: "获取配置成功",
  data: {
    provider: 'deepseek' | 'openai' | null;
    baseUrl: string | null;
    defaultModel: string | null;
    configured: boolean;      // 是否已配置
  }
}
```

**示例请求**:
```bash
curl -X GET http://localhost:3000/api/llm/config \
  -H "Authorization: Bearer <token>"
```

---

## 💻 前端使用示例

### 使用 Axios 调用（非流式）

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加 Token 拦截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 调用 LLM API
async function callLLM(prompt: string, options?: {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}) {
  try {
    const response = await apiClient.post('/api/llm/chat', {
      prompt,
      ...options,
    });

    if (response.data.success) {
      return response.data.data.content;
    } else {
      throw new Error(response.data.error || '调用失败');
    }
  } catch (error) {
    console.error('LLM 调用失败:', error);
    throw error;
  }
}

// 使用示例
const result = await callLLM('你好，请介绍一下自己', {
  temperature: 0.7,
  systemPrompt: '你是一个友好的助手',
});
console.log(result);
```

### 使用 EventSource 调用（流式）

```typescript
async function callLLMStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
  }
) {
  const token = localStorage.getItem('authToken');
  
  // 使用 fetch 发送 POST 请求，然后读取流
  const response = await fetch(`${API_BASE_URL}/api/llm/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt,
      ...options,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('data: ')) {
        const dataStr = trimmedLine.substring(6);
        
        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const data = JSON.parse(dataStr);
          if (data.content) {
            onChunk(data.content);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}

// 使用示例
let fullContent = '';
await callLLMStream('写一首关于春天的诗', (chunk) => {
  fullContent += chunk;
  console.log('收到内容块:', chunk);
});
console.log('完整内容:', fullContent);
```

---

## 🔒 安全说明

1. **API Key 安全**: API Key 只存储在服务器端的环境变量中，永远不会暴露给前端
2. **认证要求**: 所有接口都需要 JWT Token 认证，确保只有登录用户可以使用
3. **参数验证**: 所有输入参数都经过严格验证，防止恶意输入
4. **错误处理**: 错误信息不会泄露敏感配置信息

---

## ⚠️ 注意事项

1. **环境变量配置**: 必须正确配置环境变量，否则接口调用会失败
2. **API Key 格式**: 确保 API Key 格式正确，DeepSeek 和 OpenAI 的格式不同
3. **流式响应**: 流式响应需要客户端支持 SSE（Server-Sent Events）
4. **超时设置**: 建议前端设置合理的超时时间，LLM 调用可能需要较长时间
5. **错误处理**: 建议前端实现完善的错误处理和重试机制

---

## 🐛 故障排查

### 1. 环境变量未配置

**错误信息**: `DEEPSEEK_API_KEY 环境变量未配置`

**解决方法**: 在 `.env` 文件中添加对应的 API Key 配置

### 2. API Key 无效

**错误信息**: `LLM API 调用失败: 401 Unauthorized`

**解决方法**: 检查 API Key 是否正确，是否已过期

### 3. 模型不存在

**错误信息**: `LLM API 调用失败: 404 Not Found`

**解决方法**: 检查模型名称是否正确，是否在对应提供商中可用

### 4. 流式响应中断

**可能原因**: 
- 网络连接不稳定
- 服务器超时
- 客户端未正确处理流式数据

**解决方法**: 
- 检查网络连接
- 增加超时时间
- 实现重连机制

---

## 📊 成本监控建议

建议在后端添加成本监控功能：

1. **记录每次调用**: 记录每次 LLM 调用的 token 使用情况
2. **统计成本**: 根据 token 使用量计算成本
3. **设置告警**: 当日成本超过阈值时发送告警
4. **Dashboard**: 提供成本监控 Dashboard，实时查看成本情况

---

## 🔗 相关文档

- [移除前端AI服务配置入口计划](./260114-移除前端AI服务配置入口计划.md)
- [后端API开发规范](./.cursorrules)

---

## 📌 更新记录

- **2026-01-14**: 创建 LLM API 配置说明文档，实现统一的 LLM API 调用接口

# 后端 SSE/Streaming API 实现方案

## 1. 目标
将前端模拟的流式输出 (`useCompatibilityAnalysis.ts` 中的 `simulateStreaming`) 替换为真实的后端流式 API 调用，以支持 AI 深度合盘分析的实时输出体验。

## 2. 技术选型
*   **协议**: Server-Sent Events (SSE)
    *   **理由**: 单向数据流（Server -> Client），比 WebSocket 更轻量，适合 AI 生成场景。且原生支持自动重连。
*   **框架**: Node.js / Express (假设后端架构)
*   **LLM 接入**: OpenAI SDK / LangChain (支持 `stream: true`)

## 3. API 接口定义

### 3.1 端点
`GET /api/astrology/compatibility/analyze/stream`

### 3.2 参数 (Query Params)
为了简化 SSE 连接，建议通过 Query 参数传递简单的 ID 或 Token，复杂数据建议先通过 POST 创建任务，再通过 GET 监听。

**方案 A (推荐): POST + GET**
1.  **创建任务**: `POST /api/astrology/compatibility/analyze/task`
    *   Body: `{ chartA: {...}, chartB: {...} }`
    *   Response: `{ taskId: "uuid" }`
2.  **监听流**: `GET /api/astrology/compatibility/analyze/stream?taskId=uuid`

### 3.3 数据流格式 (Event Stream)
后端将返回符合 `text/event-stream` 规范的数据。

*   **Event: `start`**
    *   Data: `{"status": "processing", "message": "开始分析..."}`
*   **Event: `chunk`** (核心内容)
    *   Data: `{"delta": "这两张命盘..."}` (增量文本)
*   **Event: `json_block`** (结构化数据块)
    *   Data: `{"type": "dimensions", "data": { ... }}` (用于前端渲染图表)
*   **Event: `done`**
    *   Data: `{"status": "completed"}`
*   **Event: `error`**
    *   Data: `{"message": "AI 服务繁忙"}`

## 4. 后端实现伪代码 (Node.js Express)

```javascript
// controller.js
export const streamAnalysis = async (req, res) => {
  const { taskId } = req.query;
  // 1. 获取任务上下文 (Chart A & B)
  const task = await TaskService.get(taskId);
  
  // 2. 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 3. 调用 LLM
  const stream = await llm.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(task.data) }
    ],
    stream: true,
  });

  // 4. 处理流
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      res.write(`event: chunk\n`);
      res.write(`data: ${JSON.stringify({ delta: content })}\n\n`);
    }
  }
  
  res.write(`event: done\n`);
  res.write(`data: {}\n\n`);
  res.end();
};
```

## 5. 前端适配计划

### 5.1 修改 `useCompatibilityAnalysis.ts`

```typescript
const startAnalysis = async (chartA, chartB) => {
  // 1. 创建任务
  const { data } = await request.post('/astrology/compatibility/analyze/task', { chartA, chartB });
  const taskId = data.taskId;

  // 2. 建立 SSE 连接
  const eventSource = new EventSource(`/api/astrology/compatibility/analyze/stream?taskId=${taskId}`);

  eventSource.addEventListener('chunk', (e) => {
    const { delta } = JSON.parse(e.data);
    analysisText.value += delta;
    // TODO: 尝试解析 Markdown 中的 JSON 块以更新 analysisResult
  });

  eventSource.addEventListener('done', () => {
    eventSource.close();
    isAnalyzing.value = false;
  });
  
  eventSource.onerror = (e) => {
    error.value = '连接中断';
    eventSource.close();
  };
};
```

## 6. Token 优化策略
为了降低成本并提高速度：
1.  **精简输入**: 只提取命宫、身宫、三方四正的主星列表，去除无关的辅助星和具体坐标。
2.  **分步生成**: 先生成 JSON 结构 (Dimensions)，再生成长文本建议。或者反之。

## 7. 下一步行动
1.  后端开发人员依据此文档实现 SSE 接口。
2.  前端等待接口就绪后，替换 Mock 逻辑。

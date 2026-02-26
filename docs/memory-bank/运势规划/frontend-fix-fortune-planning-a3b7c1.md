# 前端修复文档：FortunePlanning.vue AI 解读响应解析问题

> 状态：待前端处理 | 后端接口已验证正常 | 生成时间：2026-02-20

---

## 结论

**后端接口 `POST /api/timespace/ai-guidance` 完全正常**，已通过 curl 验证返回正确数据。
"解读格式异常，已为你显示基础推演结果" 是**前端自己的兜底文案**，说明前端在解析后端响应时出了问题。

---

## 后端实际返回的数据结构

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "dimension": "yearly",
    "sections": {
      "energy": "年度气象如四季轮回...",
      "action": "宜：制定清晰的年度目标...\n忌：急于求成...",
      "warning": "避免因长远规划而忽略当下细节..."
    },
    "structured": {
      "do": ["规划年度目标", "定期复盘调整", "积累核心能力"],
      "dont": ["目标过于分散", "忽视健康管理"],
      "keywords": ["规划", "积累", "平衡"]
    },
    "generated_at": "2026-02-20T15:22:09.892Z",
    "tokens_used": 406
  }
}
```

**关键点**：
- `energy` / `action` / `warning` 在 `data.sections` 下，**不是** `data` 的直接属性
- `do` / `dont` / `keywords` 在 `data.structured` 下，**不是** `data` 的直接属性

---

## 需要修改的位置

### `FortunePlanning.vue` — `generateTimeSpaceAIGuidance` 函数（约第 774-843 行）

**当前可能的错误写法**（推测前端直接读了顶层字段）：

```typescript
// ❌ 错误：data 下没有直接的 energy/action 等字段
const energy = response.data.data.energy;
const doList = response.data.data.do;
```

**正确写法**：

```typescript
// ✅ 正确：从嵌套结构中读取
const { sections, structured, generated_at, tokens_used } = response.data.data;

const energy   = sections.energy;
const action   = sections.action;
const warning  = sections.warning;
const doList   = structured.do;
const dontList = structured.dont;
const keywords = structured.keywords;
```

---

## 同时需要检查的问题

### 1. `context` 参数是否有值

后端要求请求体包含以下字段（**全部必填**）：

```typescript
{
  dimension: string,   // 'daily' | 'monthly' | 'yearly'
  date: string,        // 'YYYY-MM-DD'
  profileId: string,   // 用户命盘 ID（支持 camelCase）
  context: object      // 非空对象，包含时空上下文信息
}
```

如果 `context` 是 `null`、`undefined` 或空对象 `{}`，后端会返回 400 或 LLM 输出质量极差。
请确认调用时 `context` 已包含有效的时空上下文数据（大限信息、流年信息等）。

### 2. `POST /api/llm/chat` 404（已在后端修复）

`llmRoutes` 之前未挂载，已在本次后端修复中补充。现在 `POST /api/llm/chat` 和 `POST /api/llm/chat/stream` 均可正常使用。

---

## 后端接口契约（完整）

**请求**
```
POST /api/timespace/ai-guidance
Authorization: Bearer <token>
Content-Type: application/json

{
  "dimension": "yearly",          // 必填
  "date": "2026-02-20",           // 必填
  "profileId": "xxx",             // 必填（支持 profileId 或 profile_id）
  "context": { ... }              // 必填，非空对象
}
```

**成功响应（200）**
```json
{
  "success": true,
  "data": {
    "dimension": "yearly",
    "sections": {
      "energy": "string",
      "action": "string",
      "warning": "string"
    },
    "structured": {
      "do": ["string"],
      "dont": ["string"],
      "keywords": ["string"]
    },
    "generated_at": "ISO8601",
    "tokens_used": 406
  }
}
```

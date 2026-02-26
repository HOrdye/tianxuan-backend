
# 后端开发文档 (Frontend API Adapter)

> 以下内容为本次优化需要后端新增/修改的接口规范，前端将在后端完成后对接。

---

### 接口 1：运势反馈记录

**背景**：用户可对流日运势进行"很准/一般/不准"反馈，数据用于后续算法优化和用户画像。

**接口**：`POST /api/fortune/feedback`

**请求体**：
```json
{
  "fortune_date": "2026-02-19",
  "profile_id": "self",
  "accuracy": "high",
  "dimension": "daily",
  "note": "今天确实财运不错"
}
```

**字段说明**：
- `fortune_date`：运势日期，格式 `YYYY-MM-DD`
- `profile_id`：档案ID，默认 `"self"`
- `accuracy`：反馈准确度，枚举值 `"high" | "medium" | "low"`（对应 很准/一般/不准）
- `dimension`：时间维度，枚举值 `"daily" | "monthly" | "yearly"`
- `note`：用户备注（可选，最长200字）

**响应体**：
```json
{
  "code": 0,
  "data": {
    "id": "feedback_uuid",
    "created_at": "2026-02-19T22:00:00Z"
  },
  "message": "反馈已记录"
}
```

**权限**：需登录用户（Bearer Token）。

---

### 接口 2：AI 输出结构化 JSON

**背景**：将 LLM 调用迁移到后端，以解决 API Key 暴露、Token 控制失效和输出格式不稳定的问题。

**新增接口**：`POST /api/timespace/ai-guidance`

**请求体**（前端传入时空上下文）：
```json
{
  "dimension": "daily",
  "date": "2026-02-19",
  "profile_id": "self",
  "context": {
    "daxian": { ... },
    "liunian": { ... },
    "liuday": { ... }
  }
}
```

**响应体**（结构化 JSON）：
```json
{
  "code": 0,
  "data": {
    "dimension": "daily",
    "sections": {
      "energy": "甲子日，木水相生，生发之气旺盛。",
      "action": "宜：主动拓展人脉，签约谈判。\n忌：固执己见，强行推进。",
      "warning": "今日化禄入命，财运亨通，但需防过度扩张。"
    },
    "structured": {
      "do": ["主动拓展人脉", "签约谈判", "出行远行"],
      "dont": ["固执己见", "强行推进"],
      "keywords": ["生发", "主动", "忌固执"]
    },
    "generated_at": "2026-02-19T22:00:00Z",
    "tokens_used": 450
  }
}
```

**权限**：需登录用户 + 已解锁对应维度。

---

### 接口 3：查询运势反馈历史（可选）

**接口**：`GET /api/fortune/feedback`

**查询参数**：
```
?profile_id=self&dimension=daily&start_date=2026-02-01&end_date=2026-02-28
```

**响应体**：
```json
{
  "code": 0,
  "data": [
    {
      "fortune_date": "2026-02-19",
      "dimension": "daily",
      "accuracy": "high",
      "note": "今天确实财运不错"
    }
  ]
}
```

---

### 前端对接说明

后端完成以上接口后，前端需要：

1. **接口1（反馈）**：在 `src/api/modules/fortune.ts` 中新增 `submitFeedback` 方法，调用 `POST /api/fortune/feedback`。
2. **接口2（AI结构化）**：修改 `FortunePlanning.vue` 中的 `generateTimeSpaceAIGuidance` 函数，改为调用后端接口 `POST /api/timespace/ai-guidance`。
3. **接口3（反馈历史）**：在 `src/api/modules/fortune.ts` 中新增 `getFeedbackHistory` 方法，调用 `GET /api/fortune/feedback`。

> 在后端接口未就绪前，前端可继续使用现有方案作为过渡。

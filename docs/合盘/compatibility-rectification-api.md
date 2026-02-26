# 后端开发指南：智能定盘与合盘系统

本文档描述了支持智能定盘与深度合盘分析的后端接口与数据变更。

## 1. 数据库变更 (Database Schema)

在 `compatibility_archives` 表中新增字段以存储定盘元数据。

```sql
-- Migration: add_rectification_columns_to_compatibility_archives
ALTER TABLE compatibility_archives
ADD COLUMN IF NOT EXISTS rectification_method VARCHAR(20), -- 'triangulation' | 'mbti' | 'manual'
ADD COLUMN IF NOT EXISTS inferred_hour VARCHAR(20),        -- 推导出的时辰 (e.g. 'chou')
ADD COLUMN IF NOT EXISTS confidence INT,                   -- 置信度 (0-100)
ADD COLUMN IF NOT EXISTS inference_data JSONB;             -- 推导过程数据 (tags, mbti type, evidence)

-- 索引建议
CREATE INDEX idx_compatibility_rectification_method ON compatibility_archives(rectification_method);
```

## 2. API 接口定义

### 2.1 创建/保存合盘 (更新)

*   **Endpoint**: `POST /api/astrology/compatibility`
*   **Request Body**:
    ```json
    {
      "chartA": { ... },
      "chartB": { ... },
      "name": "UserA & UserB",
      "tags": ["lover"],
      
      // 新增定盘字段 (可选)
      "rectification": {
        "method": "triangulation",
        "inferredHour": "chou",
        "confidence": 85,
        "inferenceData": {
          "tags": ["round_face", "conflict_explode"],
          "matchedStars": ["tian_fu", "huo_xing"]
        }
      }
    }
    ```
*   **Logic**:
    *   将 `rectification` 对象中的字段映射到数据库对应列。
    *   `inferenceData` 存为 JSONB。

### 2.2 深度合盘分析 (流式)

*   **Endpoint**: `POST /api/astrology/compatibility/analyze`
*   **Response Type**: `text/event-stream` (SSE) 或 `application/json` (Chunked)
*   **Request Body**:
    ```json
    {
      "chartA": { ... }, // 仅需核心数据：命宫/身宫/三方四正
      "chartB": { ... },
      "relationshipType": "lover"
    }
    ```
*   **System Prompt Template**:

```markdown
# Role
你是一位精通心理学和紫微斗数的情感咨询专家。

# Task
基于 User A (我) 和 User B (对方) 的命盘数据，生成一份“关系说明书”。

# Output Format (JSON)
请严格输出合法的 JSON 格式，不要包含 Markdown 代码块标记（```json），以便前端解析。
{
  "summary": "一句话点评 (e.g., 相爱容易相处难的灵魂伴侣)",
  "compatibility_score": 75,
  "dimensions": {
    "communication": {
      "score": 60,
      "analysis": "A (巨门) 喜欢追根究底，B (太阳) 喜欢宏大叙事，容易鸡同鸭讲。",
      "advice": "A 不要扣细节，B 要多听 A 说完。"
    },
    "values": { "score": 80, ... },
    "stress_response": { "score": 50, ... }
  },
  "guardrails": [
    "地雷区：千万不要在 B 面前提钱的话题 (因 A 武曲化忌冲 B 财帛)。",
    "润滑剂：一起旅行是最好的和解方式 (因迁移宫大吉)。"
  ]
}
```

## 3. 算法逻辑支持

虽然定盘主要在前端完成，但后端应保留校验逻辑或备用计算逻辑。

*   **Tag 校验**: 确保前端传递的 `tags` 存在于系统配置中。
*   **Confidene 计算**: 可在后端复算一遍置信度，防止前端数据篡改。

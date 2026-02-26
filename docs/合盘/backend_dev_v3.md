# 紫微斗数智能合盘系统 V3.0 - 后端开发与 Prompt 工程指南

本文档基于《V3.0 (终极版)》方案，详细定义后端 API 变更、数据库调整及核心 Prompt 设计规范。

## 1. 核心变更摘要

V3.0 的核心是将合盘从“静态算命报告”升级为“动态关系咨询”。后端需要支持：
1.  **上下文感知**：接收用户的“关系类型”和“咨询目标”。
2.  **非宿命论 AI**：Prompt 必须强制 AI 输出成长型建议，而非宿命论断言。
3.  **CRM 能力**：存档不仅仅是 JSON Blob，需要结构化存储关系状态。

---

## 2. API 接口变更

### 2.1 创建分析任务 (Create Analysis Task)

**接口**: `POST /api/astrology/compatibility/analyze/task`

**变更**: 新增 `relationship_goal` 字段。

**Request Payload**:
```json
{
  "chart_a": { ... },
  "chart_b": { ... },
  "relationship_type": "lover",  // 枚举: lover, business, family, friend, other
  "relationship_goal": "想知道适不适合长期发展" // [新增] 用户输入的具体困惑或目标
}
```

### 2.2 创建合盘存档 (Create Archive)

**接口**: `POST /api/astrology/compatibility`

**变更**: 建议在 `meta_data` 或 `tags` 中存储关系上下文，以便后续 CRM 功能使用。

**Request Payload**:
```json
{
  "chart_a": { ... },
  "chart_b": { ... },
  "name": "与合伙人李总的合盘",
  "tags": ["business", "磨合期"], // [建议] 将关系类型和阶段存入 tags
  "meta_data": {                 // [建议] 新增元数据字段存储结构化上下文
    "relationship_type": "business",
    "user_goal": "评估合作风险",
    "inference_confidence": 85   // 定盘置信度
  }
}
```

---

## 3. Prompt 工程规范 (核心)

这是 V3.0 体验成败的关键。后端在组装 System Prompt 时，必须动态注入用户提供的上下文。

### 3.1 动态上下文注入 (Context Injection)

请在 System Prompt 的 `Context` 部分动态插入以下段落：

```markdown
<user_context>
【关系类型】: {{relationship_type_desc}} (例如：事业合伙关系)
【用户当前困惑/目标】: "{{relationship_goal}}"
</user_context>

<instruction>
请基于上述【关系类型】调整分析权重：
- 若为"事业合伙"，重点分析财帛宫（财务观念）、官禄宫（执行力）、奴仆宫（管理风格）。
- 若为"恋爱婚姻"，重点分析命宫（性格）、夫妻宫（情感模式）、福德宫（价值观）。

必须在报告的【总结建议】部分，明确回应用户的【当前困惑/目标】。
</instruction>
```

### 3.2 语调与话术规范 (Tone of Voice)

请在 System Prompt 中强制约束以下规则：

```markdown
<tone_guidelines>
1. **严禁宿命论**：禁止使用“注定分手”、“无法改变”、“克夫/克妻”等绝对化、宿命论的词汇。
2. **成长型思维**：将“冲突”描述为“成长课题”。
   - Bad: "你们八字不合，经常吵架。"
   - Good: "你们的沟通模式存在差异（巨门vs太阴），这容易导致误解，但也是学习换位思考的契机。"
3. **行动导向**：提出的每个风险点，必须紧跟至少一条可执行的建议（Actionable Advice）。
   - 格式要求：Risk (风险) -> Insight (洞察) -> Action (建议)。
</tone_guidelines>
```

### 3.3 输出结构定义 (Response Structure)

流式输出的最终 JSON 结构需包含以下新字段：

```typescript
interface AnalysisResult {
  summary: {
    metaphor: string;       // [新增] 一句话比喻 (如"刹车与油门")
    response_to_goal: string; // [新增] 对用户困惑的直接回应
    score: number;
  };
  dimensions: {
    // ... 原有维度
  };
  risks_and_advice: Array<{ // [新增] 风险与建议对
    risk_point: string;
    advice: string;
  }>;
}
```

---

## 4. 数据库 Schema 建议

若 `compatibility_archives` 表尚未支持 `meta_data` JSON 列，建议添加：

```sql
ALTER TABLE compatibility_archives 
ADD COLUMN meta_data JSONB DEFAULT '{}' COMMENT '存储关系类型、用户目标、置信度等结构化数据';

-- 或者复用现有的 content/data 字段，但需确保结构统一
```

## 5. 开发优先级

1.  **P0**: 更新 `analyze/task` 接口，接收并透传 `relationship_goal`。
2.  **P0**: 修改 Prompt 模板，实现“上下文注入”和“非宿命论”约束。
3.  **P1**: 数据库添加 `meta_data` 支持，并在创建存档时保存这些上下文。

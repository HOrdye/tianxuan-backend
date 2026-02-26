# 时空导航 AI 接口升级文档

> **文档类型**：后端开发需求  
> **创建日期**：2026-02-25  
> **优先级**：高  
> **关联前端版本**：v5.8+ 时空导航重构

---

## 1. 背景与问题

### 1.1 当前状态

前端已完成时空导航（流年/流月/流日）的 **Prompt 模板重构** 和 **UI 模块化重构**，但后端 API `POST /api/timespace/ai-guidance` 仍返回**旧版数据格式**，导致：

1. **流年 6 模块卡片** 中 4 个模块因字段缺失无法渲染（年度总论、核心能量、四化影响、分领域提点、古人点窍全部为空）
2. **流月 7 模块卡片** 中 5 个模块同理无法渲染
3. **`do`/`dont` 字段** 返回的是 `PaidYiJiItem` 对象数组（`{action, reason, tags, priority, source}`），前端 UI 期望字符串数组，导致页面直接显示原始 JSON

### 1.2 临时措施

前端已实施 **Fix-2（本地 AI 降级）**：当检测到后端返回旧格式数据时，自动触发本地 LLM 调用（使用已重构的新 Prompt 模板），绕过后端 API 生成内容。

**此方案的代价**：
- 每次解锁都会消耗本地 LLM Token（约 2000 Token/次）
- 后端 API 调用浪费（先调后端、检测旧格式、再调本地）
- 延迟增加（双重调用）

**期望**：后端升级 API 响应格式后，前端将自动使用后端数据，无需额外改动。

---

## 2. 当前后端响应格式（旧版）

### 2.1 接口信息

```
POST /api/timespace/ai-guidance

请求体：
{
  "dimension": "yearly" | "monthly" | "daily",
  "date": "YYYY-MM-DD",
  "context": { /* TimeSpaceContext 序列化对象 */ },
  "profileId": "string"
}
```

### 2.2 当前响应结构

```jsonc
// 旧版响应（当前后端返回的格式）
{
  "success": true,
  "data": {
    "sections": {
      "energy": "string",   // 能量/总论文本
      "action": "string",   // 行动/课题文本
      "warning": "string"   // 预警文本
    },
    "structured": {
      "do": [               // ⚠️ 返回的是对象数组，不是字符串数组
        {
          "action": "主动推进创新项目",
          "reason": "破军星主动...",
          "tags": ["效率提升"],
          "priority": 1,
          "source": "ai-extract"
        }
      ],
      "dont": [
        {
          "action": "关注身体不适症状",
          "reason": "...",
          "tags": ["健康养生"],
          "priority": 1,
          "source": "ai-extract"
        }
      ],
      "keywords": ["string"]
    },
    // 旧版流年特有
    "strategy": "string",
    "challenge": "string",
    // 旧版流月特有
    "battle": "string",
    "rhythm": "string"   // 纯字符串，不是对象
  }
}
```

### 2.3 问题汇总

| 问题 | 影响 |
|------|------|
| 缺少 `headline`, `overview`, `coreEnergy` 等新字段 | 流年/流月的新模块卡片无法渲染 |
| 缺少 `sihuaAnalysis` 数组 | 四化深度影响模块为空 |
| 缺少 `domains` 对象 | 分领域提点模块为空 |
| 缺少 `ancientWisdom` | 古人点窍模块为空 |
| `do`/`dont` 是 PaidYiJiItem 对象数组 | 前端 `{{ item }}` 直接输出 JSON 字符串 |
| `rhythm` 是字符串而非 `{early, mid, late}` 对象 | 三旬节奏模块无法渲染 |

---

## 3. 期望的新版响应格式

### 3.1 流年（dimension = "yearly"）

```jsonc
{
  "success": true,
  "data": {
    "headline": "string",          // 年度主题标题，8-16字
    "overview": "string",          // 年度总论，150-250字
    "coreEnergy": "string",        // 核心能量分析，100-200字
    "sihuaAnalysis": [             // 四化深度影响，4个元素
      {
        "name": "string",          // 如 "天同化禄"
        "palace": "string",        // 如 "夫妻宫"
        "effect": "string"         // 30-60字
      }
    ],
    "coreLessons": "string",       // 核心课题总述，50-100字
    "domains": {                   // 分领域提点
      "career": "string",          // 30-60字
      "wealth": "string",
      "love": "string",
      "health": "string"
    },
    "ancientWisdom": "string",     // 古人观星点窍，20-50字，半文言
    "do": ["string"],              // ⚠️ 字符串数组，3-5条，每条≤15字
    "dont": ["string"],            // ⚠️ 字符串数组，2-3条，每条≤15字
    "keywords": ["string"]         // 恰好3个，每个≤4字
  }
}
```

### 3.2 流月（dimension = "monthly"）

```jsonc
{
  "success": true,
  "data": {
    "headline": "string",          // 月度主题标题，6-12字
    "overview": "string",          // 月度总论，80-150字
    "battle": "string",            // 本月战役定性，1-2句
    "sihuaAnalysis": [             // 流月四化影响
      {
        "name": "string",
        "palace": "string",
        "effect": "string"         // 20-40字
      }
    ],
    "rhythm": {                    // ⚠️ 必须是对象，不是字符串
      "early": "string",           // 上旬，20-40字
      "mid": "string",             // 中旬，20-40字
      "late": "string"             // 下旬，20-40字
    },
    "domains": {                   // 分领域提点
      "career": "string",
      "wealth": "string",
      "love": "string",
      "health": "string"
    },
    "warning": "string",           // 关键预警，1-2句
    "ancientWisdom": "string",     // 古诀点睛，15-30字
    "do": ["string"],              // ⚠️ 字符串数组，2-4条，每条≤10字
    "dont": ["string"],            // ⚠️ 字符串数组，1-3条，每条≤10字
    "keywords": ["string"]         // 恰好3个
  }
}
```

### 3.3 流日（dimension = "daily"）

```jsonc
{
  "success": true,
  "data": {
    "energy": "string",            // 今日气象，1-2句
    "action": "string",            // 行事心法，3-5条，"宜：/忌："开头，\n分隔
    "warning": "string",           // 避坑指南，1-2句
    "do": ["string"],              // ⚠️ 字符串数组，2-3条，每条≤8字
    "dont": ["string"],            // ⚠️ 字符串数组，1-2条，每条≤8字
    "keywords": ["string"]         // 恰好3个，每个≤4字
  }
}
```

---

## 4. 关键变更点

### 4.1 `do`/`dont` 必须是字符串数组

**当前（错误）**：
```json
"do": [{"action": "主动推进创新项目", "reason": "...", "tags": [...], "priority": 1, "source": "ai-extract"}]
```

**期望（正确）**：
```json
"do": ["主动推进创新项目", "关注子女教育资源", "制定财务管理计划"]
```

> 如果后端需要保留 PaidYiJiItem 结构供其他消费方使用，可新增 `doItems`/`dontItems` 字段返回对象数组，但 `do`/`dont` 字段 **必须** 是纯字符串数组。

### 4.2 `rhythm` 必须是对象

**当前（错误）**：
```json
"rhythm": "月初低迷，月中好转，月末收官"
```

**期望（正确）**：
```json
"rhythm": {
  "early": "能量低迷，宜整理内务、盘点资源，静待转机。",
  "mid": "天干转旺，可小范围试探新方向，勿大举投入。",
  "late": "收官阶段，总结本月得失，为下月蓄力布局。"
}
```

### 4.3 新增字段列表

| 字段 | 维度 | 类型 | 说明 |
|------|------|------|------|
| `headline` | yearly/monthly | string | 主题标题 |
| `overview` | yearly/monthly | string | 总论 |
| `coreEnergy` | yearly | string | 核心能量分析 |
| `sihuaAnalysis` | yearly/monthly | Array<{name, palace, effect}> | 四化深度影响 |
| `coreLessons` | yearly | string | 核心课题 |
| `domains` | yearly/monthly | {career, wealth, love, health} | 分领域提点 |
| `ancientWisdom` | yearly/monthly | string | 古诀点睛 |

### 4.4 废弃字段列表

| 字段 | 说明 |
|------|------|
| `sections.energy` | 被 `overview` / `coreEnergy` 替代 |
| `sections.action` | 被 `coreLessons` / `battle` 替代 |
| `sections.warning` | 被顶层 `warning` 替代 |
| `structured.do` | 被顶层 `do`（字符串数组）替代 |
| `structured.dont` | 被顶层 `dont`（字符串数组）替代 |
| `structured.keywords` | 被顶层 `keywords` 替代 |
| `strategy` | 被 `overview` 替代 |
| `challenge` | 被 `coreLessons` 替代 |

---

## 5. 建议的后端 Prompt 模板

前端已在 `src/features/ziwei/services/timeSpaceAIGenerator.ts` 中实现了完整的 Prompt 模板（含 Few-Shot 示例、正反例、长度约束）。后端可直接参考或复用。

### 5.1 Prompt 模板位置

```
src/features/ziwei/services/timeSpaceAIGenerator.ts

- 流日 Prompt: 第 107-145 行
- 流月 Prompt: 第 147-197 行
- 流年 Prompt: 第 199-244 行
- 系统 Prompt（角色设定、文风、人称）: 第 246-274 行
- 用户 Prompt（时空信息注入）: 第 277-347 行
```

### 5.2 核心约束（必须在后端 Prompt 中保留）

1. **输出格式**：必须且只能输出合法 JSON 对象，禁止 Markdown、多余文字
2. **字段名**：严格匹配上述 JSON Schema，不可自定义
3. **长度控制**：
   - 流年：overview + coreEnergy + coreLessons 合计 400-700 字
   - 流月：overview + battle + warning 合计 200-350 字
   - 流日：energy + action + warning 合计 200-400 字
4. **文风**：半文半白，禁止"AI"、"赋能"、"闭环"等现代词汇
5. **时空嵌套**：流月必须在流年背景下解读，流年必须在大限背景下解读

---

## 6. 前端已完成的工作

### 6.1 Prompt 模板重构 ✅

- 流年：6 模块结构（headline, overview, coreEnergy, sihuaAnalysis, coreLessons, domains, ancientWisdom）
- 流月：7 模块结构（headline, overview, battle, sihuaAnalysis, rhythm{early,mid,late}, domains, ancientWisdom）
- 流日：保持原有结构（energy, action, warning, do, dont, keywords）
- 所有 Prompt 含 Few-Shot 正反示例

### 6.2 UI 模块化重构 ✅

- `FortunePlanning.vue`：
  - 流年解锁区：6 个 `ai-card` 模块卡片（年度总论、核心能量、四化影响、核心课题+宜忌、分领域提点、古人点窍）
  - 流月解锁区：7 个 `ai-card` 模块卡片（月度总论、本月战役、四化影响、三旬节奏、分领域提点、关键预警+宜忌、古诀点睛）
  - 流日解锁区：3 个模块（今日气象、行事心法、关键预警+宜忌+关键词）

### 6.3 数据解析适配 ✅

- `useUnlockAndAI.ts`：同时兼容新旧两种响应格式
- 旧格式自动降级到本地 AI 生成（使用新 Prompt）
- `do`/`dont` 防御性归一化处理（对象→字符串）

### 6.4 其他清理 ✅

- 移除流年/流月/流日的重复 UI 模块
- TypeScript 类型错误修复
- Pro 模式相关代码清理

---

## 7. 前端检测逻辑（供后端联调参考）

前端判断是否为新格式的逻辑：

```typescript
// 检测是否为新格式（包含 headline 或 overview 字段）
const isNewFormat = !!(d.headline || d.overview || d.coreEnergy || d.sihuaAnalysis)

if (!isNewFormat) {
  // 旧格式 → 触发本地 AI 降级
  console.warn('后端返回旧格式数据，触发本地AI降级')
  await _fallbackToLocalAI(dimension, context)
  return
}
```

**后端升级完成后**，只要响应中包含 `headline` 或 `overview` 字段，前端会自动使用后端数据，无需额外配置。

---

## 8. 联调检查清单

- [ ] 流年响应包含 `headline`, `overview`, `coreEnergy`, `sihuaAnalysis`, `coreLessons`, `domains`, `ancientWisdom`
- [ ] 流月响应包含 `headline`, `overview`, `battle`, `sihuaAnalysis`, `rhythm`（对象格式）, `domains`, `ancientWisdom`
- [ ] 流日响应包含 `energy`, `action`, `warning`（与旧版一致）
- [ ] 所有维度的 `do`/`dont` 均为字符串数组
- [ ] 所有维度的 `keywords` 均为字符串数组
- [ ] 响应不包含 `sections`/`structured` 嵌套层（直接平铺在 `data` 下）
- [ ] JSON 输出无 Markdown 包裹、无多余文字

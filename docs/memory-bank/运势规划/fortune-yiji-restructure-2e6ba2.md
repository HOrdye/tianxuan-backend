# 运势宜忌模块重构方案

基于对当前代码的深入分析，结合你提供的产品重构方案，本文档输出一份**经过项目实际验证的完整优化方案**，并拆分为前后端开发文档。

---

## 一、当前架构诊断（Current State Analysis）

### 1.1 现有数据流

```
[免费层] FortunePlanning.vue::dailyYiJi (computed)
  └─ 输入：天干(TG_DO) × 地支(DZ_DONT) × 宫位(PALACE_DO_SUFFIX)
  └─ 输出：{ do1: string, do2: string, dont: string }
  └─ 问题：reason 直接拼入括号，无法分层展示

[付费层·本地翻译] ziweiTranslator.ts::generateGuide()
  └─ 输入：四化飞星(lu/quan/ke/ji) × 宫位
  └─ 查表：scenarioTranslation.ts → ScenarioAdvice[]
  └─ 输出：{ dos: [{title, reason, scenario}], donts: [...] }
  └─ 问题：无优先级、无标签、无star-profile层、无防偏清洗

[付费层·AI] timeSpaceAIGenerator.ts → timespaceApi.getAIGuidance()
  └─ 输出 JSON：daily → { energy, action, warning, do[], dont[], keywords[] }
  └─ 前端渲染：ai-card 卡片组 + formatAIText() (markdown→html)
  └─ 问题：action 字段是宜/忌混排的长段文本，非结构化条目
```

### 1.2 关键差距矩阵

| 维度 | 当前实现 | 目标方案 | 改造成本 |
|------|----------|----------|----------|
| **数据模型** | `{title, reason, scenario}` 扁平结构 | `PaidYiJiItem` (action/reason/tags/priority/source) | 中 |
| **模板路由** | 单层 `sihua×palace` 查表 | 4级漏斗：星曜画像→四化触发→宫位主题→AI兜底 | 高 |
| **极客模式** | `proMode` 显示原始宫位数据 | `reason.split('【')` 术语显隐切换 | 低 |
| **优先级折叠** | 所有条目平铺 | P1展开 + P2/P3折叠 | 低 |
| **Alert模块** | 无 | `note: { level, content }` 天刑/白虎警示卡 | 低 |
| **防偏清洗** | 无 `normalizeYiJiResult` | 动词裁剪 + 宜忌错位拦截 + 同主题合并 | 中 |
| **来源追踪** | 无 | `source` 字段用于 A/B 测试 | 低 |

### 1.3 我的优化意见

你的方案在产品思维上非常成熟，以下是我在工程落地层面的补充建议：

**👍 完全认同并直接采纳的部分：**
- `PaidYiJiItem` 数据模型设计（action/reason 分离是核心）
- 极客模式用 `reason.split('【')` 实现，零后端成本
- priority 分层 + 折叠交互
- 工程防偏 3 条规则
- Phase 1 只做太阳星流日模板的 MVP 验证

**⚠️ 需要调整的部分：**

1. **模板路由不宜完全前端化**：你提出的 4 级漏斗引擎（L1-L4），建议 L1-L3 做成**前端纯本地模板**（零网络延迟），L4 AI 兜底走后端 API。当前 `timeSpaceAIGenerator.ts` 已有本地 LLM fallback 逻辑，可以复用。

2. **`normalizeYiJiResult` 应同时部署在前后端**：后端清洗一次（保底），前端再清洗一次（防止 AI fallback 路径绕过后端）。当前前端已有 `formatAIText()` 做基础文本处理，可在此基础上扩展。

3. **现有 `proMode` 开关需重命名/复用**：当前 `proMode` 控制的是"显示原始宫位数据"，与你提出的"极客模式"（控制术语显隐）是不同维度。建议：
   - 保留 `proMode`（原始数据展示），改名为"专业数据"
   - 新增 `geekMode`（术语显隐开关），放在宜忌卡片区域内

4. **免费层 `dailyYiJi` 应复用新模板**：当前免费层 `dailyYiJi` 是独立的 computed，与付费层数据结构完全不同。建议免费层也使用 `PaidYiJiResult` 结构，但只取 P1 条目的 `action` 字段展示，reason 加锁。这样免费→付费的体验是连贯的。

5. **`note` Alert 去重逻辑需前端实现**：你提出"note 与 P1 dont 语义重合时去重"，但精确语义比对成本高。建议简化为：如果 `note` 存在，将 `dont` 中 P1 条目限制为最多 1 条（而非语义比对），效果接近且工程可靠。

---

## 二、完整优化方案（Restructure Plan）

### Phase 1: MVP 验证（1个迭代，约2周）

#### 2.1 新增类型定义

**文件**：`src/features/ziwei/types/paidYiJi.ts`（新建）

```typescript
export type PaidYiJiItem = {
  action: string           // 核心指令：动词开头，≤20字
  reason?: string          // 白话建议。【玄学依据：术语】
  tags?: string[]          // 场景标签：职业/财务/人际/健康/情绪
  priority?: 1 | 2 | 3    // 1=今日关键，2=次要，3=补充
  source?: 'template' | 'ai-extract' | 'legacy'
}

export type PaidYiJiResult = {
  dimension: 'year' | 'month' | 'day'
  do: PaidYiJiItem[]
  dont: PaidYiJiItem[]
  note?: {
    level: 'warning' | 'danger'
    content: string
  }
}
```

#### 2.2 太阳星模板 (Phase 1 唯一模板)

**文件**：`src/features/ziwei/templates/sunProfileTemplate.ts`（新建）

直接采用你方案中的 `SUN_PHASE1_TEMPLATE`，包含 `day()` 和 `month()` 两个维度。

#### 2.3 模板路由引擎

**文件**：`src/features/ziwei/services/yijiTemplateRouter.ts`（新建）

```
resolveYiJi(ctx) → PaidYiJiResult
  ├─ L1: 命宫主星匹配 → sunProfileTemplate / (未来扩展)
  ├─ L2: 四化触发匹配 → (Phase 2)
  ├─ L3: 宫位+主题通用模板 → 复用现有 scenarioTranslation.ts 数据，转换为 PaidYiJiItem 格式
  └─ L4: AI 兜底 → 调用现有 AI 生成，经 normalizeYiJiResult 清洗后输出
```

#### 2.4 normalizeYiJiResult 防偏引擎

**文件**：`src/features/ziwei/utils/normalizeYiJi.ts`（新建）

三条规则全部实现：
- 规则1：action 开头的"建议/适合/避免"等弱动词自动裁剪
- 规则2：dont[] 中包含"宜/适合/有利于"等词的条目自动移入 do[] 或丢弃
- 规则3：同 tag 的条目按 priority 保留最高一条，其余合并入 reason

#### 2.5 前端 UI 改造

**改造文件**：`src/features/ziwei/views/FortunePlanning.vue`

核心变更：
1. **免费区宜忌**：复用 `PaidYiJiResult`，只展示 P1 的 action，reason 显示为"🔒 解锁查看详细建议"
2. **付费区**：替换现有 `ai-card` 渲染为新的宜忌卡片组件
3. **新增极客模式开关**：`geekMode` ref，控制 reason 字段的术语显隐
4. **优先级折叠**：P1 平铺，P2/P3 折叠在"展开更多补充建议"中
5. **Alert 卡片**：当 `note` 存在时渲染独立的 ⚠️ Alert 组件

**新建组件**：
- `src/features/ziwei/components/fortune-planning/YiJiCard.vue` — 单条宜忌卡片
- `src/features/ziwei/components/fortune-planning/YiJiPanel.vue` — 宜忌面板（含折叠逻辑）
- `src/features/ziwei/components/fortune-planning/AlertCard.vue` — 特别提醒卡片

### Phase 2: 规模化与体验增强（1-2个迭代）

- 扩充太阴、紫微、武曲等星曜模板
- L2 四化触发模板完善
- 极客模式完整上线
- "一键添加到系统日历"功能

---

## 三、前端开发文档（Frontend Dev Spec）

### 3.1 类型文件

新建 `src/features/ziwei/types/paidYiJi.ts`，定义 `PaidYiJiItem` 和 `PaidYiJiResult`。

### 3.2 YiJiCard.vue 组件规格

```
Props:
  - item: PaidYiJiItem（必填）
  - type: 'do' | 'dont'（必填）
  - geekMode: boolean（默认 false）
  - locked: boolean（默认 false，免费层锁定 reason）

渲染逻辑：
  - action 字段：加粗大字，do 为绿色 #059669，dont 为红色 #ef4444
  - reason 字段：
    - geekMode=false → item.reason?.split('【')[0]（白话部分，#666，限2行）
    - geekMode=true → 完整渲染，【玄学依据：xxx】部分用 <span class="text-amber-500 text-xs"> 高亮
  - locked=true → reason 显示为锁定提示
  - tags 渲染为小标签组
```

### 3.3 YiJiPanel.vue 组件规格

```
Props:
  - result: PaidYiJiResult（必填）
  - geekMode: boolean
  - locked: boolean

渲染逻辑：
  - 宜区域：
    - P1 条目平铺渲染 YiJiCard
    - P2/P3 条目折叠在"🔽 展开更多补充建议"中
  - 忌区域：同理
  - note 存在时：渲染 AlertCard，且 dont P1 条目最多保留1条
```

### 3.4 AlertCard.vue 组件规格

```
Props:
  - note: { level: 'warning' | 'danger', content: string }

UI：
  - warning → 橙色底 #FFFBEB，⚠️ 图标
  - danger → 红色底 #FFF5F5，🚨 图标
  - 仅在 dimension='day' 或极特殊 dimension='month' 时展示
  - dimension='year' 绝不展示
```

### 3.5 FortunePlanning.vue 改造要点

1. **新增状态**：
   ```typescript
   const geekMode = ref(false)
   const dailyYiJiResult = ref<PaidYiJiResult | null>(null)
   const monthlyYiJiResult = ref<PaidYiJiResult | null>(null)
   ```

2. **免费区改造** (line 301-328)：
   - 替换 `dailyYiJi` computed 为调用 `yijiTemplateRouter.resolveYiJi()`
   - 用 `<YiJiPanel :result="dailyYiJiResult" :locked="!dailyUnlocked" />` 替代现有手写 HTML

3. **付费区改造** (line 353-398)：
   - AI 返回数据经 `normalizeYiJiResult()` 清洗后，转为 `PaidYiJiResult` 格式
   - 用 `<YiJiPanel :result="dailyYiJiResult" :geek-mode="geekMode" />` 渲染
   - 保留现有 energy/warning 的 AI 卡片作为上方概述区

4. **极客模式开关**：
   - 在流日卡片区域（非顶部工具栏）添加 `[玄学解析 开/关]` 开关
   - 与现有 `proMode` 独立，互不影响

### 3.6 normalizeYiJi.ts 前端清洗规格

```typescript
export function normalizeYiJiResult(raw: PaidYiJiResult): PaidYiJiResult {
  // 规则1：action 动词裁剪
  const trimPrefixes = ['建议', '适合', '避免', '可以', '需要', '应该']
  
  // 规则2：dont 中含正面词汇的条目移到 do 或丢弃
  const positiveWords = ['宜', '适合', '有利于', '建议', '推荐']
  
  // 规则3：同 tag 合并（按 priority 排序，保留最高）
  
  // 规则4（新增）：action 超过20字截断移入 reason
  
  return cleaned
}
```

---

## 四、后端开发文档（Backend Dev Spec）

### 4.1 数据结构升级

后端 AI 解读 API (`POST /api/timespace/ai-guidance`) 的响应结构需扩展：

```typescript
// 新增：结构化宜忌响应
interface AIGuidanceResponse {
  dimension: 'daily' | 'monthly' | 'yearly'
  
  // 保留现有文本字段（向后兼容）
  sections: {
    energy?: string
    action?: string
    warning?: string
  }
  
  // 新增：结构化宜忌（PaidYiJiResult 格式）
  structured: {
    do: PaidYiJiItem[]
    dont: PaidYiJiItem[]
    note?: { level: 'warning' | 'danger', content: string }
    keywords?: string[]
  }
}
```

### 4.2 后端 Prompt 改造

当前 `timeSpaceAIGenerator.ts` 的 Few-Shot 示例需更新，要求 LLM 输出 `PaidYiJiItem[]` 格式：

```json
{
  "sections": { "energy": "...", "action": "...", "warning": "..." },
  "structured": {
    "do": [
      { "action": "当面推进停滞的沟通", "reason": "今日沟通力强。【玄学依据：流日逢太阳】", "tags": ["职场沟通"], "priority": 1 }
    ],
    "dont": [
      { "action": "面对批评时当场反驳", "reason": "易触发防御机制。【玄学依据：太阳忌尊严受犯】", "tags": ["情绪管理"], "priority": 1 }
    ],
    "note": { "level": "danger", "content": "天刑/白虎高敏节点..." }
  }
}
```

### 4.3 后端 normalizeYiJiResult 清洗

在 LLM 输出解析后、返回前端前，执行与前端相同的三条清洗规则 + action 长度截断（>20字移入 reason）。

### 4.4 来源追踪 (source 字段)

- 模板命中的条目：`source: 'template'`
- AI 生成的条目：`source: 'ai-extract'`
- 旧逻辑兜底：`source: 'legacy'`

用于后续 A/B 测试：对比 template vs ai-extract 的用户反馈（准/不准）转化率。

### 4.5 API 兼容性

- 新增 `structured` 字段为**可选**，前端检测到时优先使用
- 旧的 `sections` + `do[]`/`dont[]` 字段保留，确保向后兼容
- 前端通过 `if (res.data.structured)` 分支判断走新逻辑还是旧逻辑

---

## 五、实施步骤（Execution Checklist）

### Phase 1 — 前端（约5个工作日）

| # | 任务 | 文件 | 优先级 |
|---|------|------|--------|
| F1 | 新建 `PaidYiJiItem` / `PaidYiJiResult` 类型 | `types/paidYiJi.ts` | P0 |
| F2 | 新建 `normalizeYiJi.ts` 防偏引擎 | `utils/normalizeYiJi.ts` | P0 |
| F3 | 新建太阳星模板 `sunProfileTemplate.ts` | `templates/sunProfileTemplate.ts` | P0 |
| F4 | 新建模板路由引擎 `yijiTemplateRouter.ts` | `services/yijiTemplateRouter.ts` | P0 |
| F5 | 新建 `YiJiCard.vue` 组件 | `components/fortune-planning/YiJiCard.vue` | P0 |
| F6 | 新建 `YiJiPanel.vue` 组件（含折叠） | `components/fortune-planning/YiJiPanel.vue` | P0 |
| F7 | 新建 `AlertCard.vue` 组件 | `components/fortune-planning/AlertCard.vue` | P1 |
| F8 | 改造 `FortunePlanning.vue` 集成新组件 | `views/FortunePlanning.vue` | P0 |
| F9 | 新增 `geekMode` 开关 + reason 术语切换 | `views/FortunePlanning.vue` | P1 |
| F10 | AI 返回数据适配 `PaidYiJiResult` 转换 | `views/FortunePlanning.vue` | P0 |

### Phase 1 — 后端（约3个工作日）

| # | 任务 | 说明 | 优先级 |
|---|------|------|--------|
| B1 | 扩展 AI Guidance 响应结构（增加 `structured` 字段） | 向后兼容 | P0 |
| B2 | 更新 LLM Prompt 要求输出 `PaidYiJiItem[]` | Few-Shot 示例更新 | P0 |
| B3 | 后端 `normalizeYiJiResult` 清洗管道 | 与前端逻辑一致 | P1 |
| B4 | `source` 字段埋点 + 反馈关联 | A/B 测试基础设施 | P2 |

---

## 六、风险控制

1. **渐进式上线**：Phase 1 只改流日卡片，流月/流年保持现有 UI 不动
2. **向后兼容**：`structured` 字段可选，前端用 `if` 分支降级到旧逻辑
3. **AI Fallback**：模板未命中时走 AI 生成，AI 失败走 `FALLBACK_AI_CONTENT`
4. **A/B 测试**：通过 `source` 字段对比模板 vs AI 的用户准确度反馈

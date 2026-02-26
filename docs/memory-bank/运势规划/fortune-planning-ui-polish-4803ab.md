# 运势规划页面 UI 精细化优化方案（含前后端分工）

基于用户反馈的7大类问题，对已实现的4个组件及主页面进行精细化打磨，明确前后端分工，并附后端开发文档供后端团队参考。

---

## 一、大限 · 十年主轴（`LifeStageHeader.vue` + `DecadeOverview.vue`）

### 1.1 大限滑动卡片（参考示例图2/3）
**问题**：当前 `LifeStageHeader` 的时间轴文字拥挤，无法查看其他时期大限详情。

**方案**：在 `LifeStageHeader.vue` 中，将底部 `decade-timeline` 改造为**横向滚动卡片组**（参考示例图2的人生进度卡片），每个大限期显示为一张可点击卡片，当前大限高亮，点击其他卡片可切换查看该大限的简要信息（通过 emit 事件通知父组件）。

**UI 细节**：
- 卡片宽度约 `72px`，高度 `auto`，圆角 `12px`
- 当前大限：金色边框 + 「当前」badge
- 其他大限：灰色边框，hover 变紫色
- 每张卡片显示：年龄段（如 `32-41岁`）+ 宫位名（如 `迁移宫`）+ 阶段名（如 `筑基期`）

### 1.2 DecadeOverview 内容重构（参考用户需求模块A-D）
**问题**：当前只有 `headline/body/actionTags`，缺少结构化的"三大势能"和"风控提示"。

**方案**：重构 `DecadeOverview.vue` 的展示结构：

**模块 A：主轴 Header**
- 干支 + 年龄段（已有）
- 宫位/主星标注（新增：`📍 迁移宫主导 · 太阳独坐`）
- 战略标签（胶囊标签，来自 `actionTags`，已有但样式优化）

**模块 B：核心摘要（Executive Summary）**
- 限制在2句话以内的 `body` 文本（已有，需在 `fortuneNarrativeData.ts` 中精简文案）
- 加粗金句标题（新增 `headline` 大字展示）

**模块 C：三大核心势能（Power-ups）**
- 将 `sihuaList` 中的化禄/化权/化科 转化为 Feature List
- 每条：左侧 Icon + 势能维度标题 + 简短描述
- 带 Tooltip（hover/点击显示专业术语解释）

**模块 D：战略风控**
- 化忌警示区（已有 `warningText`，但需改为淡橙色背景框）
- 格式：`⚠️ 能量消耗预警：[一句话]`

### 1.3 雷达图说明文字
**问题**：用户不理解"健康45分"是什么意思。

**方案**：在雷达图图例每项右侧加一个小 `?` icon，hover 显示 tooltip：
- 健康 < 50：`此大限宜注重身体保养，避免过度消耗`
- 健康 50-74：`此大限健康平稳，注意劳逸结合`
- 健康 ≥ 75：`此大限体能充沛，适合高强度挑战`

---

## 二、流年部分（`YearlyTheme.vue` + `FortunePlanning.vue` 流年解锁区）

### 2.1 删除"月度节奏提示"模块
**问题**：`YearlyTheme.vue` 中的 `.monthly-bridge` 块内容莫名其妙，与流月缺乏关联。

**方案**：**直接删除** `YearlyTheme.vue` 中的 `monthly-bridge` 模块（`<div class="monthly-bridge">` 整块）。

### 2.2 注意事项文字去重
**问题**：`cautionText` 内容如"注意：注意破坏力过强伤及根基"文字重复。

**方案**：在 `fortuneNarrativeData.ts` 的 `CAUTION_MAP` 中修正文案，去掉冗余的"注意："前缀，改为直接描述。

### 2.3 流年 AI 解读内容（年度战略/核心课题）易读性优化
**问题**：`fp-ai-content` 中的长段落文字密度大。

**方案**：在 `FortunePlanning.vue` 的流年解锁区，对 AI 内容展示做以下改造：
- **年度战略**：在段落前提取3条核心行动建议，用 `✅ 宜：` / `❌ 忌：` 列表展示（前端解析 AI 文本，提取关键句）
- **核心课题**：默认折叠，显示前100字摘要 + `展开阅读` 按钮
- 增加行间距（`line-height: 2`）和关键词加粗处理

---

## 三、流月部分（`MonthlyRhythm.vue`）

### 3.1 能量曲线图精细化
**问题**：曲线过于平缓，高度不够，点位不精细。

**方案**：
- `CURVE_H` 从 `64` 提升到 `100`（`.energy-curve-svg` 高度同步调整为 `88px`）
- 点位半径：选中月 `r=6`（外光晕 `r=12`），其他月 `r=3.5`
- 曲线描边加粗：`stroke-width` 从 `1.8` 到 `2.2`
- 在峰值点上方显示分值标签（`<text>` 元素）

### 3.2 月份策略多样化（消除硬编码）
**问题**：几乎所有月份都是"试"，能量值都是62，完全硬编码。

**方案**：重写 `annualScores` 计算逻辑，基于真实的流月地支能量差异：
- 当前月使用真实 `bridgeResult.energyLevel` 映射的分值
- 其他月份：基于地支五行生克对当年天干的关系计算相对分值（而非简单偏移）
- 策略分布应有 `冲/试/守/避` 四种，避免全部相同

### 3.3 月份详情卡易读性
**问题**：`detail-year-link` 中的文字（"在「破军能量激活」的年度背景下，本月关键是——小范围验证，为大动作铺路。"）内容重复且无新意。

**方案**：
- 将 `detail-year-link` 改为显示本月 **Do & Don't** 列表（2条宜 + 1条忌）
- 格式：`✅ 宜：[具体行动]` / `❌ 忌：[具体禁忌]`
- 内容基于 `getStrategyByScore` 的策略类型动态生成

### 3.4 本月战役/节奏把控（流月 AI 解读）
**问题**：`monthlyAIContent.battle` 和 `monthlyAIContent.rhythm` 同样是长段落，`**加粗**` 的 Markdown 标记未渲染。

**方案**：
- 在 `FortunePlanning.vue` 中，对 `monthlyAIContent.battle/rhythm` 的文本做简单 Markdown 解析（`**text**` → `<strong>text</strong>`）
- 默认折叠"节奏把控"，点击展开

---

## 四、流日部分（`FortunePlanning.vue` 流日卡）

### 4.1 增加具体日期显示
**问题**：流日卡没有显示具体日期（如"2026年2月19日 星期四"）。

**方案**：在 `fp-daily-hero` 区域的 `fp-daily-meta` 中增加日期行：
```
2026年2月19日 · 星期四
```
使用 `selectedDate` 计算得出。

### 4.2 增强易读性
**方案**：
- 流日 AI 内容（`今日气象/行事心法/避坑指南`）同样做 Markdown 解析（`**text**` → `<strong>`）
- 增加行间距，关键词（宜/忌）着色
- `fp-ai-section` 之间增加分隔线

---

## 五、交互性增强

### 5.1 悬浮今日摘要球
**方案**：在 `FortunePlanning.vue` 中，在页面右下角增加一个悬浮球（`position: fixed; bottom: 80px; right: 16px`），显示今日3个关键词（来自 `dailyKeywords`）。点击展开/收起。

### 5.2 ~~锚点导航~~（已删除）
**决策**：放弃右侧垂直时间轴锚点导航。移动端右侧同时存在悬浮球和锚点导航会严重遮挡正文，且页面本身是线性结构（大限→流年→流月→流日），用户自然向下滑动即可。**保留悬浮球，删除锚点导航。**

### 5.3 流月图表点击联动
**问题**：点击月份卡片已有联动，但需确保 `selectedMonth` 变更后流月详情区域平滑滚动到视图内。

**方案**：在 `MonthlyRhythm.vue` 的 `selectMonth` 函数中，emit 后触发 `scrollIntoView` 到 `.detail-card`。

---

## 六、色调与视觉优化

### 6.1 凶/冲月份的警示色
**方案**：在 `MonthlyRhythm.vue` 中，当月份策略为 `避` 时，月份卡片加淡绯红色背景（`#FFF5F5`），边框色 `rgba(239,68,68,0.3)`。

### 6.2 能量数值一致性说明
**方案**：在雷达图图例区域增加一行小字说明：`分值基于大限宫位与四化综合计算，满分100`，帮助用户建立参照系。

---

## 七、细节修复

### 7.1 流日卡留白与关键词着色
**方案**：
- `fp-ai-content p` 的 `line-height` 提升到 `2`
- 对"宜"字着绿色（`#059669`），"忌"字着红色（`#ef4444`）

---

## 实施文件清单

| 文件 | 改动类型 | 优先级 |
|------|---------|--------|
| `LifeStageHeader.vue` | 大限滑动卡片重构 | 🔴 高 |
| `DecadeOverview.vue` | 三大势能模块 + 风控模块 + 雷达图 tooltip | 🔴 高 |
| `YearlyTheme.vue` | 删除月度节奏提示块 | 🔴 高 |
| `MonthlyRhythm.vue` | 曲线精细化 + 策略多样化 + Do&Don't | 🔴 高 |
| `FortunePlanning.vue` | 日期显示 + AI内容Markdown + 悬浮球 + 锚点导航 + 折叠面板 | 🟡 中 |
| `fortuneNarrativeData.ts` | 修正 cautionText 文案去重 | 🟢 低 |

---

## 实施顺序

1. **`YearlyTheme.vue`** — 删除月度节奏提示（最简单）
2. **`LifeStageHeader.vue`** — 大限滑动卡片（核心视觉改进）
3. **`DecadeOverview.vue`** — 三大势能 + 风控模块重构
4. **`MonthlyRhythm.vue`** — 曲线精细化 + 策略多样化 + Do&Don't
5. **`FortunePlanning.vue`** — 日期显示 + AI内容优化 + 悬浮球 + 锚点导航
6. **`fortuneNarrativeData.ts`** — 文案修正

---

## 八、前后端分工评估

### 架构现状

当前项目为**前后端分离**架构：
- **前端**：Vue 3 + TypeScript，紫微斗数计算逻辑（`TimeSpaceService`、`fortuneNarrativeService`）完全在前端运行
- **后端 API**（已有）：`/api/timespace/cache`（时空缓存）、`/api/fortune/cache`（运势缓存）、`/api/checkin/daily`（签到）、`/api/insights/saved`（收藏）
- **AI 调用**：`timeSpaceAIGenerator.ts` 直接调用 `LLMService`（DeepSeek），当前是**前端直连 LLM**

---

### 分工总表

| 功能模块 | 归属 | 理由 |
|---------|------|------|
| 大限滑动卡片 UI | **前端** | 纯展示逻辑，数据来自已有 `allDecades` prop |
| DecadeOverview 三大势能/风控模块 | **前端** | 数据来自已有 `fortuneNarrativeService`，只是展示重构 |
| 雷达图 Tooltip 说明 | **前端** | 纯 UI 交互 |
| 删除月度节奏提示 | **前端** | 删除 Vue 模板代码 |
| 流年 AI 内容折叠/Markdown渲染 | **前端** | 纯展示优化，无需后端 |
| 流月曲线精细化 | **前端** | SVG 绘制优化 |
| 流月策略多样化 | **前端** | 重写 `annualScores` 计算逻辑（地支五行生克） |
| 流月 Do & Don't 列表 | **前端** | 基于已有策略类型生成，纯前端逻辑 |
| 流日日期显示 | **前端** | 使用 `selectedDate` 格式化 |
| 悬浮今日关键词球 | **前端** | 纯 UI 组件 |
| 锚点导航 | **前端** | `scrollIntoView` 纯前端 |
| **AI 输出结构化 JSON** | **⚠️ 后端** | 见下方详述 |
| **运势反馈记录接口** | **⚠️ 后端** | 见下方详述 |
| **分享卡片图片生成** | **⚠️ 后端（可选）** | 见下方详述 |

---

### 后端需要新增/修改的接口

#### 🔴 高优先级：AI 输出结构化 JSON

**问题根源**：当前 `timeSpaceAIGenerator.ts` 的 AI 输出是**纯文本 Markdown**（`**【今日气象】**：...`），前端需要手动解析字符串，极不稳健。

**建议方案**：修改 AI 提示词的 Output Format，要求 LLM 输出**结构化 JSON**，后端负责解析和校验，前端只消费 JSON。

**影响文件**：`src/features/ziwei/services/timeSpaceAIGenerator.ts`（提示词修改）

> ⚠️ 注意：此文件目前在前端，但因为涉及 LLM 调用安全（API Key 暴露风险），**强烈建议将 LLM 调用迁移到后端**。详见后端开发文档。

#### 🔴 高优先级：运势反馈记录接口

**功能**：用户对流日运势进行"很准/一般/不准"反馈，数据用于后续算法优化。

**新增接口**：`POST /api/fortune/feedback`

详见后端开发文档 Section 1。

#### 🟡 中优先级：分享卡片图片生成

**功能**：生成带命盘信息的精美分享图片（Canvas 或服务端渲染）。

**建议**：前端用 `html2canvas` 生成，无需后端，但若需要二维码则需后端提供二维码生成接口。

---

### 数据一致性分析

**问题**：流月策略多样化后，是否与流年、流日逻辑自洽？

**结论**：✅ 可以自洽，但需遵循以下规则：

1. **流年"破军"年 → 流月应有更多"冲"策略**
   - 实现方式：`annualScores` 计算时，引入 `yearlyTheme` 作为基准偏移量
   - 若流年有化忌（`liunian.sihua.ji`），则全年基础分下调 `-8`，使更多月份落入"避/守"区间
   - 若流年有化禄（`liunian.sihua.lu`），则全年基础分上调 `+8`，使更多月份落入"冲/试"区间

2. **流月能量值与流年能量值的关系**
   - 流年能量（60）是全年平均基准，流月能量（62）是某月的具体值，62 > 60 表示该月略优于年均，**逻辑自洽**
   - 需在 UI 上加注释说明：`流月能量 = 该月相对于年均基准的偏差值`

3. **流日与流月的一致性**
   - 流日能量基于五行生克计算，与流月基于地支生克计算，两套体系独立，**不冲突**

---

### 边界情况处理

| 边界情况 | 处理方案 |
|---------|---------|
| **极端年龄（6岁）** | `allDecades` 中起始大限从命主实际起运年龄开始（由 `TimeSpaceService` 保证），滑动卡片只渲染有效大限，无需特殊处理 |
| **极端年龄（125岁）** | 大限最多12个（12宫×10年），超出范围的卡片不渲染，已由 `decadeSegments` 计算保证 |
| **非当前大限被选中** | 在 `DecadeOverview` 顶部加 `⚠️ 当前查看的是历史/未来大限，非当前运势` 提示条（amber 色），防止用户误解 |
| **`bridgeResult.energyLevel` 为空** | `annualScores` 降级：使用地支五行基础分（50-75 区间），不显示策略 badge，曲线仍正常渲染 |
| **`allDecades` 为空** | `LifeStageHeader` 显示骨架屏（skeleton），不崩溃 |

---

### 加载状态设计

| 场景 | 当前状态 | 优化方案 |
|------|---------|---------|
| AI 内容解锁中 | `⏳ 正在生成...` 文字 | 改为 **skeleton 骨架屏**（3行灰色占位条） |
| 大限切换时 `DecadeOverview` 重新计算 | 无 loading | 加 `v-if` + `transition` 淡入效果，计算量小无需 skeleton |
| 流月曲线首次渲染 | 直接渲染 | 加 `transition: opacity 0.3s` 淡入 |
| 月份详情卡切换 | 直接切换 | **不加动画**，直接无延迟切换（频繁对比月份时动画反而造成卡顿感） |

---

### 错误处理降级

| 错误场景 | 降级方案 |
|---------|---------|
| `bridgeResult` 为 null | 曲线使用地支五行基础分数组（`[55,60,65,70,65,75,70,65,60,55,60,65]`），**曲线改为虚线 `stroke-dasharray="4 3"`，透明度降至 0.4**，并显示提示："当前使用地支基础推演，解锁流月获取精准能量曲线" |
| `fortuneNarrativeService` 返回空 | `DecadeOverview` 显示"数据加载中，请稍候"占位文字 |
| AI 调用失败 | 保留现有 `fp-ai-raw` 降级显示，同时在 `fp-ai-section` 顶部显示 `⚠️ AI解读暂时不可用` |
| `allDecades` 为空数组 | `LifeStageHeader` 只显示进度条，隐藏滑动卡片区域 |
| **LLM 输出 JSON 格式损坏**（后端） | 后端用 Zod 校验，解析失败时返回预设安全兜底 JSON：`{ "energy": "今日能量平稳，宜静守待机。", "action": "宜：低调行事\n忌：冒进决策", "warning": "数据解析异常，以下为基础推演结果", "do": ["静守"], "dont": ["冒进"], "keywords": ["平稳", "静守", "待机"] }`，同时记录 Log，绝不让前端白屏 |

---

### UX 补充建议评估

| 建议 | 采纳？ | 说明 |
|------|--------|------|
| **A. 反馈闭环**（👍很准/👌一般/👎不准） | ✅ 采纳 | 需后端新增接口，前端 UI 简单，价值高 |
| **B. 分享卡片**（Canvas生成） | 🟡 延后 | 前端用 `html2canvas` 可实现，但需设计精美模板，工作量较大，建议二期 |
| **C. 大限卡片 hover 预览** | ✅ 采纳 | 桌面端 hover 显示 tooltip 预览，移动端点击切换，实现成本低 |
| **非当前大限视觉提示** | ✅ 采纳 | amber 色提示条，防止用户误解 |
| **警示色改为琥珀橙** | ✅ 采纳 | 将 `避` 策略色从绯红改为 `#F59E0B`（amber-400），更符合高级感 |
| **AI 输出结构化 JSON** | ✅ 强烈建议 | 需后端配合，见后端开发文档 |

---

## 九、后端开发文档（请转发给后端团队）

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

**数据库表建议**（`fortune_feedback`）：
```sql
CREATE TABLE fortune_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  profile_id VARCHAR(64) NOT NULL DEFAULT 'self',
  fortune_date DATE NOT NULL,
  dimension VARCHAR(16) NOT NULL CHECK (dimension IN ('daily', 'monthly', 'yearly')),
  accuracy VARCHAR(8) NOT NULL CHECK (accuracy IN ('high', 'medium', 'low')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id, fortune_date, dimension)
);
```

**权限**：需登录用户（Bearer Token）。

**UPSERT 逻辑**（重要）：用户可修改当天反馈，接口使用 `INSERT ... ON CONFLICT DO UPDATE` 而非纯 `INSERT`。前端 UI 需支持点击已选中的反馈按钮进行更改（高亮选中态 + 可再次点击切换）。

```sql
-- 使用 UPSERT，允许用户当天修改反馈
INSERT INTO fortune_feedback (user_id, profile_id, fortune_date, dimension, accuracy, note)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id, profile_id, fortune_date, dimension)
DO UPDATE SET accuracy = EXCLUDED.accuracy, note = EXCLUDED.note, updated_at = NOW();
```

---

### 接口 2：AI 输出结构化 JSON（强烈建议）

**背景**：当前 `timeSpaceAIGenerator.ts` 在**前端直接调用 LLM API**，存在以下风险：
1. **API Key 暴露**：`VITE_LLM_API_KEY` 在前端可被用户抓包获取
2. **Token 控制失效**：前端无法真正限制 Token 消耗
3. **输出格式不稳定**：纯文本 Markdown 需前端解析，容易崩溃

**建议方案**：将 LLM 调用迁移到后端，后端负责：
1. 接收前端传来的时空上下文数据
2. 调用 LLM（DeepSeek）并要求输出结构化 JSON
3. 解析、校验 JSON 后返回给前端

**新增接口**：`POST /api/timespace/ai-guidance`

**请求体**（前端传入时空上下文）：
```json
{
  "dimension": "daily",
  "date": "2026-02-19",
  "profile_id": "self",
  "context": {
    "daxian": {
      "startAge": 32,
      "endAge": 41,
      "palaceName": "迁移宫",
      "tiangan": "壬",
      "sihua": { "lu": "天梁", "quan": "紫微", "ke": "左辅", "ji": "武曲" }
    },
    "liunian": {
      "year": 2026,
      "mingGong": "破军",
      "sihua": { "lu": null, "quan": null, "ke": null, "ji": "破军" }
    },
    "liuday": {
      "tiangan": "甲",
      "dizhi": "子",
      "mingGong": "命宫",
      "sihua": { "lu": "廉贞", "quan": null, "ke": null, "ji": null }
    }
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

**后端提示词修改要点**（在现有 `timeSpaceAIGenerator.ts` 的 systemPrompt 基础上增加）：
```
# Output Format (必须严格遵守)
你必须输出合法的 JSON 对象，格式如下：
{
  "energy": "...",     // 今日气象，1-2句
  "action": "...",     // 行事心法，3-5条，每条以"宜："或"忌："开头，换行分隔
  "warning": "...",    // 避坑指南，1-2句
  "do": ["...", "..."], // 宜做事项，2-3条，每条不超过8字
  "dont": ["..."],      // 忌做事项，1-2条，每条不超过8字
  "keywords": ["...", "...", "..."] // 今日核心关键词，3个，每个不超过4字
}
不要输出任何 JSON 以外的内容，不要加 markdown 代码块。
```

**流式输出处理**：后端可先流式接收 LLM 输出，完整接收后解析 JSON，再一次性返回给前端（非流式）。或者后端流式转发，前端在完整接收后解析。

**权限**：需登录用户 + 已解锁对应维度（通过 `TimeSpaceUnlockService` 验证）。

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

**用途**：前端在流日卡显示"你曾反馈：很准"，形成闭环体验。

---

### 前端对接说明

后端完成以上接口后，前端需要：

1. **接口1（反馈）**：在 `src/api/modules/fortune.ts` 中新增 `submitFeedback` 方法
2. **接口2（AI结构化）**：修改 `FortunePlanning.vue` 中的 `generateTimeSpaceAIGuidance` 函数，改为调用后端接口而非直接调用 LLM
3. **接口3（反馈历史）**：在 `src/api/modules/fortune.ts` 中新增 `getFeedbackHistory` 方法

> 在后端接口未就绪前，前端将继续使用现有的前端直连 LLM 方案，并对 AI 文本做简单的 Markdown 解析作为过渡方案。

---

## 十、辅助工作选项（二选一，优先实施）

### 选项 A：AI Prompt Few-Shot 工程优化
**目标**：改写 `timeSpaceAIGenerator.ts` 中的 Prompt，引入 Few-Shot 正反示例，强制 LLM 稳定输出符合规范的 JSON 结构。

**工作内容**：
- 在 `systemPrompt` 的 Output Format 段落后，追加 `# Examples` 章节
- 提供 1 个正确示例（`"good_example"`）+ 1 个错误示例（`"bad_example"`），明确告知 LLM 什么是合格输出
- 针对 `daily / monthly / yearly` 三个维度分别提供示例
- 同步更新后端文档中接口 2 的提示词规范

**预期收益**：LLM JSON 格式稳定性从约 85% 提升至 95%+，大幅减少后端 Zod 校验失败频率。

**实施文件**：`src/features/ziwei/services/timeSpaceAIGenerator.ts`

---

### 选项 B：错误状态 UI 设计（Error States）
**目标**：梳理"网络断开"、"AI 生成超时"、"数据解析失败"三种场景下，各卡片的优雅降级 UI 规范。

**工作内容**：
- 定义 3 种错误状态的视觉规范（图标 + 文案 + 操作按钮）
- 在 `FortunePlanning.vue` 中实现 `errorState` 响应式变量，统一管理各卡片的错误显示
- 为 AI 解锁区增加"重试"按钮（`handleRetryAI`），超时后自动触发

**三种错误状态规范**：

| 场景 | 图标 | 文案 | 操作 |
|------|------|------|------|
| 网络断开 | 📡 | "网络连接中断，运势数据暂时无法加载" | `[重新连接]` |
| AI 生成超时（>30s） | ⏱️ | "解读生成超时，可能是服务繁忙" | `[重试]` `[稍后再看]` |
| JSON 解析失败 | ⚠️ | "解读格式异常，已为你显示基础推演结果" | 自动降级，无需操作 |

**实施文件**：`FortunePlanning.vue`（新增 `errorState` 管理）、各 AI 解锁区模板

---

## 十一、最终确认清单

在开始实施前，请确认以下决策：

| 决策点 | 当前方案 | 是否确认？ |
|--------|---------|-----------|
| 删除锚点导航，只保留悬浮球 | ✅ 已更新 | 待确认 |
| 月份详情卡切换不加动画 | ✅ 已更新 | 待确认 |
| 降级曲线改为虚线+低透明度 | ✅ 已更新 | 待确认 |
| 反馈接口改为 UPSERT 逻辑 | ✅ 已更新（后端文档） | 待确认 |
| LLM JSON 损坏时后端返回兜底 JSON | ✅ 已更新（后端文档） | 待确认 |
| 警示色改为琥珀橙 `#F59E0B` | ✅ 已更新 | 待确认 |
| 辅助工作选项 A 或 B | ⬜ 待选择 | **请选择** |

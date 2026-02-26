# 时空导航决策看板 v2.0 — 战略级 UI 重构架构设计文档

> **版本**: v2.0-draft  
> **日期**: 2026-02-23  
> **作者**: 天玄系统架构师  
> **状态**: 🟡 待确认

---

## 〇、现状摘要与改造范围

### 现有组件树 (AS-IS)

```
FortunePlanning.vue (3074行，God Component)
├── LifeStageHeader.vue     — 人生进度条 + 大限卡片滑动
├── DecadeOverview.vue       — 大限叙事 + 六维雷达图 + 势能卡片
├── YearlyTheme.vue          — 年度命题卡 + 机遇/注意/关键词/雷达
├── MonthlyRhythm.vue        — 全年能量曲线 + 月份横滑 + 月详情
├── YiJiPanel.vue            — 结构化宜忌面板 (P1平铺 + P2/P3折叠)
│   ├── YiJiCard.vue
│   └── AlertCard.vue
└── (内联) 流日卡片           — 干支大字 + 能量条 + 关键词 + 宜忌速览
```

### 核心痛点

| # | 痛点 | 数据支撑 |
|---|------|----------|
| 1 | FortunePlanning.vue 3074 行，状态爆炸 | 30+ ref/computed, 10+ async 函数 |
| 2 | 反馈按钮散落三处，页面冗余 | 每个维度底部各一组"准/不准" |
| 3 | 大限左栏 PC/移动无差异化，首屏被占 | 移动端大限栏永久占 ~40% 宽度 |
| 4 | 无锚点导航，长页滚动迷失 | 四个维度堆叠 ~2000px+ |
| 5 | 流日宜忌长文本阅读压力大 | 未折叠时 6-8 条宜忌占满屏 |
| 6 | 无 YOY 对比、无因果链条 | 用户无法感知"今年 vs 去年" |

---

## 一、数据库设计 (DDL)

### 1.1 新增表：`daily_checkins` — 今日复盘打卡

```sql
-- ============================================
-- 今日复盘打卡表（聚合反馈 + 习惯培养）
-- 替代分散在 yearly/monthly/daily 三处的"准/不准"按钮
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL,
  checkin_date  DATE NOT NULL,

  -- 复盘评分（1-5星，替代二元"准/不准"）
  accuracy_score SMALLINT CHECK (accuracy_score BETWEEN 1 AND 5),

  -- 情绪标签（多选，JSONB 数组：["satisfied","anxious","surprised"]）
  mood_tags     JSONB DEFAULT '[]'::jsonb,

  -- 用户自由备注（可选，≤500字）
  note          TEXT CHECK (char_length(note) <= 500),

  -- 命中维度反馈（哪些维度用户认为准确）
  accurate_dimensions TEXT[] DEFAULT '{}',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 每人每天每档案只能打卡一次
  CONSTRAINT uq_daily_checkin UNIQUE(user_id, profile_id, checkin_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON public.daily_checkins(user_id, profile_id, checkin_date DESC);

-- 更新时间触发器（复用已有函数）
CREATE TRIGGER trg_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION update_unlocked_time_assets_updated_at();

COMMENT ON TABLE public.daily_checkins IS '今日复盘打卡表：聚合反馈，替代散落的准/不准按钮';
```

### 1.2 新增表：`yearly_comparisons` — YOY 同比缓存

```sql
-- ============================================
-- 年度同比缓存表（流年 YOY 对比数据）
-- 缓存 AI 生成的同比分析结论，避免重复计算
-- ============================================
CREATE TABLE IF NOT EXISTS public.yearly_comparisons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL,
  current_year  SMALLINT NOT NULL,
  previous_year SMALLINT NOT NULL,

  -- 各维度 YOY 变化量 (-100 ~ +100)
  career_delta  SMALLINT DEFAULT 0,
  wealth_delta  SMALLINT DEFAULT 0,
  love_delta    SMALLINT DEFAULT 0,

  -- AI 生成的一句话同比结论
  summary       TEXT,

  -- 大限-流年化学反应标签
  -- 如 'key_sprint'(关键冲刺年), 'defense'(重点防守年), 'transition'(过渡年)
  decade_year_tag TEXT CHECK (decade_year_tag IN (
    'key_sprint', 'defense', 'transition', 'harvest', 'dormant'
  )),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_yearly_comparison UNIQUE(user_id, profile_id, current_year)
);

CREATE INDEX IF NOT EXISTS idx_yearly_comparisons_lookup
  ON public.yearly_comparisons(user_id, profile_id, current_year);

CREATE TRIGGER trg_yearly_comparisons_updated_at
  BEFORE UPDATE ON public.yearly_comparisons
  FOR EACH ROW EXECUTE FUNCTION update_unlocked_time_assets_updated_at();

COMMENT ON TABLE public.yearly_comparisons IS '年度同比缓存：存储 YOY 对比数据和大限-流年化学反应标签';
```

### 1.3 新增表：`user_preferences` — 用户偏好设置

```sql
-- ============================================
-- 用户偏好设置表（Geek Mode / 左栏折叠状态等）
-- 跨设备同步用户个性化配置
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 各功能开关（JSONB，便于扩展）
  -- 结构示例：{ "geekMode": false, "proMode": false, "sidebarCollapsed": true }
  preferences   JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_preferences UNIQUE(user_id)
);

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_unlocked_time_assets_updated_at();

COMMENT ON TABLE public.user_preferences IS '用户偏好设置：Geek Mode、Pro Mode、侧栏折叠等';
```

### 1.4 现有表无需修改

| 表名 | 说明 |
|------|------|
| `unlocked_time_assets` | 解锁记录，结构不变 |
| `timespace_cache` | 时空缓存，结构不变 |
| `resonance_feedback` | 将被 `daily_checkins` 功能替代，可保留但前端不再新写入 |

---

## 二、API 接口定义契约

> **鉴权中间件**: 所有接口均需 `authMiddleware` (JWT 校验) + `rateLimitMiddleware`  
> **Base URL**: `/api`  
> **Content-Type**: `application/json`

### 2.1 今日复盘打卡

#### `POST /api/fortune/checkin`

提交或更新今日复盘打卡（幂等：同一天重复提交为更新）。

**Request Body:**
```typescript
{
  checkin_date: string       // YYYY-MM-DD，必填
  profile_id: string         // UUID，必填
  accuracy_score: number     // 1-5，必填
  mood_tags?: string[]       // 情绪标签数组，可选
  note?: string              // 自由备注，可选，≤500字
  accurate_dimensions?: string[] // ['yearly','monthly','daily']，可选
}
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    id: string,
    checkin_date: string,
    is_new: boolean          // true=首次打卡, false=更新
  }
}
```

**Response 400:** 参数校验失败  
**Response 401:** 未授权  
**Response 409:** 并发冲突（两个客户端同时提交，使用 UPSERT 避免）

#### `GET /api/fortune/checkin`

查询打卡记录。

**Query Params:**
```
profile_id: string           // UUID，必填
date?: string                // YYYY-MM-DD，默认今天
range?: 'week' | 'month'    // 可选，返回区间内所有打卡
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    checkins: DailyCheckin[], // 数组
    streak: number            // 连续打卡天数
  }
}
```

### 2.2 年度同比 (YOY)

#### `GET /api/fortune/yearly-comparison`

获取年度同比数据（优先返回缓存，无缓存则触发计算）。

**Query Params:**
```
profile_id: string           // UUID，必填
year: number                 // 当前年份，必填
```

**Response 200:**
```typescript
{
  success: true,
  data: {
    current_year: number,
    previous_year: number,
    career_delta: number,     // -100 ~ +100
    wealth_delta: number,
    love_delta: number,
    summary: string,          // AI 一句话结论
    decade_year_tag: string,  // 大限-流年化学反应标签
    is_cached: boolean        // 是否从缓存返回
  }
}
```

**计算逻辑**: 后端对比 `current_year` 和 `previous_year` 的 `YearlyThemeData.radar` 差值，生成 `summary`。若无去年数据，`summary` 返回 `"首年使用，暂无同比数据"`。

### 2.3 用户偏好

#### `GET /api/user/preferences`

**Response 200:**
```typescript
{
  success: true,
  data: {
    geekMode: boolean,
    proMode: boolean,
    sidebarCollapsed: boolean,
    // ...可扩展
  }
}
```

#### `PATCH /api/user/preferences`

**Request Body:**
```typescript
{
  geekMode?: boolean,
  proMode?: boolean,
  sidebarCollapsed?: boolean
}
```

**Response 200:**
```typescript
{ success: true, data: { updated: true } }
```

### 2.4 现有接口无需修改

| 接口 | 说明 |
|------|------|
| `POST /api/timespace/ai-guidance` | AI 解读生成，结构不变 |
| `POST /api/astrology/time-assets/unlock` | 解锁流程，结构不变 |
| `GET /api/astrology/time-assets/check` | 解锁状态检查，结构不变 |
| `POST /api/fortune/feedback` | 旧反馈接口，保留但前端逐步迁移到 checkin |

---

## 三、前端组件树拆分

### 3.1 目标组件树 (TO-BE)

```
FortunePlanning.vue (瘦身至 ~800 行，仅负责数据编排和路由)
│
├─ composables/
│  ├── useFortunePlanningState.ts  [新建] 状态管理（从 God Component 抽出）
│  ├── useUnlockFlow.ts            [新建] 解锁流程统一管理
│  ├── useAIGuidance.ts            [新建] AI 解读获取/缓存/重试
│  └── useYOYComparison.ts         [新建] YOY 同比数据
│
├─ 全局导航层
│  ├── FloatingTOC.vue             [新建] 右侧悬浮锚点导航
│  ├── GeekModeToggle.vue          [新建] 右上角玄学术语开关
│  └── ToolbarHeader.vue           [新建] 顶部工具栏（从内联抽出）
│
├─ 宏观战略层
│  ├── DecadeSidebar.vue           [新建] 左侧栏容器（PC展开/移动折叠）
│  │   ├── DecadeSummaryCard.vue   [新建] 移动端"十年主轴摘要卡"
│  │   ├── LifeStageHeader.vue     [修改] 增加折叠回调 props
│  │   └── DecadeOverview.vue      [修改] 雷达图放大 + 顶点显示数值 + 移除底部分数条
│  │       └── TopThreeGoals.vue   [新建] "这十年最重要的三件事"
│  │
│  ├── YearlyTheme.vue             [修改] 合并为"年度行动指南 Playbook"
│  │   ├── DecadeYearTag.vue       [新建] 大限引动标签（因果链条外显）
│  │   ├── YOYComparison.vue       [新建] 同比去年模块
│  │   └── YearlyPlaybook.vue      [新建] 合并机遇+注意→行动指南
│  │
│  └── (移除) 流年重复雷达图/进度条
│
├─ 微观执行层
│  ├── MonthlyRhythm.vue           [修改] 能量曲线保留 + 月份横滑保留
│  │   ├── MonthHeatmap.vue        [新建] 能量热力图（替代密集折线图）
│  │   └── MonthHighlight.vue      [新建] 自动高亮最高/最低月份
│  │
│  ├── DailyHero.vue               [新建] 流日 Hero 摘要卡（一句话结论）
│  ├── DailySceneScores.vue        [新建] 场景化评分（"财运77分·宜催款"）
│  ├── DailyYiJiCollapsible.vue    [新建] 渐进式宜忌（默认显示2条，折叠更多）
│  ├── EmotionalGuide.vue          [新建] 情绪安抚避坑指南
│  └── DailyCheckinModule.vue      [新建] 今日复盘打卡（聚合反馈）
│
├─ 商业闭环层
│  ├── BoostRecommendation.vue     [新建] 破局/助运商业插件
│  └── UnlockButton.vue            [新建] 统一解锁按钮组件（复用三处）
│
└─ 基础组件（不变）
   ├── YiJiPanel.vue
   ├── YiJiCard.vue
   └── AlertCard.vue
```

### 3.2 各组件职责说明

| 组件 | 类型 | 职责 |
|------|------|------|
| **`useFortunePlanningState.ts`** | Composable | 从 FortunePlanning.vue 抽出所有 ref/computed/watch，包括大限/流年/流月/流日信息、日期选择、命盘加载。约 600 行 → 独立 composable |
| **`useUnlockFlow.ts`** | Composable | 统一管理 yearly/monthly/daily 三维度的解锁状态、解锁中状态、恢复逻辑。消除三处重复代码 |
| **`useAIGuidance.ts`** | Composable | AI 解读请求、超时控制、fallback 降级、缓存持久化。当前约 400 行分散在 FortunePlanning.vue |
| **`FloatingTOC.vue`** | 展示 | 悬浮在右下角的电梯导航，包含 4 个锚点（大限/流年/流月/流日），点击平滑滚动；当前活跃段高亮（IntersectionObserver） |
| **`DecadeSidebar.vue`** | 容器 | PC 端默认展开 + `[< 收起]` 按钮；移动端默认折叠为 `DecadeSummaryCard`，点击展开完整面板。通过 `v-if/transition` + `matchMedia` 控制 |
| **`DecadeSummaryCard.vue`** | 展示 | 移动端折叠态的大限卡片：一行显示"当前大限 · XX宫 · XX-XX岁"，点击展开 |
| **`TopThreeGoals.vue`** | 展示 | 接收 `daxian` props，调用叙事服务提炼 3 条极简战略目标，格式：emoji + 短句 |
| **`DecadeYearTag.vue`** | 展示 | 接收大限和流年四化数据，计算化学反应，输出动态标签如"⚡ 大限引动 · 关键冲刺年" |
| **`YOYComparison.vue`** | 展示 | 接收 `useYOYComparison` 返回的数据，展示三维度 delta 箭头 + 一句话结论 |
| **`YearlyPlaybook.vue`** | 展示 | 合并现有"机遇"+"注意事项"为统一的"年度行动指南"卡片，减少视觉分割 |
| **`DailyHero.vue`** | 展示 | 流日顶部 Hero 区域：特大号字体显示一句话结论（如"今日宜跨部门沟通，切忌大额转账"），从 AI 的 `energy` 字段提取 |
| **`DailySceneScores.vue`** | 展示 | 将干瘪的"事业80/财运65/人际70"改为"事业80分·宜主动出击 / 财运65分·宜催款理财 / 人际70分·贵人相助" |
| **`DailyYiJiCollapsible.vue`** | 交互 | 默认只显示前 2 条最高优先级宜/忌（短句），长文本折叠至 `[展开更多]` |
| **`EmotionalGuide.vue`** | 展示 | 将"忌"的冷冰冰警告转化为情绪关怀文案，如"今日易有挫败感，建议通过运动排解" |
| **`DailyCheckinModule.vue`** | 交互 | 流日卡片最底部，1-5星评分 + 情绪标签选择 + 可选备注。替代三处"准/不准"按钮 |
| **`GeekModeToggle.vue`** | 交互 | 右上角 Toggle 开关，控制全局 `geekMode` 状态，通过 `provide/inject` 传递 |
| **`UnlockButton.vue`** | 交互 | 统一的解锁按钮组件，接收 `dimension`/`price`/`loading`/`unlocked` props，消除三处按钮代码重复 |
| **`BoostRecommendation.vue`** | 展示 | 在流年/流月"忌"/"低谷"下方，智能推荐改运方案（方位/颜色建议），为后期付费插件预留 slot |

---

## 四、核心逻辑流

### 4.1 页面初始化流程（优化后）

```
onMounted
  │
  ├─ 1. ensureAuthoritativeChartForFortune()  [不变]
  ├─ 2. ensureChartConsistencyByRoute()        [不变]
  │
  ├─ 3. useFortunePlanningState.init(date)
  │     ├─ 计算大限/流年/流月/流日（纯前端 iztro）
  │     ├─ 计算结构化宜忌（yijiTemplateRouter）
  │     └─ 加载 timeSpaceContext
  │
  ├─ 4. useUnlockFlow.restoreAll(date)
  │     ├─ Promise.all([checkYearly, checkMonthly, checkDaily])
  │     ├─ 已解锁维度 → 从 localStorage 恢复 AI 缓存
  │     └─ 缓存未命中 → 触发 useAIGuidance.generate(dim)
  │
  ├─ 5. useYOYComparison.fetch(year)           [新增]
  │     ├─ GET /api/fortune/yearly-comparison
  │     └─ 结果注入 YOYComparison.vue
  │
  └─ 6. loadUserPreferences()                  [新增]
        ├─ GET /api/user/preferences
        └─ 恢复 geekMode / proMode / sidebarCollapsed
```

### 4.2 解锁流程（统一化）

```
用户点击 UnlockButton(dimension)
  │
  ├─ 1. useUnlockFlow.unlock(dimension, date)
  │     ├─ 防抖：isUnlocking[dim] === true → return
  │     ├─ 检查登录状态
  │     └─ 调用 TimeSpaceUnlockService.unlockTimeSpaceAsset()
  │           ├─ 幂等性检查（已解锁直接返回）
  │           ├─ QuotaService.consumeQuota()  扣费
  │           │   └─ 失败 → 弹窗提示余额不足
  │           ├─ astrologyApi.unlockTimeAsset()  记录解锁
  │           │   └─ 失败 → 自动退款 + 提示重试
  │           └─ 成功 → return { success: true }
  │
  ├─ 2. 标记 unlocked[dim] = true
  │
  └─ 3. useAIGuidance.generate(dimension, context)
        ├─ 优先请求后端 POST /api/timespace/ai-guidance
        │   ├─ 超时 30s → abort + 标记 timeout
        │   ├─ 404/500 → apiUnavailableFlags[dim] = true → fallback 本地 AI
        │   └─ 成功 → 解析 JSON → 写入 aiContent[dim] + setAICache()
        │
        └─ fallback: generateTimeSpaceGuidance()  本地流式输出
            └─ 最终 fallback: FALLBACK_AI_CONTENT 静态内容
```

### 4.3 今日复盘打卡流程（新增）

```
用户在 DailyCheckinModule 选择星级 + 情绪标签
  │
  ├─ 1. 本地状态立即更新（乐观更新 UI）
  │
  ├─ 2. POST /api/fortune/checkin （debounce 500ms）
  │     ├─ 后端 UPSERT（INSERT ON CONFLICT UPDATE）
  │     └─ 返回 is_new / streak
  │
  └─ 3. 更新连续打卡天数展示
```

### 4.4 悬浮 TOC 交互逻辑

```
FloatingTOC.vue
  │
  ├─ onMounted: 用 IntersectionObserver 监听四个锚点元素
  │   ├─ threshold: 0.3
  │   └─ 当 section 进入视口 → 更新 activeSection
  │
  ├─ 点击锚点 → element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  │
  └─ 移动端：底部固定横条 + 4 个圆点
     PC端：右侧垂直悬浮 + 文字标签
```

### 4.5 大限侧栏响应式逻辑

```
DecadeSidebar.vue
  │
  ├─ const isMobile = useMediaQuery('(max-width: 768px)')
  │
  ├─ PC端 (isMobile = false):
  │   ├─ 默认展开，显示完整 LifeStageHeader + DecadeOverview
  │   └─ [< 收起] 按钮 → sidebarCollapsed = true → aside { width: 0; overflow: hidden }
  │
  └─ 移动端 (isMobile = true):
      ├─ 默认显示 DecadeSummaryCard（一行摘要卡）
      ├─ 点击 → 下滑展开完整大限面板（transition height）
      └─ 大限面板移到"右栏"顶部（grid reorder），不再占独立侧栏
```

### 4.6 边缘情况处理

| 场景 | 处理策略 |
|------|----------|
| **并发点击解锁** | `isUnlocking[dim]` 信号量 + 按钮 disabled，后端 UNIQUE 约束保证幂等 |
| **Token 过期** | `request` 拦截器统一处理 401 → 刷新 Token → 自动重试原请求（现有机制） |
| **AI 超时 (>30s)** | AbortController 中断 + 显示超时错误卡片 + 重试按钮 |
| **后端 404/500** | 标记 `apiUnavailableFlags[dim]`，同一会话内不再重试后端，直接 fallback 本地 AI |
| **命盘未生成** | `v-if="!currentChart"` 显示空状态 + 引导按钮（现有逻辑不变） |
| **localStorage 满** | `setAICache` 内 try-catch，满时清理最旧缓存（LRU 策略） |
| **快速切换日期** | `watch(selectedDate)` + `nextTick` 确保 UI 更新完毕后再请求数据；旧请求 abort |
| **YOY 无去年数据** | `summary = "首年使用，暂无同比数据"`，隐藏 delta 箭头 |

---

## 五、利弊分析 (Pros & Cons)

### ✅ Pros

| # | 优势 | 说明 |
|---|------|------|
| 1 | **首屏转化率提升** | 移动端大限折叠后，流日 Hero 摘要直接出现在首屏，满足"只看一眼"的快餐需求 |
| 2 | **God Component 瘦身** | FortunePlanning.vue 从 3074 行降至 ~800 行，状态管理抽入 3 个 composable，可测试性大幅提升 |
| 3 | **反馈数据质量提升** | 从二元"准/不准"升级为 1-5 星 + 情绪标签，数据粒度提升 5x，为后续 AI 模型训练提供更丰富的信号 |
| 4 | **商业闭环预埋** | `BoostRecommendation.vue` 为付费改运方案预留标准化插槽，后续接入零开发成本 |
| 5 | **因果感增强** | `DecadeYearTag` + `YOYComparison` 让用户感知"大限→流年→流月"的因果链条，提升专业信任感 |
| 6 | **阅读压力降低** | 流日宜忌默认只展示 2 条 + 折叠，场景化评分赋予分数执行意义 |

### ⚠️ Cons / 风险

| # | 风险 | 缓解措施 |
|---|------|----------|
| 1 | **组件数量膨胀（7→22）** | 严格遵守单一职责原则；composable 统一状态管理避免 props drilling；按功能域分目录 |
| 2 | **YOY 计算可能不准** | 去年的 radar 数据依赖 `YearlyThemeData`，如果用户去年未使用，则无数据。缓解：`yearly_comparisons` 表存储后端独立计算结果，不依赖前端缓存 |
| 3 | **IntersectionObserver 兼容性** | 低版本 WebView 可能不支持。缓解：加 polyfill（`intersection-observer` npm 包，3KB gzipped） |
| 4 | **侧栏折叠的 CSS 复杂度** | PC 双栏 + 移动端单栏 + 折叠过渡动画。缓解：使用 CSS Grid + `grid-template-columns` 动态切换，避免 JS 计算宽度 |
| 5 | **迁移期新旧共存** | 旧的"准/不准"按钮和新的"今日复盘打卡"在过渡期可能共存。缓解：通过 feature flag 控制，分批上线 |
| 6 | **AI Prompt 需适配新结构** | `DailyHero` 需要 AI 返回一句话摘要（当前 `energy` 字段的第一句）。缓解：后端 prompt 增加 `hero_summary` 字段，前端 fallback 取 `energy` 首句 |
| 7 | **`user_preferences` 同步延迟** | 跨设备偏好同步存在短暂不一致。缓解：本地 localStorage 优先 + 后台静默同步（eventual consistency） |
| 

---

## 六、实施分期建议

| 期次 | 范围 | 预估工时 |
|------|------|----------|
| **P0 - 结构重构** | 抽取 3 个 composable + 瘦身 FortunePlanning.vue + UnlockButton 统一 | 2-3 天 |
| **P1 - 核心交互** | FloatingTOC + DecadeSidebar 响应式 + DailyHero + DailyYiJiCollapsible | 2-3 天 |
| **P2 - 因果链条** | DecadeYearTag + YOYComparison + YearlyPlaybook 合并 | 2 天 |
| **P3 - 反馈聚合** | DailyCheckinModule + daily_checkins 表 + API | 1-2 天 |
| **P4 - 极客体验** | GeekModeToggle 全局化 + BoostRecommendation 预埋 + user_preferences | 1 天 |
| **P5 - 打磨优化** | DecadeOverview 雷达图放大 + 顶点数值  | 1-2 天 |

---

## 七、产品生态融合：今日气象 × 时空导航·流日 战略定位切割

> **背景**: 系统中同时存在【今日气象】（独立沉浸式页面）和【时空导航 → 流日】（结构化 Dashboard），若不做严格定位切割，将产生"业务重叠"、"用户心智互搏"和"二次收割"三大致命伤。

### 7.1 战略定位矩阵

| 维度 | 【今日气象】独立页面 | 【时空导航 → 流日】Dashboard |
|------|-------------------|-----------------------------|
| **隐喻** | 天气预报 · 心情抽卡 | 行车导航 · 作战清单 |
| **用户诉求 (JTBD)** | "给我今天的基调/氛围，安抚情绪" | "告诉我今天具体该干嘛/别干嘛，别废话" |
| **体验风格** | 沉浸 · 感性 · 神秘 · 慢节奏（Zen） | 高效 · 理性 · 结构化 · 快节奏（SaaS） |
| **核心交付物** | 一个汉字 + 氛围关键词 + 命理溯源（Why） | ✅ 宜做事项 + ❌ 忌做事项 + 特别预警（What） |
| **付费逻辑** | 免费抽字 → 付费解码（天机解码） | 免费预览 → 付费解锁完整宜忌 |
| **产品生态作用** | 高频 DAU 触点（唤醒 / 签到 / 社交分享） | 深度决策工具（高净值用户留存） |
| **内容边界** | **只回答"为什么"（Why）** | **只回答"做什么"（What/How）** |

> **核心原则**：两个功能是**"情绪"与"理智"的阴阳两面**，不是竞争关系，而是互相导流的漏斗两端。

---

### 7.2 晨间用户旅程重构（User Journey）

```
用户打开 App
     │
     ▼
【今日气象】首屏（沉浸星空）
     │ 点击中心
     ▼
抽取今日专属汉字（如"求"）← 免费，社交分享素材
     │
     ├─ 主按钮：[开启今日时空导航] ──────────────────────────────┐
     │   跳转至 FortunePlanning.vue，锚点定位到「流日」区域       │
     │                                                            ▼
     └─ 次按钮：[天机解码 · 阅读星象溯源]          【时空导航 → 流日】
         留在当前沉浸模式，展开天机解码弹窗                  DailyHero（一句话结论）
         （只含 Why，不含 Do/Don't）                         DailySceneScores（场景化评分）
                                                              DailyYiJiCollapsible（宜忌清单）
                                                              EmotionalGuide（情绪安抚）
                                                              DailyCheckinModule（今日复盘）
```

**关键设计决策**：
- 抽字环节**必须免费**，是 DAU 触点和社交裂变的核心钩子
- [开启今日时空导航] 是**主 CTA**，视觉权重 > 次按钮，承担从气象到导航的流量导入
- 两个按钮并存，满足不同用户心智：感性用户留在气象，理性用户直奔导航

---

### 7.3 内容切割手术：天机解码弹窗（图3）改造

#### 现状问题

当前天机解码弹窗（图3）同时包含：
- ✅ 保留：命理溯源（"为何今日气象为X"）
- ✅ 保留：专业术语解释（"贪狼坐守流日命宫"）
- ❌ **必须删除**：注意事项（与流日"忌"重叠）
- ❌ **必须删除**：建议行动点（与流日"宜"重叠）

#### 改造后弹窗结构

```
天机解码弹窗（只负责 Why）
├── 今日字象：「求」
├── 气象定调：一句话氛围描述（感性文案）
├── 命理溯源（核心保留）
│   ├── 流日干支 + 宫位落点
│   ├── 四化飞星解读（Why 层面）
│   └── 与大限/流年的共振关系
├── [金线高亮] 核心术语（见 7.4）
└── 底部引导语（新增）
    "今日具体行事宜忌与避坑指南，请前往「时空导航」获取行动清单 →"
    [按钮：前往时空导航]
```

**坚决砍掉**的内容（迁移至流日 Dashboard）：

| 原天机解码内容 | 迁移目标 |
|--------------|---------|
| 注意事项（如"忌冲动消费"） | `DailyYiJiCollapsible` 的"忌"列表 |
| 建议行动（如"宜深度沟通"） | `DailyYiJiCollapsible` 的"宜"列表 |
| 情绪预警（如"今日易有挫败感"） | `EmotionalGuide.vue` |

---

### 7.4 UI 细节：核心术语金线高亮

**需求**：天机解码弹窗长文本中，将"贪狼坐守流日命宫"等核心术语用金线高亮，提供视觉落脚点。

#### 实现方案

**方案 A（推荐）：前端正则高亮 + Tooltip**

```typescript
// src/utils/termHighlighter.ts
const ZIWEI_TERMS = [
  '化禄', '化权', '化科', '化忌',
  '命宫', '财帛宫', '官禄宫', '夫妻宫', '迁移宫',
  '贪狼', '紫微', '天机', '太阳', '武曲', '天同',
  '廉贞', '天府', '太阴', '巨门', '天相', '天梁', '七杀', '破军',
  '流日命宫', '流月命宫', '流年命宫',
  // ...可扩展
]

export function highlightTerms(text: string): string {
  // 按长度降序排列，避免短词覆盖长词
  const sorted = [...ZIWEI_TERMS].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(${sorted.map(t => escapeRegExp(t)).join('|')})`, 'g')
  return text.replace(pattern, '<mark class="term-highlight">$1</mark>')
}
```

```css
/* 金线高亮样式 */
.term-highlight {
  background: transparent;
  color: #D4AF37;                    /* 天玄金色 */
  border-bottom: 1px solid #D4AF37;  /* 金线下划线 */
  font-weight: 600;
  cursor: help;                      /* 暗示可交互 */
  padding: 0 1px;
}

/* Geek Mode 开启时：悬浮显示术语解释气泡 */
.geek-mode .term-highlight:hover::after {
  content: attr(data-explanation);
  position: absolute;
  background: #1c1917;
  color: #fef3c7;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 100;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
}
```

**方案 B（备选）：后端 AI 输出时标注**

在 AI prompt 中指示：`将核心术语用 <term> 标签包裹，如 <term>贪狼化禄</term>`，前端解析替换为高亮组件。

> **推荐方案 A**：不依赖 AI 输出格式，前端可控，性能更好（无额外 API 调用）。

#### 新增组件：`TermHighlightRenderer.vue`

```
src/features/ziwei/components/common/TermHighlightRenderer.vue
```

**职责**：接收 `text: string` + `geekMode: boolean`，输出带高亮和可选 Tooltip 的富文本。替代当前天机解码弹窗中的 `v-html` 直接渲染。

---

### 7.5 付费逻辑重新梳理（防"二次收割"感）

| 场景 | 当前逻辑 | 优化后逻辑 |
|------|---------|-----------|
| 今日气象抽字 | 免费 | 免费（不变） |
| 天机解码（Why 弹窗） | 付费 10 Coins | 付费 10 Coins（不变，但内容精简为纯 Why） |
| 时空导航·流日完整宜忌 | 付费 10 Coins | **会员免费 / 非会员 10 Coins** |
| 已解锁天机解码的用户 | 无优惠 | **流日解锁享 5 Coins 折扣**（已为今日付过费） |

**关键优化**：已购买天机解码的用户，当天流日解锁享半价折扣。后端通过查询 `unlocked_time_assets` 表中当天 `dimension='daily'` 的记录来判断是否给折扣。这从根本上消除"二次收割"的被剥夺感，同时将两个功能的付费路径串联成一个完整的消费漏斗。

---

### 7.6 受影响的组件与 API 变更清单

#### 前端组件变更

| 组件 | 变更类型 | 变更内容 |
|------|---------|---------|
| `DailyWeatherModal.vue`（天机解码弹窗） | **修改** | 删除"注意事项"和"建议"区块；底部增加"前往时空导航"引导语和按钮 |
| `DailyWeatherPage.vue`（今日气象主页） | **修改** | 将"解锁此象"主按钮改为"开启今日时空导航"；原解锁功能降级为次按钮 |
| `TermHighlightRenderer.vue` | **新建** | 核心术语金线高亮渲染器 |
| `DailyHero.vue` | **新建**（已在第三章规划） | 接收从气象页跳转时的 `fromWeather` 参数，高亮显示"已看过今日气象"的衔接文案 |

#### API 变更

| 接口 | 变更类型 | 变更内容 |
|------|---------|---------|
| `GET /api/fortune/daily-weather` | **修改响应** | 删除 `suggestions`（建议）和 `cautions`（注意事项）字段；保留 `why_explanation`（命理溯源）和 `character`（今日汉字） |
| `POST /api/astrology/time-assets/unlock` | **新增逻辑** | 当 `dimension=daily` 时，检查当天是否已购买天机解码，若是则 `costCoins` 自动减半 |

#### 路由变更

```typescript
// 今日气象 → 时空导航的跳转，携带锚点参数
router.push({
  name: 'FortunePlanning',
  query: {
    anchor: 'daily',          // 自动滚动到流日区域
    fromWeather: '1',         // 标记来源，用于衔接文案
    date: formatDate(today),  // 保持日期一致
  }
})
```

---

### 7.7 更新后的实施分期

| 期次 | 范围 | 预估工时 |
|------|------|----------|
| **P0 - 结构重构** | 抽取 3 个 composable + 瘦身 FortunePlanning.vue + UnlockButton 统一 | 2-3 天 |
| **P1 - 核心交互** | FloatingTOC + DecadeSidebar 响应式 + DailyHero + DailyYiJiCollapsible | 2-3 天 |
| **P1.5 - 产品融合** | 天机解码弹窗内容切割 + 今日气象主 CTA 改造 + 跳转路由 + TermHighlightRenderer | 1-2 天 |
| **P2 - 因果链条** | DecadeYearTag + YOYComparison + YearlyPlaybook 合并 | 2 天 |
| **P3 - 反馈聚合** | DailyCheckinModule + daily_checkins 表 + API | 1-2 天 |
| **P4 - 极客体验** | GeekModeToggle 全局化 + BoostRecommendation 预埋 + user_preferences | 1 天 |
| **P5 - 打磨优化** | DecadeOverview 雷达图放大 + 顶点数值 | 1-2 天 |

> **新增 P1.5**：产品融合改造是解决用户心智互搏的关键，建议在 P1 完成后立即执行，优先级高于因果链条。

---

> **以上方案是否符合预期？确认后我将开始分步生成代码。**

---

## 八、方案修订与加固（基于架构审查意见）

> 本章对第一至七章中的设计缺陷进行**逐项修订**，所有修订均已在原章节标注 `[已修订→见§8]`。

---

### 8.1 计费透明化：引入询价机制（Quote API）

#### 问题
原方案将"天机解码半价"逻辑写死在 `POST /api/astrology/time-assets/unlock` 内部，属于**"暗扣"**——用户在点击前不知道实际扣费金额，违反透明计费原则。

#### 修订方案：询价/扣费解耦

**新增接口：`GET /api/pricing/quote`**

```
GET /api/pricing/quote?sku=fortune_daily&date=2026-02-23
Authorization: Bearer <token>
```

**后端逻辑：**
```
1. 查询 sku=fortune_daily 的基础价格（10 Coins）
2. 查询当天是否存在 sku=weather_decode 的成功解锁记录
   SELECT id FROM unlocked_time_assets
   WHERE user_id = ? AND dimension = 'daily'
     AND period_start = ? AND is_active = true
3. 若存在 → actual_price = 5，discount_reason = 'BUNDLE_WEATHER_DECODE'
4. 若不存在 → actual_price = 10，discount_reason = null
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sku": "fortune_daily",
    "original_price": 10,
    "actual_price": 5,
    "discount_reason": "BUNDLE_WEATHER_DECODE",
    "discount_label": "今日已解锁天机解码，享捆绑优惠"
  }
}
```

**前端展示流程：**
```
用户点击 UnlockButton(dimension='daily')
  │
  ├─ 1. GET /api/pricing/quote?sku=fortune_daily&date=...
  │     → 按钮文案更新为 [特惠解锁 · 5 币] 或 [解锁 · 10 币]
  │     → 显示折扣原因标签（如有）
  │
  └─ 2. 用户确认 → POST /api/astrology/time-assets/unlock
        Body: { sku, date, expected_price: 5 }  ← 前端传入期望价格
        后端二次校验 expected_price 与实际计算结果一致后执行扣费
        （防止前端篡改价格）
```

**`UnlockButton.vue` 新增 props：**
```typescript
interface Props {
  dimension: 'daily' | 'monthly' | 'yearly'
  date: string
  // 新增
  quoteData?: { actual_price: number; discount_reason?: string; discount_label?: string }
  isQuoteLoading?: boolean
}
```

---

### 8.2 DDL 加固修订

#### 8.2.1 `daily_checkins` 强约束版

```sql
CREATE TABLE public.daily_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 改为关联自建 users 表（非 auth.users）
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL,
  checkin_date  DATE NOT NULL,

  -- 新增：时区基准，防止跨时区用户打卡日期错乱
  checkin_tz    VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',

  accuracy_score SMALLINT CHECK (accuracy_score BETWEEN 1 AND 5),

  -- JSONB 存储情绪标签
  mood_tags     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 白名单约束：防止前端乱传数据导致大盘分析崩溃
  -- 允许的标签：satisfied(满足), anxious(焦虑), surprised(惊喜),
  --             calm(平静), excited(兴奋), frustrated(沮丧)
  CONSTRAINT chk_mood_tags CHECK (
    jsonb_array_length(mood_tags) = 0
    OR (
      mood_tags <@ '["satisfied","anxious","surprised","calm","excited","frustrated"]'::jsonb
    )
  ),

  note          TEXT CHECK (char_length(note) <= 500),
  accurate_dimensions TEXT[] DEFAULT '{}',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_checkin UNIQUE(user_id, profile_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON public.daily_checkins(user_id, profile_id, checkin_date DESC);

CREATE TRIGGER trg_daily_checkins_updated_at
  BEFORE UPDATE ON public.daily_checkins
  FOR EACH ROW EXECUTE FUNCTION update_unlocked_time_assets_updated_at();
```

#### 8.2.2 `yearly_comparisons` 版本控制版

```sql
-- 使用原生枚举类型，替代 TEXT CHECK
CREATE TYPE decade_year_tag_enum AS ENUM (
  'key_sprint',   -- 关键冲刺年
  'defense',      -- 重点防守年
  'transition',   -- 过渡年
  'harvest',      -- 收获年
  'dormant'       -- 蛰伏年
);

CREATE TABLE public.yearly_comparisons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_id    UUID NOT NULL,
  current_year  SMALLINT NOT NULL,
  previous_year SMALLINT NOT NULL,

  career_delta  SMALLINT CHECK (career_delta BETWEEN -100 AND 100),
  wealth_delta  SMALLINT CHECK (wealth_delta BETWEEN -100 AND 100),
  love_delta    SMALLINT CHECK (love_delta BETWEEN -100 AND 100),

  summary       TEXT,
  decade_year_tag decade_year_tag_enum,  -- 原生枚举，非 TEXT

  -- 新增：算法/Prompt 版本号，防止历史缓存与新算法口径冲突
  -- 格式：'v2.0-202602'（主版本-年月）
  -- 查询时过滤旧版本：WHERE algo_version = current_algo_version
  algo_version  VARCHAR(50) NOT NULL DEFAULT 'v2.0-202602',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_yearly_comparison UNIQUE(user_id, profile_id, current_year)
);

CREATE INDEX IF NOT EXISTS idx_yearly_comparisons_lookup
  ON public.yearly_comparisons(user_id, profile_id, current_year, algo_version);

CREATE TRIGGER trg_yearly_comparisons_updated_at
  BEFORE UPDATE ON public.yearly_comparisons
  FOR EACH ROW EXECUTE FUNCTION update_unlocked_time_assets_updated_at();
```

> **版本号使用规范**：后端 `YOYService` 维护常量 `CURRENT_ALGO_VERSION = 'v2.0-202602'`。查询缓存时加条件 `AND algo_version = CURRENT_ALGO_VERSION`，版本不匹配则视为缓存失效，重新计算并覆盖写入。

---

### 8.3 应用层安全加固

#### 8.3.1 统一错误码规范

```typescript
// src/types/api.ts（前端）/ backend/src/types/api.ts（后端共享）

type ErrorCode =
  | 'ERR_INSUFFICIENT_FUNDS'    // 余额不足
  | 'ERR_AI_TIMEOUT'            // AI 生成超时
  | 'ERR_PROFILE_MISMATCH'      // profile_id 不属于当前用户
  | 'ERR_ALREADY_UNLOCKED'      // 重复解锁
  | 'ERR_PRICE_MISMATCH'        // 询价结果与解锁时价格不一致（防篡改）
  | 'ERR_INVALID_SKU'           // 未知商品 SKU
  | 'ERR_RATE_LIMIT'            // 请求频率超限
  | 'ERR_UNAUTHORIZED'          // 未登录 / Token 失效

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: ErrorCode
    message: string             // 用户可见的中文提示
    detail?: string             // 开发调试用，生产环境可隐藏
  }
}
```

**前端错误处理映射：**
```typescript
// src/utils/errorHandler.ts
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ERR_INSUFFICIENT_FUNDS: '天玄币余额不足，请先充值',
  ERR_AI_TIMEOUT: 'AI 解读生成超时，请稍后重试',
  ERR_PROFILE_MISMATCH: '档案信息异常，请刷新页面',
  ERR_ALREADY_UNLOCKED: '该内容已解锁，无需重复购买',
  ERR_PRICE_MISMATCH: '价格信息已更新，请重新确认',
  ERR_INVALID_SKU: '商品信息异常，请联系客服',
  ERR_RATE_LIMIT: '操作过于频繁，请稍后再试',
  ERR_UNAUTHORIZED: '登录已过期，请重新登录',
}
```

#### 8.3.2 IDOR 防护：profile_id 归属校验

所有涉及 `profile_id` 的后端 Service 层，**必须**在写入前执行归属校验：

```typescript
// backend/src/services/checkinService.ts
async function createCheckin(userId: string, profileId: string, data: CheckinData) {
  // ✅ 必须：校验 profile 归属，防止越权写入他人档案
  const profile = await db.query(
    'SELECT id FROM profiles WHERE id = $1 AND user_id = $2',
    [profileId, userId]
  )
  if (!profile.rows.length) {
    throw new AppError('ERR_PROFILE_MISMATCH', '档案信息异常')
  }

  // 通过校验后执行 UPSERT
  return db.query(`
    INSERT INTO daily_checkins (user_id, profile_id, checkin_date, accuracy_score, mood_tags, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, profile_id, checkin_date)
    DO UPDATE SET accuracy_score = EXCLUDED.accuracy_score,
                  mood_tags = EXCLUDED.mood_tags,
                  note = EXCLUDED.note,
                  updated_at = NOW()
    RETURNING *
  `, [userId, profileId, data.checkin_date, data.accuracy_score, data.mood_tags, data.note])
}
```

> **规则**：凡是 Controller 接收到 `profile_id`，Service 层第一行必须是归属校验，不得跳过。

---

### 8.4 前端防腐层设计

#### 8.4.1 Pinia Store：用户偏好状态管理

```
src/stores/userPreferencesStore.ts   [新建]
```

```typescript
// 替代原方案中的 provide/inject
export const useUserPreferencesStore = defineStore('userPreferences', () => {
  // 1. 初始化：优先读 localStorage，确保首屏不闪烁
  const geekMode = ref(localStorage.getItem('pref_geekMode') === 'true')
  const proMode = ref(localStorage.getItem('pref_proMode') === 'true')
  const sidebarCollapsed = ref(localStorage.getItem('pref_sidebarCollapsed') === 'true')

  // 2. 后台静默同步远端（不阻塞渲染）
  async function syncFromServer() {
    try {
      const res = await userApi.getPreferences()
      if (res.success && res.data) {
        geekMode.value = res.data.geekMode
        proMode.value = res.data.proMode
        sidebarCollapsed.value = res.data.sidebarCollapsed
        persistToLocal()
      }
    } catch { /* 静默失败，保持本地值 */ }
  }

  // 3. 写入时同步本地 + 后台异步持久化
  function setGeekMode(val: boolean) {
    geekMode.value = val
    persistToLocal()
    userApi.updatePreferences({ geekMode: val }).catch(() => {/* 静默失败 */})
  }

  function persistToLocal() {
    localStorage.setItem('pref_geekMode', String(geekMode.value))
    localStorage.setItem('pref_proMode', String(proMode.value))
    localStorage.setItem('pref_sidebarCollapsed', String(sidebarCollapsed.value))
  }

  return { geekMode, proMode, sidebarCollapsed, syncFromServer, setGeekMode }
})
```

#### 8.4.2 XSS 安全渲染：DOMPurify 强制净化

**原方案风险**：`TermHighlightRenderer.vue` 使用 `v-html` 渲染 AI 输出 + 高亮标签，若 AI 输出含恶意脚本，直接 XSS。

**修订方案**：

```typescript
// src/utils/termHighlighter.ts（修订版）
import DOMPurify from 'dompurify'

export function highlightAndSanitize(text: string): string {
  // Step 1: 先对原始文本净化（防止 AI 输出含 HTML）
  const cleanText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

  // Step 2: 在净化后的纯文本上执行高亮替换
  const sorted = [...ZIWEI_TERMS].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'g')
  const highlighted = cleanText.replace(
    pattern,
    '<mark class="term-highlight">$1</mark>'
  )

  // Step 3: 再次净化，仅允许 <mark> 标签通过
  return DOMPurify.sanitize(highlighted, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: ['class', 'data-explanation'],
  })
}
```

```vue
<!-- TermHighlightRenderer.vue -->
<template>
  <div v-html="safeHtml" class="term-renderer" :class="{ 'geek-mode': geekMode }" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { highlightAndSanitize } from '@/utils/termHighlighter'

const props = defineProps<{ text: string; geekMode?: boolean }>()
const safeHtml = computed(() => highlightAndSanitize(props.text))
</script>
```

> **依赖**：`npm install dompurify @types/dompurify`（~7KB gzipped，可接受）

#### 8.4.3 锚点导航竞争条件修复

```typescript
// FortunePlanning.vue（修订版 onMounted 逻辑）
const isDailyDataReady = computed(() =>
  !!displayLiudayInfo.value && !isDailyLoading.value
)

// 监听数据就绪后再执行锚点滚动
watch(isDailyDataReady, async (ready) => {
  if (!ready) return
  const anchor = route.query.anchor as string
  if (!anchor) return

  await nextTick()  // 等待 DOM 更新

  const el = document.getElementById(`${anchor}-section`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // 清除 query 参数，避免刷新后重复滚动
    router.replace({ query: { ...route.query, anchor: undefined } })
  }
}, { immediate: true })
```

**对应 DOM 结构**（各维度区域需加 id）：
```html
<!-- FortunePlanning.vue template -->
<section id="decade-section">  <!-- 大限 -->
<section id="yearly-section">  <!-- 流年 -->
<section id="monthly-section"> <!-- 流月 -->
<section id="daily-section">   <!-- 流日 ← 气象页跳转锚点 -->
```

---

### 8.5 最终实施路线图（重排版）

> 将后端基础设施前置，确保联调质量；YOY 同比推迟至 v2.1。

| 期次 | 范围 | 关键交付物 | 预估工时 |
|------|------|-----------|---------|
| **P0 - 基础设施** | 后端建表（加固版 DDL）+ 全局鉴权中间件 + 标准错误码规范 + 前端 Pinia store + DOMPurify 接入 | `daily_checkins`、`yearly_comparisons`、`user_preferences` 表；`useUserPreferencesStore`；`errorHandler.ts` | 2 天 |
| **P1 - 核心看板瘦身** | 前端重构 FortunePlanning.vue（3 个 composable）+ FloatingTOC + DecadeSidebar 响应式 + DailyHero + DailyYiJiCollapsible + 锚点竞争条件修复 | 组件树从 7→15 个；FortunePlanning.vue 瘦身至 ~800 行 | 3 天 |
| **P2 - 商业切割与融合** | `GET /api/pricing/quote` 询价接口 + 今日气象主 CTA 改造 + 天机解码弹窗内容切割 + TermHighlightRenderer（DOMPurify 版）+ 跳转路由 | 透明计费漏斗打通；内容边界清晰 | 2 天 |
| **P3 - 数据飞轮** | DailyCheckinModule UI + `POST /api/fortune/checkin` UPSERT 接口 + IDOR 校验 | 打卡数据开始收集 | 1-2 天 |
| **P4 - 极客体验** | GeekModeToggle（接入 Pinia）+ BoostRecommendation 预埋 + `PATCH /api/user/preferences` | Geek Mode 跨设备同步 | 1 天 |
| **P5 - 打磨优化** | DecadeOverview 雷达图放大 + 顶点数值 + DecadeYearTag + YearlyPlaybook 合并 | 因果链条可视化 | 1-2 天 |
| **v2.1 - YOY 同比** | `yearly_comparisons` 后端算法固化 + `GET /api/fortune/yearly-comparison` + YOYComparison.vue | 年度同比数据（依赖算法版本稳定） | 2 天（延后） |

**总计 v2.0 工时估算：10-12 天**

---

### 8.6 关于"后端 AI JSON 强校验"

建议的《AI JSON 响应强校验逻辑与 Fallback 兜底方案》**值得输出**，但属于独立的后端专项文档，建议在本文档确认后单独输出，内容应覆盖：

1. AI 响应 Schema 定义（Zod/Joi 校验）
2. 字段缺失/类型错误的 Fallback 填充策略
3. 流式输出（SSE）的异常中断处理
4. "幻觉格式"（如 AI 返回 Markdown 而非 JSON）的拦截与修复

---

> **以上方案是否符合预期？确认后我将开始分步生成代码。**

# 前端联调文档：时空导航决策看板 v2.0 API 对接指南

> **日期**: 2026-02-24  
> **后端状态**: ✅ 全部接口已开发并自测通过（15/15）  
> **适用范围**: 前端需要对接的 6 个新增 API 端点

---

## 一、新增接口概览

| 方法 | 路径 | 功能 | 鉴权 |
|------|------|------|------|
| `POST` | `/api/fortune/checkin` | 提交/更新今日复盘打卡 | ✅ Bearer Token |
| `GET` | `/api/fortune/checkin` | 查询打卡记录 + 连续天数 | ✅ Bearer Token |
| `GET` | `/api/fortune/yearly-comparison` | 年度同比数据 (YOY) | ✅ Bearer Token |
| `GET` | `/api/user/preferences` | 获取用户偏好设置 | ✅ Bearer Token |
| `PATCH` | `/api/user/preferences` | 更新用户偏好设置（局部合并） | ✅ Bearer Token |
| `GET` | `/api/pricing/quote` | 获取解锁报价（透明计费） | ✅ Bearer Token |

---

## 二、各接口详细对接说明

### 2.1 `POST /api/fortune/checkin` — DailyCheckinModule.vue 对接

**用途**: 替代分散在 yearly/monthly/daily 三处的"准/不准"按钮，聚合为 1-5 星评分 + 情绪标签。

**前端调用时机**: `DailyCheckinModule.vue` 中，用户选择星级/情绪标签后 debounce 500ms 调用。

**请求示例**:
```typescript
// src/api/fortuneApi.ts
export async function submitCheckin(data: {
  checkin_date: string      // YYYY-MM-DD
  profile_id: string        // UUID
  accuracy_score: number    // 1-5
  mood_tags?: Array<'satisfied' | 'anxious' | 'surprised' | 'calm' | 'excited' | 'frustrated'>
  note?: string             // ≤500字
  accurate_dimensions?: Array<'yearly' | 'monthly' | 'daily'>
}) {
  return request.post('/fortune/checkin', data)
}
```

**响应结构**:
```typescript
interface CheckinResponse {
  success: true
  data: {
    id: string             // 打卡记录 UUID
    checkin_date: string   // YYYY-MM-DD
    is_new: boolean        // true=首次打卡, false=更新
  }
  message: string
}
```

**注意事项**:
- `mood_tags` 只允许 6 个值: `satisfied | anxious | surprised | calm | excited | frustrated`
- 传入非白名单标签会返回 400
- 同一天重复提交为 UPSERT（更新），不会报错
- 建议前端实现**乐观更新**: 本地先更新 UI，再异步提交

---

### 2.2 `GET /api/fortune/checkin` — 查询打卡记录

**用途**: 获取打卡历史 + 连续打卡天数（streak），用于展示打卡日历和激励。

**请求示例**:
```typescript
export async function getCheckins(params: {
  profile_id: string
  date?: string              // YYYY-MM-DD, 默认今天
  range?: 'week' | 'month'   // 可选，返回区间内所有打卡
}) {
  return request.get('/fortune/checkin', { params })
}
```

**响应结构**:
```typescript
interface CheckinListResponse {
  success: true
  data: {
    checkins: Array<{
      id: string
      user_id: string
      profile_id: string
      checkin_date: string
      accuracy_score: number
      mood_tags: string[]
      note: string | null
      accurate_dimensions: string[]
      created_at: string
      updated_at: string
    }>
    streak: number            // 连续打卡天数
  }
}
```

---

### 2.3 `GET /api/fortune/yearly-comparison` — YOYComparison.vue 对接

**用途**: 在 `YOYComparison.vue` 中展示三维度 delta 箭头 + 一句话结论。

**请求示例**:
```typescript
// src/composables/useYOYComparison.ts
export async function fetchYOYComparison(profileId: string, year: number) {
  return request.get('/fortune/yearly-comparison', {
    params: { profile_id: profileId, year }
  })
}
```

**响应结构**:
```typescript
interface YOYResponse {
  success: true
  data: {
    current_year: number        // 2026
    previous_year: number       // 2025
    career_delta: number        // -100 ~ +100
    wealth_delta: number        // -100 ~ +100
    love_delta: number          // -100 ~ +100
    summary: string             // "首年使用，暂无同比数据" 或 AI 结论
    decade_year_tag: string | null  // 'key_sprint' | 'defense' | 'transition' | 'harvest' | 'dormant' | null
    is_cached: boolean          // 是否从缓存返回
  }
}
```

**前端展示建议**:
- `decade_year_tag` 为 null 时（无去年数据），隐藏 delta 箭头，仅显示 summary
- delta > 0 时显示 ↑ 绿色箭头，< 0 时显示 ↓ 红色箭头，= 0 时显示 → 灰色

---

### 2.4 `GET/PATCH /api/user/preferences` — useUserPreferencesStore 对接

**用途**: Pinia store 跨设备同步用户偏好（Geek Mode、侧栏折叠等）。

**GET 响应**:
```typescript
interface PreferencesResponse {
  success: true
  data: {
    geekMode: boolean        // 默认 false
    proMode: boolean         // 默认 false
    sidebarCollapsed: boolean // 默认 false
  }
}
```

**PATCH 请求** (局部更新):
```typescript
// 只传需要更新的字段
await request.patch('/user/preferences', { geekMode: true })
```

⚠️ **重要**: PATCH 接口使用 **strict 模式**，传入 `geekMode | proMode | sidebarCollapsed` 以外的字段会返回 400。

**前端集成模式** (建议):
```typescript
// useUserPreferencesStore.ts
// 1. 初始化: 优先读 localStorage → 不阻塞渲染
// 2. onMounted: 调用 GET /api/user/preferences 静默同步
// 3. 写入时: 本地 localStorage 立即更新 + PATCH 异步持久化
```

---

### 2.5 `GET /api/pricing/quote` — UnlockButton.vue 对接

**用途**: 用户点击解锁前先询价，展示实际价格和折扣信息。

**请求示例**:
```typescript
// 点击 UnlockButton 时先询价
const quote = await request.get('/pricing/quote', {
  params: { sku: 'fortune_daily', date: '2026-02-24' }
})

// 根据返回更新按钮文案
if (quote.data.discount_reason) {
  buttonText = `特惠解锁 · ${quote.data.actual_price} 币`
} else {
  buttonText = `解锁 · ${quote.data.original_price} 币`
}
```

**有效 SKU 值**: `fortune_daily | fortune_monthly | fortune_yearly | weather_decode`

**响应结构**:
```typescript
interface QuoteResponse {
  success: true
  data: {
    sku: string
    original_price: number     // 原价
    actual_price: number       // 实际价格（可能有折扣）
    discount_reason: string | null   // 'BUNDLE_WEATHER_DECODE' 或 null
    discount_label: string | null    // "今日已解锁天机解码，享捆绑优惠"
  }
}
```

**折扣逻辑**: 当天已解锁天机解码（`weather_decode`）后，`fortune_daily` 半价（10→5）。

---

## 三、错误处理约定

所有接口错误响应格式统一:
```typescript
interface ErrorResponse {
  success: false
  error: string     // 错误类型标识
  message?: string  // 用户可见的中文提示
}
```

| HTTP 状态码 | 错误场景 | 前端处理建议 |
|------------|---------|------------|
| 400 | Zod 校验失败 / profile_id 归属异常 | 显示 `message` 给用户 |
| 401 | Token 过期或缺失 | 触发现有刷新 Token 机制 |
| 500 | 服务器内部错误 | Toast "服务暂时不可用，请稍后重试" |

---

## 四、迁移注意事项

1. **旧版反馈接口** `POST /api/fortune/feedback` **保留不动**，前端逐步从旧版迁移到 `POST /api/fortune/checkin`
2. 偏好设置建议采用 **localStorage 优先 + 后台静默同步** 模式，避免首屏闪烁
3. 询价接口应在用户点击解锁按钮**之前**调用，将返回的 `actual_price` 展示在按钮文案中

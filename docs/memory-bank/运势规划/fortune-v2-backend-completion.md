# 时空导航决策看板 v2.0 — 后端开发完成报告

> **日期**: 2026-02-24  
> **状态**: ✅ 后端接口开发与自测已完成  
> **自测结果**: 15/15 测试用例全部通过

---

## 一、数据库变更

### 新增 3 张表

| 表名 | 说明 | 迁移脚本 |
|------|------|----------|
| `daily_checkins` | 今日复盘打卡（替代散落的准/不准按钮） | `scripts/migration-create-fortune-v2-tables.sql` |
| `yearly_comparisons` | 年度同比缓存（YOY 对比数据 + 大限-流年标签） | 同上 |
| `user_preferences` | 用户偏好设置（Geek Mode / 侧栏折叠等，JSONB） | 同上 |

### 关键约束

- `daily_checkins`: UNIQUE(user_id, profile_id, checkin_date) — 每人每天每档案一条
- `daily_checkins.mood_tags`: JSONB 白名单约束，仅允许 `satisfied/anxious/surprised/calm/excited/frustrated`
- `daily_checkins.accuracy_score`: 1-5 范围 CHECK
- `yearly_comparisons`: UNIQUE(user_id, profile_id, current_year) + `algo_version` 版本控制
- `user_preferences`: UNIQUE(user_id)

---

## 二、新增 API 接口清单

所有接口均需 `Authorization: Bearer <token>` 鉴权。

### 2.1 今日复盘打卡

#### `POST /api/fortune/checkin`

提交或更新打卡（幂等 UPSERT）。

**Request Body:**
```json
{
  "checkin_date": "2026-02-24",
  "profile_id": "uuid-string",
  "accuracy_score": 4,
  "mood_tags": ["satisfied", "calm"],
  "note": "今日感觉运势不错",
  "accurate_dimensions": ["daily"],
  "checkin_tz": "Asia/Shanghai"
}
```

| 字段 | 类型 | 必填 | 校验 |
|------|------|------|------|
| `checkin_date` | string | ✅ | YYYY-MM-DD 格式 |
| `profile_id` | string | ✅ | UUID 格式 + IDOR 归属校验 |
| `accuracy_score` | number | ✅ | 1-5 整数 |
| `mood_tags` | string[] | ❌ | 白名单枚举 |
| `note` | string | ❌ | ≤500字 |
| `accurate_dimensions` | string[] | ❌ | `yearly/monthly/daily` |
| `checkin_tz` | string | ❌ | 默认 `Asia/Shanghai` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "checkin_date": "2026-02-24",
    "is_new": true
  },
  "message": "打卡成功"
}
```

#### `GET /api/fortune/checkin`

**Query Params:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile_id` | string | ✅ | UUID |
| `date` | string | ❌ | YYYY-MM-DD，默认今天 |
| `range` | string | ❌ | `week` 或 `month` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "checkins": [{ ... }],
    "streak": 3
  }
}
```

---

### 2.2 年度同比 (YOY)

#### `GET /api/fortune/yearly-comparison`

**Query Params:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `profile_id` | string | ✅ | UUID |
| `year` | number | ✅ | 年份，如 2026 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "current_year": 2026,
    "previous_year": 2025,
    "career_delta": 0,
    "wealth_delta": 0,
    "love_delta": 0,
    "summary": "首年使用，暂无同比数据",
    "decade_year_tag": null,
    "is_cached": false
  }
}
```

**`decade_year_tag` 枚举值:** `key_sprint | defense | transition | harvest | dormant | null`

---

### 2.3 用户偏好设置

#### `GET /api/user/preferences`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "geekMode": false,
    "proMode": false,
    "sidebarCollapsed": false
  }
}
```

#### `PATCH /api/user/preferences`

**Request Body (局部更新，strict 模式):**
```json
{
  "geekMode": true,
  "sidebarCollapsed": true
}
```

⚠️ 不允许传入未知字段（strict 校验），否则返回 400。

**Response 200:**
```json
{
  "success": true,
  "data": { "updated": true },
  "message": "偏好设置已更新"
}
```

---

### 2.4 询价 (Pricing Quote)

#### `GET /api/pricing/quote`

**Query Params:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sku` | string | ✅ | 商品标识，如 `fortune_daily` |
| `date` | string | ✅ | YYYY-MM-DD |

**有效 SKU:** `fortune_daily | fortune_monthly | fortune_yearly | weather_decode`

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

---

## 三、新增文件清单

### 后端源码

| 文件 | 层 | 说明 |
|------|---|------|
| `src/types/fortune-v2.ts` | 类型 | Zod Schema + 类型定义 + 错误码 |
| `src/services/dailyCheckin.service.ts` | Service | 打卡 UPSERT / 查询 / 连续天数计算 |
| `src/services/yearlyComparison.service.ts` | Service | YOY 计算 / 缓存读写 |
| `src/services/userPreferences.service.ts` | Service | 偏好读取 / UPSERT |
| `src/services/pricingQuote.service.ts` | Service | 询价 / 捆绑折扣逻辑 |
| `src/controllers/fortuneV2.controller.ts` | Controller | 打卡 + YOY + 询价控制器 |
| `src/controllers/userPreferences.controller.ts` | Controller | 偏好 GET/PATCH |
| `src/routes/pricing.routes.ts` | Route | 询价路由 |

### 修改的文件

| 文件 | 变更 |
|------|------|
| `src/routes/fortune.routes.ts` | 新增 checkin/yearly-comparison 路由 |
| `src/routes/user.routes.ts` | 新增 preferences GET/PATCH 路由 |
| `src/app.ts` | 注册 fortune/pricing 路由 + 修复之前未注册的 6 个路由模块 |

### 数据库

| 文件 | 说明 |
|------|------|
| `scripts/migration-create-fortune-v2-tables.sql` | 3 表 DDL + 索引 + 约束 |

### 测试

| 文件 | 说明 |
|------|------|
| `scripts/temp-test.ts` | 15 个测试用例的自动化验证脚本 |

---

## 四、安全措施

- **Zod 防御性校验**：所有请求体和查询参数均通过 Zod Schema 校验，拒绝非法输入
- **IDOR 防护**：所有涉及 `profile_id` 的 Service 层首先校验归属（self profile 快捷路径 + profiles_archives 表查询）
- **UPSERT 幂等**：打卡和偏好使用 `ON CONFLICT ... DO UPDATE`，避免并发冲突
- **Mood Tags 白名单**：数据库层 + 应用层双重校验
- **Strict 模式**：偏好更新接口拒绝未知字段

---

## 五、附录：修复的遗留问题

在 `app.ts` 中发现以下 6 个路由模块已导入但**从未注册**，本次一并修复：

- `celestialResonanceRoutes` → `/api/celestial-resonance`
- `divinationRoutes` → `/api/divination`
- `tarotRoutes` → `/api/tarot`
- `achievementsRoutes` → `/api/achievements`
- `insightsRoutes` → `/api/insights`
- `fortuneRoutes` → `/api/fortune`

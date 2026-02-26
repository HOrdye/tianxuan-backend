# 前端修复文档：/api/astrology/time-assets/unlock 400（无法解锁流年/流月/流日）

本文档用于指导前端修复解锁接口 `POST /api/astrology/time-assets/unlock` 的 400 问题。

## 1. 现象
控制台报错：
- `POST /api/astrology/time-assets/unlock 400 (Bad Request)`
- 后端返回：

```json
{
  "success": false,
  "error": "参数错误",
  "message": "维度、时间段、类型和过期时间必须提供"
}
```

## 2. 根因
前端当前请求体使用 **camelCase** 字段（如 `periodStart`），但后端 Controller 仅读取 **snake_case** 字段（如 `period_start`）。

因此后端拿到的必填字段为 `undefined`，触发参数校验直接 400。

## 3. 后端接口契约（必须严格遵守）

### 3.1 请求
- **Method**：`POST`
- **Path**：`/api/astrology/time-assets/unlock`
- **Auth**：`Authorization: Bearer <token>`

### 3.2 Request Body（snake_case）
必须传以下字段（注意字段名与枚举值）：

```json
{
  "dimension": "yearly",
  "period_start": "2026-01-01",
  "period_end": "2026-12-31",
  "period_type": "year",
  "expires_at": "2026-12-31T15:59:59.999Z",
  "cost_coins": 10,
  "profile_id": "<uuid>"
}
```

### 3.3 字段说明与枚举约束
- `dimension`：必须是以下之一
  - `daily`
  - `monthly`
  - `yearly`

- `period_type`：必须是以下之一
  - `day`
  - `month`
  - `year`

- `period_start` / `period_end`：格式必须是 `YYYY-MM-DD`

- `expires_at`：ISO 时间戳字符串（可用 `new Date().toISOString()` 或业务指定时间）

- `cost_coins`：可选；不传则后端默认 10，但建议明确传入

- `profile_id`：当前版本后端会用登录用户的 `userId` 作为 profile_id（内部假设 profiles.id == auth.users.id）。
  - **为兼容前端现有逻辑**，建议仍然在请求体中携带 `profile_id`（值为当前选择的 profile uuid）。
  - 若你们前端存在“多档案 profileId != userId”的情况，需要后端进一步调整；请先把前端请求按本节修正确保通过参数校验。

## 4. 前端改动建议（从 camelCase 改为 snake_case）

### 4.1 字段名映射表
把旧字段改为新字段：
- `profileId` -> `profile_id`
- `periodStart` -> `period_start`
- `periodEnd` -> `period_end`
- `periodType` -> `period_type`
- `expiresAt` -> `expires_at`
- `costCoins` -> `cost_coins`

`dimension` 字段不要改名，但要保证值为 `daily|monthly|yearly`。

### 4.2 维度/时间段计算建议
- **解锁流年**：
  - `dimension`: `yearly`
  - `period_type`: `year`
  - `period_start`: `${year}-01-01`
  - `period_end`: `${year}-12-31`

- **解锁流月**：
  - `dimension`: `monthly`
  - `period_type`: `month`
  - `period_start`: `${year}-${month}-01`（注意补零）
  - `period_end`: 当月最后一天（前端计算或用 date lib）

- **解锁流日**：
  - `dimension`: `daily`
  - `period_type`: `day`
  - `period_start`: `YYYY-MM-DD`
  - `period_end`: `YYYY-MM-DD`（同一天）

### 4.3 最小示例（仅展示 payload）

#### 解锁流年（2026）
```ts
const payload = {
  profile_id: profileId,
  dimension: 'yearly',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  period_type: 'year',
  expires_at: '2026-12-31T15:59:59.999Z',
  cost_coins: 10,
};
```

#### 解锁流月（2026-02）
```ts
const payload = {
  profile_id: profileId,
  dimension: 'monthly',
  period_start: '2026-02-01',
  period_end: '2026-02-28',
  period_type: 'month',
  expires_at: '2026-12-31T15:59:59.999Z',
  cost_coins: 10,
};
```

#### 解锁流日（2026-02-26）
```ts
const payload = {
  profile_id: profileId,
  dimension: 'daily',
  period_start: '2026-02-26',
  period_end: '2026-02-26',
  period_type: 'day',
  expires_at: '2026-12-31T15:59:59.999Z',
  cost_coins: 10,
};
```

## 5. 验证方式
修复后，前端应满足：
- `POST /api/astrology/time-assets/unlock` 返回 200
- 响应格式：

```json
{
  "success": true,
  "message": "时空资产解锁成功",
  "data": {
    "asset_id": "uuid",
    "remaining_balance": 100
  }
}
```

若仍出现 400，请重点检查：
- `dimension` 是否误传为 `year/month/day`（错误）而非 `yearly/monthly/daily`（正确）
- `period_type` 是否误传为 `yearly/monthly/daily`（错误）而非 `year/month/day`（正确）
- `period_start` / `period_end` 格式是否为 `YYYY-MM-DD`

## 6. 备注（后端实现位置，便于联调）
- Route：`src/routes/astrology.routes.ts` -> `router.post('/time-assets/unlock', ...)`
- Controller：`src/controllers/astrology.controller.ts` -> `unlockTimeAsset`
- Service：`src/services/astrology.service.ts` -> `unlockTimeAsset`

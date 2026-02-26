# 前端修复文档：运势规划 profile_id 幽灵 ID 问题

## 问题现象

打开紫微斗数-运势规划页面时，以下两个 API 请求返回 400：
- `GET /api/fortune/checkin?profile_id=1717e73...3c60639`
- `GET /api/fortune/yearly-comparison?profile_id=1717e73...3c60639`
- `POST /api/fortune/checkin`（请求体含同一 `profile_id`）

错误信息：`档案信息异常，profile_id 不属于当前用户`

## 根因分析

**前端传入的 `profile_id`（`1717e73...3c60639`）在数据库的所有相关表中均不存在**：

| 表名 | 查询结果 |
|---|---|
| `public.profiles` | 0 行 |
| `public.profiles_archives` | 0 行 |
| `public.ziwei_chart_archives` | 0 行 |
| `public.star_charts` | 0 行 |

后端 IDOR 校验是正确的——这个 ID 本身就是无效的。

**根本原因**：前端 `LocalFirstService`（见截图控制台日志 `[Local-First]`）从本地缓存（IndexedDB / localStorage）中读取了一个已过期/已删除的命盘 `profile_id`，并将其传给了运势规划相关接口。该 ID 对应的数据库记录已不存在（可能是该档案被删除、或该用户账号重新注册、或迁移后数据丢失）。

## 数据库实际状态（2026-02-24）

当前数据库有效的 `ziwei_chart_archives` 记录（部分）：

| id（前8位） | user_id（前8位） | relationship_type |
|---|---|---|
| `9d5ce31d` | `cdf77d67` | self |
| `8951693e` | `635510f7` | self |
| `a6d691fe` | `635510f7` | friend |

## 接口契约（后端期望）

```
GET /api/fortune/checkin?profile_id=<UUID>
GET /api/fortune/yearly-comparison?profile_id=<UUID>&year=<YYYY>
POST /api/fortune/checkin  Body: { profile_id: "<UUID>", ... }
```

`profile_id` 必须满足以下三者之一：
1. 等于当前登录用户的 `userId`（`profiles.id`）
2. 存在于 `profiles_archives` 表且 `user_id` = 当前用户
3. 存在于 `ziwei_chart_archives` 表且 `user_id` = 当前用户

## 修复建议

### 修复位置：`DailyCheckinModule.vue` 及运势规划相关 Store

**问题行为**：`loadTodayCheckin`（约第 189 行）和 `handleSubmit`（约第 216 行）直接从 `LocalFirstService` / 本地缓存读取 `profile_id`，未做有效性验证。

### 建议修复步骤

#### 1. 在使用 `profile_id` 前，优先从服务端获取最新的有效 profile

在 `DailyCheckinModule.vue` 的 `loadTodayCheckin` 函数中，**不能**直接使用缓存的 `profile_id`，应先调用 `/api/user/profile` 或 `/api/astrology/archives` 确认当前用户有效的命盘列表，再取其中的 `id`。

#### 2. 清除无效本地缓存

在 `LocalFirstService` 中增加缓存失效逻辑：当后端返回 `ERR_PROFILE_MISMATCH`（HTTP 400，message 含"profile_id 不属于当前用户"）时，应：
- 清除本地缓存中对应的 `profile_id`
- 重新从服务端获取有效的 profile/archive 列表
- 用新的有效 `id` 重试请求

```ts
// 伪代码示例（在 request.ts 拦截器或 DailyCheckinModule.vue 的 catch 块中）
if (error.response?.data?.message?.includes('profile_id 不属于当前用户')) {
  // 清除本地 profile 缓存
  localFirstService.clearProfileCache();
  // 重新获取有效 profile
  const validProfile = await fetchActiveProfile(); // 调用 /api/astrology/archives
  if (validProfile) {
    store.setActiveProfileId(validProfile.id);
    // 重试
  }
}
```

#### 3. 运势规划页面初始化时验证 profile_id

在运势规划页面（`fortune-planning` 路由）的 `onMounted` 或 `setup` 阶段，增加 profile 有效性检查：

```ts
// 在加载运势数据前，先验证当前 activeProfileId 是否仍有效
const archives = await api.get('/astrology/archives');
const validIds = archives.data.map(a => a.id);
if (!validIds.includes(store.activeProfileId)) {
  // 重置为第一个有效 archive，或提示用户重新选择
  store.activeProfileId = validIds[0] ?? null;
}
```

#### 4. `LocalFirstService` 缓存 key 设计建议

本地缓存的 profile 数据应加入版本号或 TTL，避免长期持有已删除的 ID：
```ts
// 建议缓存时附带 expires_at，默认 1 天
localCache.set('activeProfileId', { id, expires_at: Date.now() + 86400_000 });
```

## 总结

**后端代码无需修改**（后端 IDOR 校验逻辑正确）。问题完全在前端本地缓存持有了一个数据库中已不存在的 `profile_id`。请前端团队按上述建议修复 `DailyCheckinModule.vue` 及 `LocalFirstService` 的缓存失效逻辑。

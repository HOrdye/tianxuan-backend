# 后端API实现需求清单

## ⚠️ 重要说明

**当前状态**：前端代码已修改为调用后端API，但以下API端点需要后端实现。

**迁移原则**：前后端分离开发，前端已准备好API调用接口，等待后端实现对应端点。

**修正说明**：
- ✅ 信息补充奖励：已修正为使用现有 `coinsApi.grantCoins()`，无需新建API
- ✅ 扣费日志查询：已修正为使用现有 `paymentApi.getQuotaLogs()`，无需新建API
- ✅ 退款操作：已修正为使用现有 `coinsApi.refundCoins()`
- ✅ 用户交易记录：已修正为使用现有 `paymentApi.getOrders()`，删除重复的 `getUserTransactions()`
- ✅ 档案数量查询：已修正为使用现有 `userApi.getArchives().length`，删除重复的 `getArchivesCount()`

详见 `docs/迁移修正说明.md` 和 `docs/API重复检查报告.md`

---

## 🔴 P0 - 必须实现（核心功能）

### 1. 成就系统 API
**路径**: `/api/achievements/*`

- [ ] `GET /api/achievements/check?type=xxx` - 检查用户是否拥有指定类型的成就
  - 请求参数：`type` (string) - 成就类型，如 `shared_unlock_profile_slot`
  - 响应：`{ success: boolean, data: { exists: boolean, achievementId?: string, metadata?: any } }`

- [ ] `GET /api/achievements` - 获取用户的所有成就
  - 响应：`{ success: boolean, data: Array<{ id, type, metadata, createdAt }> }`

**前端调用位置**：
- `src/features/ziwei/services/profileLimitService.ts` - 检查分享解锁状态

---

### 2. 信息补充奖励（已修正）
**状态**: ✅ 使用现有API `coinsApi.grantCoins()`

**说明**：
- 信息补充奖励应使用 `POST /api/coins/grant`（已存在）
- 不需要新建 `/api/rewards/*` API
- 前端已修正为使用 `coinsApi.grantCoins({ amount, source: 'activity', reason })`

**前端调用位置**：
- `src/services/profileInfoRewardService.ts` - 已修正为使用 `coinsApi.grantCoins()`

**待实现**：
- [ ] 检查是否已领取奖励的API（可选，当前前端暂时允许重复领取，后端应做幂等性检查）

---

### 3. 收藏洞察 API
**路径**: `/api/insights/saved/*`

- [ ] `POST /api/insights/saved` - 保存收藏
  - 请求体：`{ type: string, content: string, chartId?: string, sessionId?: string, metadata?: any }`
  - 响应：`{ success: boolean, data: SavedInsight }`

- [ ] `GET /api/insights/saved` - 获取收藏列表
  - 请求参数：`type?`, `search?`, `limit?`, `offset?`
  - 响应：`{ success: boolean, data: SavedInsight[] }`

- [ ] `DELETE /api/insights/saved/:id` - 删除收藏
  - 响应：`{ success: boolean }`

- [ ] `DELETE /api/insights/saved/batch` - 批量删除收藏
  - 请求体：`{ insightIds: string[] }`
  - 响应：`{ success: boolean }`

- [ ] `GET /api/insights/saved/stats` - 统计收藏数量
  - 响应：`{ success: boolean, data: { totalCount: number } }`

- [ ] `GET /api/insights/saved/check` - 检查是否已收藏
  - 请求参数：`sessionId?`, `chartId?`
  - 响应：`{ success: boolean, data: { isSaved: boolean } }`

**前端调用位置**：
- `src/services/user/SavedInsightsService.ts` - 收藏洞察服务

---

### 4. 扣费日志查询（已修正）
**状态**: ✅ 使用现有API `paymentApi.getQuotaLogs()`

**说明**：
- 扣费日志查询应使用 `GET /api/payment/quota-logs`（已存在）
- 不需要新建 `/api/quota-logs` API
- 前端已修正为使用 `paymentApi.getQuotaLogs()`

**前端调用位置**：
- `src/features/ziwei/components/InsightStream.vue` - 已修正为使用 `paymentApi.getQuotaLogs()` 和 `coinsApi.refundCoins()`

---

### 5. 用户服务扩展 API
**路径**: `/api/users/*` 和 `/api/user/*`

- [ ] `GET /api/user/archives/count` - 获取档案数量
  - 响应：`{ success: boolean, data: { count: number } }`

- [ ] `POST /api/users/batch-tiers` - 批量查询用户等级
  - 请求体：`{ userIds: string[] }`
  - 响应：`{ success: boolean, data: Record<string, string> }` - userId -> tier映射

- [ ] `GET /api/users/:id/exists` - 检查用户是否存在
  - 响应：`{ success: boolean, data: { exists: boolean } }`

- [ ] `DELETE /api/users/:id` - 删除用户账户
  - 响应：`{ success: boolean, message?: string }`
  - 注意：需要原子性删除所有相关数据（包括Auth账号）

**前端调用位置**：
- `src/services/user/UserService.ts` - 用户服务
- `src/services/account/AccountDeletionService.ts` - 账户删除服务

**修正说明**：
- `getArchivesCount()` 已删除，改用 `getArchives().length` 获取数量
- `src/features/ziwei/services/profileLimitService.ts` - 已修正为使用 `getArchives().length`

---

### 6. 支付服务扩展 API（已修正）
**状态**: ✅ 已修正为使用现有API `paymentApi.getOrders()`

**说明**：
- 查询用户交易记录应使用 `GET /api/payment/orders?status=pending,processing`（已存在）
- 不需要新建 `/api/users/:userId/transactions` API
- 前端已修正为使用 `paymentApi.getOrders({ status: 'pending,processing' })`

**前端调用位置**：
- `src/services/account/AccountDeletionService.ts` - 已修正为使用 `getOrders()`

---

### 7. 认证服务扩展 API
**路径**: `/api/auth/*`

- [ ] `POST /api/auth/merge-guest-data` - 合并游客数据
  - 请求体：`{ profileId?: string, chartId?: string, sessionIds?: string[] }`
  - 响应：`{ success: boolean, data: { merged: { charts: number, insights: number, profiles: number } } }`
  - 业务逻辑：将游客产生的数据（命盘、解读结果、档案）合并到正式用户账号下

**前端调用位置**：
- `src/services/auth/GuestMergeService.ts` - 游客数据合并服务

---

### 8. 管理员商品管理 API
**路径**: `/api/admin/coin-packs/*`

**⚠️ 需要确认**：
- `paymentApi.getPacks()` 已存在，用于普通用户获取可用充值包（只读）
- `adminApi.getCoinPacks()` 等是用于管理员CRUD操作（创建、更新、删除）
- **需要确认后端是否已有管理员商品管理API**

**如果后端已有管理员商品管理API**：
- 前端已创建 `adminApi.getCoinPacks()`, `createCoinPack()`, `updateCoinPack()`, `deleteCoinPack()`
- 只需确认路径和参数格式是否匹配

**如果后端没有管理员商品管理API**：
- [ ] `GET /api/admin/coin-packs` - 获取商品列表（管理员用，包含所有商品，包括未激活的）
  - 响应：`{ success: boolean, data: CoinPack[] }`
  - 需要按 `sort_order` 排序

- [ ] `POST /api/admin/coin-packs` - 创建商品
  - 请求体：`{ pack_type, name, subtitle?, price, coins, description?, is_limited?, limit_count?, is_active?, sort_order }`
  - 响应：`{ success: boolean, data: CoinPack }`

- [ ] `PUT /api/admin/coin-packs/:id` - 更新商品
  - 请求体：同创建，所有字段可选
  - 响应：`{ success: boolean, data: CoinPack }`

- [ ] `DELETE /api/admin/coin-packs/:id` - 删除商品
  - 响应：`{ success: boolean }`

**前端调用位置**：
- `src/views/admin/ProductManagement.vue` - 管理员商品管理页面（当前仍使用Supabase）

---

### 9. 紫微斗数时空解锁 API（扩展）
**路径**: `/api/astrology/time-assets/unlock`

- [x] `POST /api/astrology/time-assets/unlock` - 解锁时空资产
  - ✅ 已存在，但需要确认参数格式是否匹配
  - 当前前端期望参数：`{ profileId?, dimension, periodStart, periodEnd, periodType, expiresAt, costCoins? }`
  - 需要确认后端是否支持这些参数

**前端调用位置**：
- `src/features/ziwei/services/timeSpaceUnlockService.ts` - 时空解锁服务

---

## 📋 实现检查清单

### 数据库表确认
- [ ] `user_achievements` - 用户成就表
- [ ] `saved_insights` - 收藏洞察表
- [ ] `quota_logs` - 配额日志表
- [ ] `coin_packs` - 充值包表
- [ ] `unlocked_time_assets` - 解锁时空资产表

### 权限检查
- [ ] 所有管理员API需要管理员权限检查
- [ ] 用户相关API需要用户认证
- [ ] 确保用户只能操作自己的数据

### 错误处理
- [ ] 统一的错误响应格式：`{ success: false, message: string, error?: string }`
- [ ] 适当的HTTP状态码（400, 401, 403, 404, 500）

---

## 🚨 注意事项

1. **前后端分离**：前端已准备好所有API调用接口，等待后端实现
2. **类型定义**：前端类型定义在 `src/types/api.d.ts`，后端响应格式需保持一致
3. **测试验证**：后端实现后，前端代码会自动调用，无需修改前端代码
4. **优先级**：P0优先级的功能必须实现，否则相关功能无法使用

---

## 📝 前端API模块位置

- `src/api/modules/achievements.ts` - 成就系统API
- `src/api/modules/rewards.ts` - 奖励系统API
- `src/api/modules/insights.ts` - 收藏洞察API
- `src/api/modules/quota.ts` - 配额日志API
- `src/api/modules/user.ts` - 用户API（已扩展）
- `src/api/modules/admin.ts` - 管理员API（已扩展）
- `src/api/modules/auth.ts` - 认证API（已扩展）
- `src/api/modules/payment.ts` - 支付API（已扩展）
- `src/api/modules/astrology.ts` - 紫微斗数API（已扩展）

# 余额设置 API 说明

## 📋 概述

为了解决后台修改余额时只修改了储值余额，导致前端显示总余额（储值余额 + 赠送余额）不正确的问题，新增了**设置余额**接口。

## 🔌 API 接口

### 设置用户天机币余额

**接口**: `PUT /api/admin/users/:userId/coins/set`

**认证**: 需要管理员权限

**请求参数**:

```typescript
{
  tianjiCoinsBalance: number;      // 储值余额（必填，非负数）
  dailyCoinsGrant?: number;         // 每日赠送余额（可选，非负数）
  activityCoinsGrant?: number;      // 活动赠送余额（可选，非负数）
  clearGrants?: boolean;            // 是否清零赠送余额（可选，默认 false）
  reason?: string;                   // 设置原因（可选，默认 '管理员设置余额'）
}
```

**参数说明**:

- `tianjiCoinsBalance` (或 `tianji_coins_balance`): 储值余额，必填，必须是非负数
- `dailyCoinsGrant` (或 `daily_coins_grant`): 每日赠送余额，可选。如果不提供且 `clearGrants` 为 false，则保持原值
- `activityCoinsGrant` (或 `activity_coins_grant`): 活动赠送余额，可选。如果不提供且 `clearGrants` 为 false，则保持原值
- `clearGrants` (或 `clear_grants`): 是否清零赠送余额，可选，默认 false。如果为 true，会忽略 `dailyCoinsGrant` 和 `activityCoinsGrant` 参数，直接清零所有赠送余额
- `reason`: 设置原因，可选，默认 '管理员设置余额'

**响应格式**:

```typescript
{
  success: true,
  message: string,              // 设置结果消息
  data: {
    new_balance: number,        // 新的储值余额
    transaction_id: string      // 交易流水ID
  }
}
```

## 📝 使用示例

### 示例1：只设置储值余额，保留赠送余额

```bash
PUT /api/admin/users/635510f7-b66d-4f9e-8e47-22b9114a7280/coins/set
Headers: Authorization: Bearer <admin_token>
Body: {
  "tianjiCoinsBalance": 1000
}
```

**结果**: 储值余额设置为 1000，赠送余额保持不变

### 示例2：设置储值余额并清零所有赠送余额（推荐）

```bash
PUT /api/admin/users/635510f7-b66d-4f9e-8e47-22b9114a7280/coins/set
Headers: Authorization: Bearer <admin_token>
Body: {
  "tianjiCoinsBalance": 1000,
  "clearGrants": true
}
```

**结果**: 储值余额设置为 1000，所有赠送余额清零（总余额 = 1000）

### 示例3：设置所有余额字段

```bash
PUT /api/admin/users/635510f7-b66d-4f9e-8e47-22b9114a7280/coins/set
Headers: Authorization: Bearer <admin_token>
Body: {
  "tianjiCoinsBalance": 1000,
  "dailyCoinsGrant": 0,
  "activityCoinsGrant": 0
}
```

**结果**: 储值余额设置为 1000，每日赠送余额设置为 0，活动赠送余额设置为 0

## 🔄 与调整余额接口的区别

### 调整余额接口 (`PUT /api/admin/users/:userId/coins`)

- **功能**: 在现有余额基础上增加或减少
- **参数**: `adjustmentAmount`（调整金额，正数为增加，负数为减少）
- **使用场景**: 需要增加或减少余额时使用

**示例**:
```bash
PUT /api/admin/users/:userId/coins
Body: {
  "adjustmentAmount": 100  // 增加 100 天机币
}
```

### 设置余额接口 (`PUT /api/admin/users/:userId/coins/set`)

- **功能**: 直接设置余额为指定值
- **参数**: `tianjiCoinsBalance`（要设置的余额值）
- **使用场景**: 需要将余额设置为特定值时使用（如后台修改余额）

**示例**:
```bash
PUT /api/admin/users/:userId/coins/set
Body: {
  "tianjiCoinsBalance": 1000,  // 直接设置为 1000
  "clearGrants": true           // 清零赠送余额
}
```

## ⚠️ 注意事项

1. **总余额计算**: 前端显示的总余额 = `tianjiCoinsBalance + dailyCoinsGrant + activityCoinsGrant`
2. **清零赠送余额**: 如果希望前端显示的总余额等于设置的储值余额，建议设置 `clearGrants: true`
3. **参数兼容**: 接口同时支持 `camelCase` 和 `snake_case` 两种参数命名方式
4. **事务安全**: 所有操作都在事务中执行，确保数据一致性
5. **交易流水**: 每次设置都会记录交易流水，便于追溯

## 🐛 问题排查

### 问题：设置余额后，前端显示的总余额不正确

**原因**: 只设置了储值余额，没有清零赠送余额

**解决方案**: 使用 `clearGrants: true` 参数清零赠送余额

```bash
PUT /api/admin/users/:userId/coins/set
Body: {
  "tianjiCoinsBalance": 1000,
  "clearGrants": true
}
```

### 问题：设置余额后，前端显示的总余额 = 设置的余额 + 449

**原因**: 赠送余额（`dailyCoinsGrant` 或 `activityCoinsGrant`）还有值（449）

**解决方案**: 
1. 使用 `clearGrants: true` 清零赠送余额
2. 或者同时设置 `dailyCoinsGrant: 0` 和 `activityCoinsGrant: 0`

## 📚 相关文件

- `src/services/coins.service.ts` - 余额设置服务实现
- `src/services/admin.service.ts` - 管理员服务包装
- `src/controllers/admin.controller.ts` - 管理员控制器
- `src/routes/admin.routes.ts` - 管理员路由配置

## 🔗 相关接口

- `PUT /api/admin/users/:userId/coins` - 调整余额接口
- `GET /api/coins/balance` - 查询余额接口
- `POST /api/coins/deduct` - 扣费接口

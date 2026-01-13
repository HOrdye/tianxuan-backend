# 支付API实现说明

## 📋 概述

本文档说明新增的4个支付相关API的实现和使用方法。

## 🆕 新增API列表

### 1. POST /api/payment/callback/handle - 处理支付回调

**功能**：处理支付回调（新版本，路径为 `/callback/handle`）

**请求方式**：POST

**认证要求**：可选（建议在生产环境中添加支付提供商签名验证）

**请求体**：
```json
{
  "orderId": "uuid",                // 订单ID（必填）
  "status": "completed",            // 支付状态：'completed' 或 'failed'（必填）
  "paymentProvider": "alipay",      // 支付提供商（可选，如 'alipay', 'wechat'）
  "paidAt": "2025-01-30T12:00:00Z" // 支付时间（可选，ISO 8601格式）
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "支付成功，天机币已到账",
  "data": {
    "orderId": "uuid",
    "order_id": "uuid",           // 兼容旧代码
    "newBalance": 1000,
    "new_balance": 1000           // 兼容旧代码
  }
}
```

**错误响应**：
- `400 Bad Request`：参数错误（订单ID或状态无效）
- `404 Not Found`：订单不存在
- `400 Bad Request`：订单已处理，不能重复处理

**注意事项**：
- ⚠️ 实际生产环境中应该：
  1. 验证支付提供商的签名，确保回调来自合法的支付提供商
  2. 检查订单金额是否匹配，防止金额篡改
  3. 实现幂等性处理，防止重复处理同一订单

---

### 2. GET /api/payment/first-purchase - 检查首充状态

**功能**：检查用户是否已经完成首次充值

**请求方式**：GET

**认证要求**：需要认证（Bearer Token）

**请求头**：
```
Authorization: Bearer <token>
```

**响应示例**：
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "isFirstPurchase": true,           // 是否为首充用户（true表示还未完成首充）
    "firstPurchaseOrderId": null,       // 首次充值订单ID（如果已完成首充）
    "firstPurchaseDate": null           // 首次充值时间（如果已完成首充）
  }
}
```

**已完成首充的响应示例**：
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "isFirstPurchase": false,
    "firstPurchaseOrderId": "uuid",
    "firstPurchaseDate": "2025-01-30T12:00:00Z"
  }
}
```

**错误响应**：
- `401 Unauthorized`：未认证
- `400 Bad Request`：参数错误

**使用场景**：
- 检查用户是否可以购买首充特惠包
- 显示首充奖励状态
- 判断用户是否为新用户

---

### 3. GET /api/payment/quota-logs - 查询配额日志

**功能**：查询用户的配额日志（功能使用次数、天机币等的变化记录）

**请求方式**：GET

**认证要求**：需要认证（Bearer Token）

**请求头**：
```
Authorization: Bearer <token>
```

**查询参数**：
- `feature`（可选）：功能名称，如 `'yijing'`, `'ziwei'`, `'bazi'` 等
- `actionType`（可选）：操作类型，如 `'consume'`（消耗）、`'grant'`（授予）、`'refund'`（退款）
- `limit`（可选）：返回记录数，默认50，最大100
- `offset`（可选）：偏移量，默认0

**请求示例**：
```
GET /api/payment/quota-logs?feature=yijing&actionType=consume&limit=20&offset=0
```

**响应示例**：
```json
{
  "success": true,
  "message": "查询成功",
  "data": {
    "logs": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "feature": "yijing",
        "action_type": "consume",
        "amount": -10,
        "balance_before": 100,
        "balance_after": 90,
        "description": "使用易筋经功能",
        "metadata": null,
        "created_at": "2025-01-30T12:00:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "count": 1
    }
  }
}
```

**错误响应**：
- `401 Unauthorized`：未认证
- `400 Bad Request`：参数错误（limit或offset无效）

**使用场景**：
- 查看用户功能使用历史
- 追踪配额变化记录
- 审计和统计

**注意事项**：
- 如果 `quota_logs` 表不存在，API会返回空数组（兼容性处理）
- 需要先执行数据库迁移脚本创建表：`scripts/migration-create-payment-tables.sql`

---

### 4. POST /api/payment/refund-logs - 创建退款日志

**功能**：创建订单退款日志

**请求方式**：POST

**认证要求**：需要认证（Bearer Token）

**请求头**：
```
Authorization: Bearer <token>
```

**请求体**：
```json
{
  "orderId": "uuid",              // 订单ID（必填）
  "refundAmount": 100,            // 退款金额（人民币，单位：元）（必填，必须大于0）
  "refundCoins": 1000,            // 退款天机币数量（必填，不能为负数）
  "refundReason": "用户申请退款"  // 退款原因（可选）
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "退款日志创建成功",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "order_id": "uuid",
    "refund_amount": 100,
    "refund_coins": 1000,
    "refund_reason": "用户申请退款",
    "status": "pending",
    "processed_at": null,
    "created_at": "2025-01-30T12:00:00Z"
  }
}
```

**错误响应**：
- `401 Unauthorized`：未认证
- `400 Bad Request`：参数错误（订单ID、退款金额或退款天机币数量无效）
- `404 Not Found`：订单不存在或不属于当前用户
- `400 Bad Request`：订单状态不允许退款（只有已完成的订单才能退款）

**使用场景**：
- **订单退款**：用户申请退款、管理员处理退款
- **AI服务退款**：AI服务调用失败时自动退还天机币

**注意事项**：
- **订单退款场景**：
  - 只有状态为 `'completed'` 的订单才能创建退款日志
  - 退款日志创建后状态为 `'pending'`，需要后续处理流程更新状态
- **AI服务退款场景**：
  - 创建退款日志后会自动退还天机币到用户账户
  - 需要提供原始扣费时的交易ID（`original_request_id`）
- 需要先执行数据库迁移脚本创建表：`scripts/migration-create-payment-tables.sql`

---

## 🗄️ 数据库表结构

### 配额日志表 (quota_logs)

**表名**：`public.quota_logs`

**字段说明**：
- `id`：日志ID（UUID，主键）
- `user_id`：用户ID（UUID）
- `feature`：功能名称（TEXT，如 'yijing', 'ziwei', 'bazi' 等）
- `action_type`：操作类型（TEXT，'consume'、'grant'、'refund'）
- `amount`：配额变化数量（INTEGER，正数表示增加，负数表示减少）
- `balance_before`：操作前余额（INTEGER）
- `balance_after`：操作后余额（INTEGER）
- `description`：操作描述（TEXT，可选）
- `metadata`：元数据（JSONB，可选）
- `created_at`：创建时间（TIMESTAMP WITH TIME ZONE）

**索引**：
- `idx_quota_logs_user_id`：用户ID索引
- `idx_quota_logs_feature`：功能名称索引
- `idx_quota_logs_action_type`：操作类型索引
- `idx_quota_logs_created_at`：创建时间索引（降序）
- `idx_quota_logs_user_feature`：用户ID和功能名称联合索引

### 退款日志表 (refund_logs)

**表名**：`public.refund_logs`

**字段说明**：
- `id`：退款日志ID（UUID，主键）
- `user_id`：用户ID（UUID）
- `order_id`：关联的订单ID（UUID，订单退款场景，引用 transactions.id）
- `original_request_id`：原始请求ID（UUID，AI服务退款场景，引用扣费交易ID）
- `refund_amount`：退款金额（DECIMAL(10, 2)，订单退款场景，人民币，单位：元）
- `refund_coins`：退款天机币数量（INTEGER，默认0）
- `refund_reason`：退款原因（TEXT，可选）
- `status`：退款状态（TEXT，'pending'、'processing'、'completed'、'failed'、'cancelled'）
- `processed_at`：处理时间（TIMESTAMP WITH TIME ZONE，可选）
- `created_at`：创建时间（TIMESTAMP WITH TIME ZONE）
- `updated_at`：更新时间（TIMESTAMP WITH TIME ZONE）

**约束**：
- `order_id` 和 `original_request_id` 至少有一个不为空（通过 CHECK 约束保证）

**索引**：
- `idx_refund_logs_user_id`：用户ID索引
- `idx_refund_logs_order_id`：订单ID索引
- `idx_refund_logs_original_request_id`：原始请求ID索引（AI服务退款场景）
- `idx_refund_logs_status`：状态索引
- `idx_refund_logs_created_at`：创建时间索引（降序）

---

## 📝 数据库迁移

**迁移脚本**：`scripts/migration-create-payment-tables.sql`

**执行步骤**：
1. 连接到数据库
2. 执行迁移脚本：
   ```bash
   psql -U <username> -d <database> -f scripts/migration-create-payment-tables.sql
   ```

**注意事项**：
- 迁移脚本会创建 `quota_logs` 和 `refund_logs` 两个表
- 如果表已存在，不会重复创建（使用 `CREATE TABLE IF NOT EXISTS`）
- 外键约束默认被注释，需要根据实际情况取消注释

---

## 🔧 代码结构

### 服务层 (`src/services/payment.service.ts`)

新增函数：
- `getQuotaLogs()`：查询配额日志
- `createRefundLog()`：创建退款日志
- `checkFirstPurchase()`：检查首充状态

### 控制器层 (`src/controllers/payment.controller.ts`)

新增控制器：
- `handlePaymentCallbackHandle()`：处理支付回调（新版本）
- `checkFirstPurchase()`：检查首充状态
- `getQuotaLogs()`：查询配额日志
- `createRefundLog()`：创建退款日志

### 路由层 (`src/routes/payment.routes.ts`)

新增路由：
- `POST /api/payment/callback/handle`
- `GET /api/payment/first-purchase`
- `GET /api/payment/quota-logs`
- `POST /api/payment/refund-logs`

---

## ✅ 测试建议

### 1. 测试首充状态检查

```bash
# 获取token后测试
curl -X GET "http://localhost:3000/api/payment/first-purchase" \
  -H "Authorization: Bearer <token>"
```

**预期结果**：
- 新用户：`isFirstPurchase: true`
- 已充值用户：`isFirstPurchase: false`，并返回首次充值订单信息

### 2. 测试配额日志查询

```bash
# 查询所有配额日志
curl -X GET "http://localhost:3000/api/payment/quota-logs?limit=10" \
  -H "Authorization: Bearer <token>"

# 查询特定功能的配额日志
curl -X GET "http://localhost:3000/api/payment/quota-logs?feature=yijing&actionType=consume" \
  -H "Authorization: Bearer <token>"
```

**预期结果**：返回配额日志列表（如果表不存在，返回空数组）

### 3. 测试创建退款日志

```bash
# 创建退款日志
curl -X POST "http://localhost:3000/api/payment/refund-logs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "<completed_order_id>",
    "refundAmount": 100,
    "refundCoins": 1000,
    "refundReason": "用户申请退款"
  }'
```

**预期结果**：创建退款日志成功，返回退款日志信息

**注意事项**：
- 需要先有一个状态为 `completed` 的订单
- 订单必须属于当前用户

### 4. 测试支付回调处理

```bash
# 处理支付回调
curl -X POST "http://localhost:3000/api/payment/callback/handle" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "<order_id>",
    "status": "completed",
    "paymentProvider": "alipay",
    "paidAt": "2025-01-30T12:00:00Z"
  }'
```

**预期结果**：处理支付回调成功，更新订单状态并发放天机币

---

## 🐛 错误处理

所有API都包含完善的错误处理：

1. **参数验证**：检查必填参数和参数类型
2. **权限验证**：检查用户认证状态
3. **业务逻辑验证**：检查订单状态、用户权限等
4. **数据库错误处理**：捕获并返回友好的错误信息

---

## 📚 相关文档

- [支付系统API文档](./README.md)
- [数据库迁移脚本](./scripts/migration-create-payment-tables.sql)
- [后端API开发规范](./后端API开发提示词-任务系统.md)

---

## 🔄 更新日志

**2025-01-30**
- ✅ 实现 POST /api/payment/callback/handle - 处理支付回调
- ✅ 实现 GET /api/payment/first-purchase - 检查首充状态
- ✅ 实现 GET /api/payment/quota-logs - 查询配额日志
- ✅ 实现 POST /api/payment/refund-logs - 创建退款日志
- ✅ 创建数据库迁移脚本

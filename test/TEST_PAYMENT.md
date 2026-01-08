# 支付系统 API 测试文档

**创建时间**: 2025年1月30日  
**API 版本**: v1.0  
**测试状态**: 待测试

---

## 📋 测试概述

本文档用于测试支付系统 API 的所有功能，包括：
1. 创建支付订单
2. 处理支付回调
3. 查询订单列表
4. 查询单个订单详情

---

## 🔧 测试前准备

### 1. 获取认证 Token

首先需要注册/登录获取 JWT Token：

```bash
# 注册新用户（如果还没有）
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123456",
  "username": "testuser"
}

# 或登录现有用户
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123456"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**保存 Token** 用于后续测试：
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🧪 测试用例

### 测试 1: 创建支付订单 ✅

**测试目标**: 验证创建支付订单功能

**请求**:
```bash
POST http://localhost:3000/api/payment/orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 100,
  "coinsAmount": 1000,
  "packType": "coins_pack_1",
  "paymentProvider": "alipay",
  "description": "购买1000天机币"
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "订单创建成功",
  "data": {
    "order_id": "uuid"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `order_id`
- ✅ 订单状态为 `pending`
- ✅ 订单类型为 `purchase`

**保存订单ID** 用于后续测试：
```bash
export ORDER_ID="uuid"
```

---

### 测试 2: 查询订单列表 ✅

**测试目标**: 验证查询订单列表功能

**请求**:
```bash
GET http://localhost:3000/api/payment/orders?limit=10&offset=0
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "type": "purchase",
        "amount": 100,
        "coins_amount": 1000,
        "pack_type": "coins_pack_1",
        "description": "购买1000天机币",
        "status": "pending",
        "paid_at": null,
        "payment_provider": "alipay",
        "is_first_purchase": true,
        "created_at": "2025-01-30T12:00:00Z"
      }
    ],
    "limit": 10,
    "offset": 0,
    "count": 1
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回订单列表
- ✅ 订单信息正确

---

### 测试 3: 查询单个订单详情 ✅

**测试目标**: 验证查询单个订单详情功能

**请求**:
```bash
GET http://localhost:3000/api/payment/orders/<ORDER_ID>
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "type": "purchase",
    "amount": 100,
    "coins_amount": 1000,
    "pack_type": "coins_pack_1",
    "description": "购买1000天机币",
    "status": "pending",
    "paid_at": null,
    "payment_provider": "alipay",
    "is_first_purchase": true,
    "created_at": "2025-01-30T12:00:00Z"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回订单详情
- ✅ 订单信息正确

---

### 测试 4: 处理支付回调（成功）✅

**测试目标**: 验证支付成功回调处理功能

**请求**:
```bash
POST http://localhost:3000/api/payment/callback
Content-Type: application/json

{
  "orderId": "<ORDER_ID>",
  "status": "completed",
  "paymentProvider": "alipay",
  "paidAt": "2025-01-30T12:05:00Z"
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "支付成功，天机币已到账",
  "data": {
    "order_id": "uuid",
    "new_balance": 1000
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 订单状态更新为 `completed`
- ✅ `paid_at` 字段已设置
- ✅ 用户天机币余额增加

**验证余额**:
```bash
GET http://localhost:3000/api/coins/balance
Authorization: Bearer <TOKEN>
```

应该看到 `tianji_coins_balance` 增加了 1000。

---

### 测试 5: 处理支付回调（失败）✅

**测试目标**: 验证支付失败回调处理功能

**先创建一个新订单**:
```bash
POST http://localhost:3000/api/payment/orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": 50,
  "coinsAmount": 500,
  "packType": "coins_pack_2"
}
```

**保存新订单ID**:
```bash
export FAILED_ORDER_ID="uuid"
```

**请求**:
```bash
POST http://localhost:3000/api/payment/callback
Content-Type: application/json

{
  "orderId": "<FAILED_ORDER_ID>",
  "status": "failed",
  "paymentProvider": "alipay"
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "支付失败",
  "data": {
    "order_id": "uuid"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 订单状态更新为 `failed`
- ✅ 用户天机币余额不变

---

### 测试 6: 查询订单列表（按状态过滤）✅

**测试目标**: 验证按状态过滤订单列表功能

**请求**:
```bash
GET http://localhost:3000/api/payment/orders?status=completed&limit=10
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "status": "completed",
        ...
      }
    ],
    "limit": 10,
    "offset": 0,
    "count": 1
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 只返回 `status` 为 `completed` 的订单
- ✅ 订单列表正确过滤

---

### 测试 7: 创建订单（参数错误）✅

**测试目标**: 验证参数验证功能

**请求**:
```bash
POST http://localhost:3000/api/payment/orders
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "amount": -100,
  "coinsAmount": 1000
}
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "参数错误",
  "message": "支付金额 (amount) 必须提供且大于0"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ 错误信息清晰明确

---

### 测试 8: 查询不存在的订单 ✅

**测试目标**: 验证查询不存在订单的错误处理

**请求**:
```bash
GET http://localhost:3000/api/payment/orders/00000000-0000-0000-0000-000000000000
Authorization: Bearer <TOKEN>
```

**预期响应** (404 Not Found):
```json
{
  "success": false,
  "error": "订单不存在"
}
```

**验证点**:
- ✅ 返回状态码 404
- ✅ `success` 为 `false`
- ✅ 错误信息清晰明确

---

### 测试 9: 重复处理支付回调 ✅

**测试目标**: 验证防止重复处理支付回调的功能

**请求**（使用已完成的订单ID）:
```bash
POST http://localhost:3000/api/payment/callback
Content-Type: application/json

{
  "orderId": "<ORDER_ID>",
  "status": "completed"
}
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "订单已处理",
  "message": "订单已完成，不能重复处理"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ 错误信息清晰明确
- ✅ 防止重复处理

---

### 测试 10: 未认证请求 ✅

**测试目标**: 验证认证保护功能

**请求**（不提供 Token）:
```bash
POST http://localhost:3000/api/payment/orders
Content-Type: application/json

{
  "amount": 100,
  "coinsAmount": 1000
}
```

**预期响应** (401 Unauthorized):
```json
{
  "success": false,
  "error": "未认证"
}
```

**验证点**:
- ✅ 返回状态码 401
- ✅ `success` 为 `false`
- ✅ 错误信息清晰明确

---

## 📊 测试结果汇总

| 测试用例 | 状态 | 说明 |
|---------|------|------|
| 1. 创建支付订单 | ⏳ 待测试 | |
| 2. 查询订单列表 | ⏳ 待测试 | |
| 3. 查询单个订单详情 | ⏳ 待测试 | |
| 4. 处理支付回调（成功） | ⏳ 待测试 | |
| 5. 处理支付回调（失败） | ⏳ 待测试 | |
| 6. 查询订单列表（按状态过滤） | ⏳ 待测试 | |
| 7. 创建订单（参数错误） | ⏳ 待测试 | |
| 8. 查询不存在的订单 | ⏳ 待测试 | |
| 9. 重复处理支付回调 | ⏳ 待测试 | |
| 10. 未认证请求 | ⏳ 待测试 | |

**总计**: 0/10 测试用例通过

---

## 🔍 验收标准

- ✅ 用户可以创建支付订单
- ✅ 用户可以查询自己的订单列表
- ✅ 用户可以查询单个订单详情
- ✅ 支付回调可以正确处理成功和失败状态
- ✅ 支付成功后用户天机币余额正确增加
- ✅ 参数验证正常工作
- ✅ 错误处理正确
- ✅ 认证保护正常工作
- ✅ 防止重复处理支付回调

---

## 📝 注意事项

1. **支付回调安全**: 
   - 实际生产环境中应该添加支付提供商的签名验证
   - 应该验证订单金额是否匹配，防止金额篡改
   - 应该实现幂等性处理，防止重复处理同一订单

2. **首次购买标识**:
   - 系统会自动检测用户是否首次购买
   - `is_first_purchase` 字段会在创建订单时自动设置

3. **订单状态**:
   - `pending`: 订单已创建，等待支付
   - `completed`: 支付成功，天机币已到账
   - `failed`: 支付失败

4. **天机币余额**:
   - 支付成功后，天机币会直接增加到 `tianji_coins_balance`
   - 可以通过 `/api/coins/balance` 接口查询余额

---

**最后更新**: 2025年1月30日  
**测试状态**: 待测试

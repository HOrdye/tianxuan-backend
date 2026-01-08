# 管理员后台 API 测试文档

**创建时间**: 2025年1月30日  
**测试目标**: 管理员后台 API 功能验证  
**测试环境**: 开发环境  
**API 基础路径**: `http://localhost:3000/api/admin`

---

## 📋 测试准备

### 1. 前置条件

1. **管理员账号**：需要一个具有管理员权限的账号
2. **测试用户**：需要至少一个普通用户账号用于测试
3. **测试数据**：需要一些交易记录用于测试流水查询

### 2. 获取管理员 Token

```bash
# 1. 登录管理员账号
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# 2. 复制返回的 token，后续请求都需要在 Header 中添加：
# Authorization: Bearer <token>
```

### 3. 设置环境变量

```bash
export ADMIN_TOKEN="your_admin_token_here"
export TEST_USER_ID="test_user_id_here"
```

---

## 🧪 测试用例

### 测试组1：用户管理

#### 测试1.1：获取用户列表（分页）

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回用户列表（分页）
- ✅ 包含分页信息（total, page, pageSize, totalPages）

**测试1.2：用户列表搜索**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users?search=test&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回匹配搜索关键词的用户列表

**测试1.3：用户列表筛选（按等级）**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users?tier=premium&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 只返回指定等级的用户

**测试1.4：获取用户详情**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回完整的用户详情信息

**测试1.5：修改用户等级**

**请求**:
```bash
curl -X PUT "http://localhost:3000/api/admin/users/$TEST_USER_ID/tier" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium"
  }'
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 用户等级修改成功
- ✅ 验证：再次查询用户详情，确认等级已更新

**测试1.6：调整用户天机币**

**请求**:
```bash
curl -X PUT "http://localhost:3000/api/admin/users/$TEST_USER_ID/coins" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustmentAmount": 100,
    "reason": "测试调整",
    "coinType": "tianji_coins_balance"
  }'
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 天机币调整成功
- ✅ 返回新的余额
- ✅ 验证：查询用户详情，确认余额已更新

---

### 测试组2：交易流水查询

#### 测试2.1：获取天机币交易流水

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/coin-transactions?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回天机币交易流水列表
- ✅ 包含用户信息（email, username）
- ✅ 只包含天机币相关交易（排除支付交易）

**测试2.2：天机币流水筛选（按用户）**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/coin-transactions?userId=$TEST_USER_ID&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 只返回指定用户的交易记录

**测试2.3：天机币流水筛选（按日期范围）**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/coin-transactions?startDate=2025-01-01&endDate=2025-01-31&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 只返回指定日期范围内的交易记录

**测试2.4：获取支付交易流水**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/payment-transactions?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回支付交易流水列表
- ✅ 只包含支付相关交易（type = 'purchase'）

**测试2.5：支付流水筛选（按状态）**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/payment-transactions?status=paid&page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 只返回已支付的订单

---

### 测试组3：数据统计

#### 测试3.1：获取数据概览统计

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/stats/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回数据概览统计：
  - totalUsers（总用户数）
  - activeUsers（活跃用户数）
  - totalRevenue（总收入）
  - totalCoinsGranted（总发放天机币）
  - totalCoinsConsumed（总消费天机币）
  - todayNewUsers（今日新增用户）
  - todayRevenue（今日收入）
  - todayCoinsGranted（今日发放天机币）
  - todayCoinsConsumed（今日消费天机币）

**测试3.2：获取用户统计**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/stats/users?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回用户统计：
  - totalUsers（总用户数）
  - usersByTier（按等级分组的用户数）
  - usersByRole（按角色分组的用户数）
  - newUsersByDay（每日新增用户数）

**测试3.3：获取收入统计**

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/stats/revenue?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 200
- ✅ 返回收入统计：
  - totalRevenue（总收入）
  - revenueByDay（每日收入）
  - revenueByPackType（按套餐类型分组的收入）
  - averageOrderValue（平均订单金额）

---

### 测试组4：权限验证

#### 测试4.1：未认证请求

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users"
```

**预期结果**:
- ✅ 状态码: 401
- ✅ 返回错误信息："未认证"

#### 测试4.2：非管理员请求

**请求**:
```bash
# 使用普通用户 token
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer $NORMAL_USER_TOKEN"
```

**预期结果**:
- ✅ 状态码: 403
- ✅ 返回错误信息："权限不足"

#### 测试4.3：无效的用户ID

**请求**:
```bash
curl -X GET "http://localhost:3000/api/admin/users/invalid-user-id" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**预期结果**:
- ✅ 状态码: 404
- ✅ 返回错误信息："用户不存在"

#### 测试4.4：无效的等级值

**请求**:
```bash
curl -X PUT "http://localhost:3000/api/admin/users/$TEST_USER_ID/tier" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "invalid_tier"
  }'
```

**预期结果**:
- ✅ 状态码: 500
- ✅ 返回错误信息：参数错误，等级必须是以下之一：explorer, basic, premium, vip

---

## 📊 测试结果记录

### 测试执行记录

| 测试用例 | 状态 | 备注 |
|---------|------|------|
| 1.1 获取用户列表 | ⏳ 待测试 | |
| 1.2 用户列表搜索 | ⏳ 待测试 | |
| 1.3 用户列表筛选 | ⏳ 待测试 | |
| 1.4 获取用户详情 | ⏳ 待测试 | |
| 1.5 修改用户等级 | ⏳ 待测试 | |
| 1.6 调整用户天机币 | ⏳ 待测试 | |
| 2.1 获取天机币交易流水 | ⏳ 待测试 | |
| 2.2 天机币流水筛选（按用户） | ⏳ 待测试 | |
| 2.3 天机币流水筛选（按日期） | ⏳ 待测试 | |
| 2.4 获取支付交易流水 | ⏳ 待测试 | |
| 2.5 支付流水筛选（按状态） | ⏳ 待测试 | |
| 3.1 获取数据概览统计 | ⏳ 待测试 | |
| 3.2 获取用户统计 | ⏳ 待测试 | |
| 3.3 获取收入统计 | ⏳ 待测试 | |
| 4.1 未认证请求 | ⏳ 待测试 | |
| 4.2 非管理员请求 | ⏳ 待测试 | |
| 4.3 无效的用户ID | ⏳ 待测试 | |
| 4.4 无效的等级值 | ⏳ 待测试 | |

---

## ✅ 验收标准

### 功能验收

- ✅ 所有用户管理功能正常（列表、详情、修改等级、调整天机币）
- ✅ 所有交易流水查询功能正常（天机币流水、支付流水）
- ✅ 所有数据统计功能正常（概览、用户统计、收入统计）
- ✅ 权限验证正常（未认证、非管理员、无效参数）

### 性能验收

- ✅ 用户列表查询响应时间 < 500ms（1000条记录）
- ✅ 交易流水查询响应时间 < 500ms（1000条记录）
- ✅ 数据统计查询响应时间 < 1000ms

### 安全验收

- ✅ 所有API都需要认证
- ✅ 所有API都需要管理员权限
- ✅ 参数验证正常（防止SQL注入）
- ✅ 错误信息不泄露敏感信息（生产环境）

---

## 📝 测试脚本

创建测试脚本 `test-admin.sh`:

```bash
#!/bin/bash

# 管理员后台 API 测试脚本

BASE_URL="http://localhost:3000/api/admin"
ADMIN_TOKEN="your_admin_token_here"
TEST_USER_ID="test_user_id_here"

echo "=== 管理员后台 API 测试 ==="

# 测试1：获取用户列表
echo -e "\n1. 测试获取用户列表..."
curl -X GET "$BASE_URL/users?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试2：获取用户详情
echo -e "\n2. 测试获取用户详情..."
curl -X GET "$BASE_URL/users/$TEST_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试3：获取天机币交易流水
echo -e "\n3. 测试获取天机币交易流水..."
curl -X GET "$BASE_URL/coin-transactions?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试4：获取支付交易流水
echo -e "\n4. 测试获取支付交易流水..."
curl -X GET "$BASE_URL/payment-transactions?page=1&pageSize=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试5：获取数据概览统计
echo -e "\n5. 测试获取数据概览统计..."
curl -X GET "$BASE_URL/stats/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试6：获取用户统计
echo -e "\n6. 测试获取用户统计..."
curl -X GET "$BASE_URL/stats/users?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

# 测试7：获取收入统计
echo -e "\n7. 测试获取收入统计..."
curl -X GET "$BASE_URL/stats/revenue?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -w "\n状态码: %{http_code}\n"

echo -e "\n=== 测试完成 ==="
```

---

**最后更新**: 2025年1月30日  
**测试状态**: ⏳ 待测试

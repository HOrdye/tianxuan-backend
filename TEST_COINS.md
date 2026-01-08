# 天机币系统 API 测试指南

## 📋 测试前准备

### 1. 确认环境变量配置

确保 `.env` 文件中包含以下配置：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tianxuan
DB_USER=tianxuan
DB_PASSWORD=你的数据库密码

# JWT 配置
JWT_SECRET=你的JWT密钥（至少32位随机字符串）
JWT_EXPIRES_IN=7d
```

### 2. 启动服务器

```bash
cd /opt/tianxuan/backend
npm run dev
```

服务器应该运行在 `http://localhost:3000`

### 3. 准备测试用户

**重要**: 在测试前，需要先注册一个测试用户并获取 Token。

```bash
# 注册测试用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coins_test@example.com",
    "password": "Test123456",
    "username": "coinstest"
  }'

# 登录获取 Token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coins_test@example.com",
    "password": "Test123456"
  }'
```

保存返回的 `token`，后续测试需要使用。

---

## 🧪 测试步骤

### 测试 1: 查询余额

**目标**: 验证查询用户天机币余额功能

**请求**:
```bash
# 替换 <TOKEN> 为实际的 Token
curl -X GET http://localhost:3000/api/coins/balance \
  -H "Authorization: Bearer <TOKEN>"
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "tianji_coins_balance": 20,
    "daily_coins_grant": 0,
    "activity_coins_grant": 0,
    "daily_coins_grant_expires_at": null,
    "activity_coins_grant_expires_at": null
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ `data` 包含所有余额字段
- ✅ 新注册用户应该有 20 个天机币（注册奖励）

---

### 测试 2: 扣费（成功）

**目标**: 验证扣费功能，余额充足时扣费成功

**请求**:
```bash
# 替换 <TOKEN> 为实际的 Token
curl -X POST http://localhost:3000/api/coins/deduct \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "featureType": "star_chart",
    "price": 10
  }'
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "扣费成功",
  "data": {
    "remaining_balance": 10,
    "transaction_id": "uuid-string"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ `remaining_balance` 正确（原余额 - 扣费金额）
- ✅ `transaction_id` 存在

---

### 测试 3: 扣费（余额不足）

**目标**: 验证余额不足时的错误处理

**请求**:
```bash
# 替换 <TOKEN> 为实际的 Token
# 假设当前余额为 10，尝试扣费 20
curl -X POST http://localhost:3000/api/coins/deduct \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "featureType": "star_chart",
    "price": 20
  }'
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "余额不足",
  "message": "余额不足，无法完成扣费"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ `error` 为 "余额不足"

---

### 测试 4: 扣费（参数错误）

**目标**: 验证参数验证功能

**请求**:
```bash
# 替换 <TOKEN> 为实际的 Token
# 测试缺少参数
curl -X POST http://localhost:3000/api/coins/deduct \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "featureType": "star_chart"
  }'
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "参数错误",
  "message": "价格 (price) 必须提供且为正数"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ `error` 为 "参数错误"
- ✅ `message` 包含具体的错误信息

---

### 测试 5: 查询交易流水

**目标**: 验证查询天机币交易流水功能

**请求**:
```bash
# 替换 <TOKEN> 为实际的 Token
curl -X GET "http://localhost:3000/api/coins/transactions?limit=10&offset=0" \
  -H "Authorization: Bearer <TOKEN>"
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "transaction_type": "deduct",
        "amount": 10,
        "coin_type": "tianji_coins_balance",
        "feature_type": "star_chart",
        "description": "扣费",
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
- ✅ `transactions` 数组包含交易记录
- ✅ 交易记录按时间倒序排列（最新的在前）
- ✅ 包含 `limit`、`offset`、`count` 字段

---

### 测试 6: 管理员调整天机币（需要管理员权限）

**目标**: 验证管理员调整天机币功能

**⚠️ 重要**: 此测试需要管理员账号。如果没有管理员账号，需要先在数据库中设置：

```sql
-- 将用户设置为管理员
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'coins_test@example.com';
```

**请求**:
```bash
# 替换 <ADMIN_TOKEN> 为管理员的 Token
# 替换 <TARGET_USER_ID> 为目标用户的 ID
curl -X POST http://localhost:3000/api/coins/admin/adjust \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "<TARGET_USER_ID>",
    "adjustmentAmount": 100,
    "reason": "测试调整",
    "coinType": "tianji_coins_balance"
  }'
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "调整成功",
  "data": {
    "new_balance": 120,
    "transaction_id": "uuid-string"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ `new_balance` 正确（原余额 + 调整金额）
- ✅ `transaction_id` 存在

---

### 测试 7: 管理员调整（非管理员用户）

**目标**: 验证非管理员用户无法执行调整操作

**请求**:
```bash
# 替换 <NON_ADMIN_TOKEN> 为非管理员的 Token
curl -X POST http://localhost:3000/api/coins/admin/adjust \
  -H "Authorization: Bearer <NON_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "targetUserId": "some-user-id",
    "adjustmentAmount": 100,
    "reason": "测试调整"
  }'
```

**预期响应** (403 Forbidden):
```json
{
  "success": false,
  "error": "权限不足",
  "message": "只有管理员可以执行此操作"
}
```

**验证点**:
- ✅ 返回状态码 403
- ✅ `success` 为 `false`
- ✅ `error` 为 "权限不足"

---

### 测试 8: 未认证请求

**目标**: 验证未提供 Token 时的错误处理

**请求**:
```bash
curl -X GET http://localhost:3000/api/coins/balance
```

**预期响应** (401 Unauthorized):
```json
{
  "error": "未提供认证令牌",
  "message": "请在请求头中添加 Authorization: Bearer <token>"
}
```

**验证点**:
- ✅ 返回状态码 401
- ✅ 错误信息清晰明确

---

## 📊 测试结果汇总

### 功能测试清单

- [ ] 测试 1: 查询余额 ✅
- [ ] 测试 2: 扣费（成功）✅
- [ ] 测试 3: 扣费（余额不足）✅
- [ ] 测试 4: 扣费（参数错误）✅
- [ ] 测试 5: 查询交易流水 ✅
- [ ] 测试 6: 管理员调整天机币 ✅
- [ ] 测试 7: 管理员调整（非管理员用户）✅
- [ ] 测试 8: 未认证请求 ✅

### 验收标准

所有测试用例通过后，天机币系统 API 开发完成：

- ✅ 用户可以查询自己的余额
- ✅ 用户可以执行扣费操作（余额充足时）
- ✅ 余额不足时正确返回错误
- ✅ 参数验证正确
- ✅ 用户可以查询自己的交易流水
- ✅ 管理员可以调整用户的天机币
- ✅ 非管理员用户无法执行调整操作
- ✅ 未认证请求正确返回错误

---

## 🔍 故障排查

### 问题 1: 扣费失败，提示"函数不存在"

**原因**: 数据库函数 `deduct_coins` 未创建或未正确导入

**解决**:
1. 检查数据库是否已导入所有 SQL 脚本
2. 确认 `migration-all-functions-complete.sql` 已执行
3. 验证函数是否存在：
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name = 'deduct_coins';
   ```

### 问题 2: 管理员调整失败，提示"只有管理员可以执行此操作"

**原因**: 用户角色不是管理员

**解决**:
1. 检查用户角色：
   ```sql
   SELECT id, email, role FROM public.profiles WHERE email = 'your-email@example.com';
   ```
2. 设置为管理员：
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

### 问题 3: 查询余额返回 null

**原因**: 用户不存在或 profiles 表未创建

**解决**:
1. 检查用户是否存在：
   ```sql
   SELECT * FROM public.profiles WHERE id = 'user-id';
   ```
2. 确认 profiles 表已创建

---

## 📝 测试脚本

可以使用以下脚本批量测试所有功能：

```bash
#!/bin/bash

# 设置变量
BASE_URL="http://localhost:3000"
EMAIL="coins_test@example.com"
PASSWORD="Test123456"

# 1. 注册用户
echo "=== 1. 注册用户 ==="
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"username\":\"coinstest\"}")
echo "$REGISTER_RESPONSE" | jq .

# 2. 登录获取 Token
echo -e "\n=== 2. 登录获取 Token ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
echo "Token: $TOKEN"

# 3. 查询余额
echo -e "\n=== 3. 查询余额 ==="
curl -s -X GET "$BASE_URL/api/coins/balance" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 4. 扣费
echo -e "\n=== 4. 扣费 ==="
curl -s -X POST "$BASE_URL/api/coins/deduct" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"featureType":"star_chart","price":10}' | jq .

# 5. 再次查询余额
echo -e "\n=== 5. 再次查询余额 ==="
curl -s -X GET "$BASE_URL/api/coins/balance" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 6. 查询交易流水
echo -e "\n=== 6. 查询交易流水 ==="
curl -s -X GET "$BASE_URL/api/coins/transactions?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n=== 测试完成 ==="
```

保存为 `test-coins.sh`，然后执行：

```bash
chmod +x test-coins.sh
./test-coins.sh
```

---

**最后更新**: 2025年1月30日  
**测试状态**: 待测试

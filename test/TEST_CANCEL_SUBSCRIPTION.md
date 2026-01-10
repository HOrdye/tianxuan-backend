# 取消订阅功能测试指南

## 测试目标

验证取消订阅功能的核心逻辑：
1. ✅ 取消订阅后，`tier` 应该保持不变（不立即降级为免费用户）
2. ✅ `subscription_status` 应该变为 `'cancelled'`
3. ✅ `subscription_end_at` 应该保持不变（权益保留到过期时间）
4. ✅ 查询订阅状态API应该正确返回 `tier` 和 `status`

## 测试前准备

### 1. 启动后端服务

```bash
cd /opt/tianxuan/backend
npm run dev
# 或
npm start
```

确保服务运行在 `http://localhost:3000`（或配置的端口）

### 2. 运行测试脚本

```bash
cd /opt/tianxuan/backend
node test/test_cancel_subscription.js
```

## 测试步骤说明

测试脚本会自动执行以下步骤：

### 步骤1: 注册测试用户
- 创建一个新的测试用户

### 步骤2: 登录获取Token
- 登录并获取认证Token

### 步骤3: 创建活跃订阅
- 直接在数据库中创建一个 `premium` 等级的活跃订阅
- 设置 `status = 'active'`, `auto_renew = true`
- 过期时间设置为1个月后

### 步骤4: 验证取消前的订阅状态
- 调用 `GET /api/subscription/status`
- 验证 `tier = 'premium'`, `status = 'active'`

### 步骤5: 取消订阅
- 调用 `POST /api/subscription/cancel`
- 验证返回成功

### 步骤6: 验证数据库中的订阅状态
- 查询 `subscriptions` 表
- 验证：
  - `status = 'cancelled'`
  - `auto_renew = false`
  - `tier = 'premium'`（保持不变）

### 步骤7: 验证 profiles 表中的 tier（关键测试）
- 查询 `profiles` 表
- 验证：
  - `tier = 'premium'`（**关键：不应降级**）
  - `subscription_status = 'cancelled'`
  - `subscription_end_at` 保持不变

### 步骤8: 验证取消后的订阅状态查询
- 调用 `GET /api/subscription/status`
- 验证：
  - `tier = 'premium'`（保持不变）
  - `status = 'cancelled'`

### 步骤9: 测试重复取消（幂等性）
- 再次调用 `POST /api/subscription/cancel`
- 验证返回"您的订阅已取消"的提示

## 预期结果

### ✅ 成功场景

所有测试应该通过，关键验证点：

1. **数据库验证**：
   ```sql
   -- subscriptions 表
   SELECT tier, status, auto_renew FROM subscriptions WHERE id = '...';
   -- 结果：tier = 'premium', status = 'cancelled', auto_renew = false
   
   -- profiles 表
   SELECT tier, subscription_status, subscription_end_at FROM profiles WHERE id = '...';
   -- 结果：tier = 'premium', subscription_status = 'cancelled', subscription_end_at 不为空
   ```

2. **API 验证**：
   ```json
   GET /api/subscription/status
   {
     "success": true,
     "data": {
       "tier": "premium",  // ✅ 保持不变
       "status": "cancelled",
       "expiresAt": "2026-02-01T00:00:00Z"
     }
   }
   ```

### ❌ 失败场景（已修复）

如果测试失败，可能的原因：

1. **tier 被立即降级为 'free'**
   - 原因：`cancelSubscription` 函数中错误地更新了 `profiles.tier`
   - 修复：已修复，不再修改 `tier`

2. **subscription_end_at 被清空**
   - 原因：更新 `profiles` 表时清空了 `subscription_end_at`
   - 修复：已修复，保持 `subscription_end_at` 不变

3. **status 查询错误**
   - 原因：`getSubscriptionStatus` 函数没有正确处理 `cancelled` 状态
   - 修复：已修复，查询时包含 `'cancelled'` 状态

## 手动测试步骤

如果自动测试脚本无法运行，可以手动测试：

### 1. 使用 curl 测试

```bash
# 1. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456","username":"testuser"}'

# 2. 登录获取Token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' \
  | jq -r '.data.token')

# 3. 创建订阅（需要先有支付订单，这里简化）
# 直接通过数据库创建测试订阅...

# 4. 查询订阅状态（取消前）
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Authorization: Bearer $TOKEN"

# 5. 取消订阅
curl -X POST http://localhost:3000/api/subscription/cancel \
  -H "Authorization: Bearer $TOKEN"

# 6. 查询订阅状态（取消后）
curl -X GET http://localhost:3000/api/subscription/status \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 使用数据库验证

```sql
-- 查看订阅状态
SELECT id, user_id, tier, status, auto_renew, expires_at 
FROM subscriptions 
WHERE user_id = 'YOUR_USER_ID';

-- 查看用户等级
SELECT id, tier, subscription_status, subscription_end_at 
FROM profiles 
WHERE id = 'YOUR_USER_ID';
```

## 修复内容总结

### 修复前的问题
- ❌ 取消订阅时立即将 `profiles.tier` 改为 `'free'`
- ❌ 立即清空 `subscription_end_at`
- ❌ 查询订阅状态时，`cancelled` 状态的订阅被忽略

### 修复后的逻辑
- ✅ 取消订阅时，只更新 `subscription_status = 'cancelled'`
- ✅ `profiles.tier` 保持不变（权益保留到过期时间）
- ✅ `subscription_end_at` 保持不变
- ✅ 查询订阅状态时，正确处理 `cancelled` 状态
- ✅ 只有真正过期后，才降级为 `'free'`

## 注意事项

1. **权益保留**：取消订阅 ≠ 立即终止权益，权益保留到 `expires_at`
2. **自动续费**：取消订阅 = 关闭自动续费（`auto_renew = false`）
3. **状态标记**：取消订阅后，`status = 'cancelled'`，但 `tier` 保持不变
4. **过期处理**：到期后由定时任务处理，将 `status` 改为 `'expired'`，`tier` 改为 `'free'`

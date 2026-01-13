# 新API实现说明文档

**创建时间**: 2026年1月30日  
**状态**: ✅ **已完成** - 所有8个API端点已完整实现

---

## 📋 实现概述

已成功实现以下三类API接口：

### 1. ✅ 共振反馈API（3个端点）
- `POST /api/resonance/feedback` - 提交反馈
- `GET /api/resonance/feedback/check` - 检查反馈状态
- `GET /api/resonance/feedback/stats` - 获取反馈统计

### 2. ✅ 时空导航缓存API（3个端点）
- `GET /api/timespace/cache` - 获取缓存
- `POST /api/timespace/cache` - 保存缓存
- `DELETE /api/timespace/cache` - 清除缓存

### 3. ✅ 签到升级补差API（2个端点）
- `GET /api/checkin/upgrade-bonus/calculate` - 计算升级补差
- `POST /api/checkin/upgrade-bonus/grant` - 发放升级补差

---

## 📁 代码结构

### 1. 数据库迁移脚本

#### 共振反馈表
- **文件**: `scripts/migration-create-resonance-feedback-table.sql`
- **表名**: `resonance_feedback`
- **功能**: 存储用户反馈信息

#### 签到升级补差表
- **文件**: `scripts/migration-create-checkin-upgrade-bonus-table.sql`
- **表名**: `checkin_upgrade_bonus_logs`
- **功能**: 记录签到升级补差记录

### 2. 服务层

#### 共振反馈服务
- **文件**: `src/services/resonance.service.ts`
- **主要函数**:
  - `submitFeedback()` - 提交反馈
  - `checkFeedbackStatus()` - 检查反馈状态
  - `getFeedbackStats()` - 获取反馈统计

#### 时空导航缓存服务
- **文件**: `src/services/timespace.service.ts`
- **主要函数**:
  - `getTimespaceCache()` - 获取缓存
  - `saveTimespaceCache()` - 保存缓存
  - `clearTimespaceCache()` - 清除缓存

#### 签到升级补差服务
- **文件**: `src/services/checkin-upgrade.service.ts`
- **主要函数**:
  - `calculateUpgradeBonus()` - 计算升级补差
  - `grantUpgradeBonus()` - 发放升级补差

### 3. 控制器层

#### 共振反馈控制器
- **文件**: `src/controllers/resonance.controller.ts`
- **控制器函数**:
  - `submitFeedback()` - 提交反馈控制器
  - `checkFeedbackStatus()` - 检查反馈状态控制器
  - `getFeedbackStats()` - 获取反馈统计控制器

#### 时空导航缓存控制器
- **文件**: `src/controllers/timespace.controller.ts`
- **控制器函数**:
  - `getTimespaceCache()` - 获取缓存控制器
  - `saveTimespaceCache()` - 保存缓存控制器
  - `clearTimespaceCache()` - 清除缓存控制器

#### 签到升级补差控制器
- **文件**: `src/controllers/checkin-upgrade.controller.ts`
- **控制器函数**:
  - `calculateUpgradeBonus()` - 计算升级补差控制器
  - `grantUpgradeBonus()` - 发放升级补差控制器

### 4. 路由层

#### 共振反馈路由
- **文件**: `src/routes/resonance.routes.ts`
- **路由**: `/api/resonance`

#### 时空导航缓存路由
- **文件**: `src/routes/timespace.routes.ts`
- **路由**: `/api/timespace`

#### 签到升级补差路由
- **文件**: `src/routes/checkin.routes.ts`（已更新）
- **路由**: `/api/checkin/upgrade-bonus/*`

### 5. 应用配置
- **文件**: `src/app.ts` (已更新)
- **变更**: 注册了共振反馈路由和时空导航缓存路由

---

## 🔌 API端点详细说明

### 1. 共振反馈API

#### POST /api/resonance/feedback - 提交反馈

**功能**: 用户提交反馈信息

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "feedback_type": "bug",        // 反馈类型（必需，如：bug, suggestion, praise等）
  "content": "反馈内容",          // 反馈内容（必需）
  "rating": 5,                   // 评分（可选，1-5分）
  "metadata": {                  // 元数据（可选）
    "device": "iPhone",
    "version": "1.0.0"
  }
}
```

**响应**:
```json
{
  "success": true,
  "message": "反馈提交成功",
  "data": {
    "feedback_id": "uuid"
  }
}
```

**错误响应**:
- `400`: 参数错误
- `401`: 未认证
- `404`: 用户不存在
- `500`: 服务器错误

---

#### GET /api/resonance/feedback/check - 检查反馈状态

**功能**: 查询指定反馈的状态

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `feedback_id`: 反馈ID（必需）

**响应**:
```json
{
  "success": true,
  "data": {
    "feedback_id": "uuid",
    "status": "pending",          // pending, reviewed, resolved, rejected
    "reviewed_at": "2025-01-30T12:00:00Z",
    "reviewed_by": "uuid",
    "created_at": "2025-01-30T12:00:00Z",
    "updated_at": "2025-01-30T12:00:00Z"
  }
}
```

**错误响应**:
- `400`: 参数错误
- `401`: 未认证
- `404`: 反馈不存在
- `500`: 服务器错误

---

#### GET /api/resonance/feedback/stats - 获取反馈统计

**功能**: 获取当前用户的反馈统计信息

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "total_count": 10,
    "pending_count": 5,
    "reviewed_count": 3,
    "resolved_count": 2,
    "rejected_count": 0,
    "average_rating": 4.5,
    "by_type": {
      "bug": 5,
      "suggestion": 3,
      "praise": 2
    }
  }
}
```

**错误响应**:
- `401`: 未认证
- `500`: 服务器错误

---

### 2. 时空导航缓存API

#### GET /api/timespace/cache - 获取缓存

**功能**: 获取用户的时空导航缓存数据

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `dimension`: 维度（可选）
- `cache_key`: 缓存键（可选）

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "profile_id": "uuid",
    "dimension": "dimension_name",
    "cache_key": "cache_key_1",
    "cache_data": { ... },
    "period_start": "2025-01-01",
    "period_end": "2025-01-31",
    "expires_at": "2025-02-01T00:00:00Z",
    "created_at": "2025-01-30T12:00:00Z",
    "updated_at": "2025-01-30T12:00:00Z"
  }
}
```

**错误响应**:
- `401`: 未认证
- `404`: 缓存不存在或已过期
- `500`: 服务器错误

---

#### POST /api/timespace/cache - 保存缓存

**功能**: 保存用户的时空导航缓存数据

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "dimension": "dimension_name",      // 维度（必需）
  "cache_key": "cache_key_1",         // 缓存键（必需）
  "cache_data": { ... },               // 缓存数据（必需）
  "period_start": "2025-01-01",       // 时间段开始日期（必需，YYYY-MM-DD）
  "period_end": "2025-01-31",         // 时间段结束日期（必需，YYYY-MM-DD）
  "expires_at": "2025-02-01T00:00:00Z" // 过期时间（必需）
}
```

**响应**:
```json
{
  "success": true,
  "message": "缓存保存成功",
  "data": {
    "cache_id": "uuid"
  }
}
```

**错误响应**:
- `400`: 参数错误
- `401`: 未认证
- `404`: 用户不存在
- `500`: 服务器错误

---

#### DELETE /api/timespace/cache - 清除缓存

**功能**: 清除用户的时空导航缓存数据

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `dimension`: 维度（可选，如果提供则只清除该维度的缓存）
- `cache_key`: 缓存键（可选，如果提供则只清除该键的缓存）

**响应**:
```json
{
  "success": true,
  "message": "成功清除 5 条缓存记录",
  "data": {
    "deleted_count": 5
  }
}
```

**错误响应**:
- `401`: 未认证
- `500`: 服务器错误

---

### 3. 签到升级补差API

#### GET /api/checkin/upgrade-bonus/calculate - 计算升级补差

**功能**: 计算用户升级会员等级后需要补发的签到奖励差额

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `new_tier`: 新会员等级（必需，free/basic/premium/vip）
- `upgrade_date`: 升级日期（可选，YYYY-MM-DD格式，默认为今天）

**响应**:
```json
{
  "success": true,
  "data": {
    "eligible_dates": [
      {
        "check_in_date": "2025-01-15",
        "old_tier": "free",
        "new_tier": "basic",
        "base_coins": 10,
        "expected_coins": 15,
        "bonus_coins": 5
      }
    ],
    "total_bonus_coins": 25,
    "upgrade_date": "2025-01-30"
  }
}
```

**说明**:
- 只计算升级日期之前30天内的签到记录
- 只计算新等级奖励高于旧等级奖励的日期
- 如果新等级不高于旧等级，返回空数组和0补差金额

**错误响应**:
- `400`: 参数错误
- `401`: 未认证
- `404`: 用户不存在
- `500`: 服务器错误

---

#### POST /api/checkin/upgrade-bonus/grant - 发放升级补差

**功能**: 发放用户升级会员等级后的签到奖励补差

**请求头**:
```
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "new_tier": "basic",              // 新会员等级（必需，free/basic/premium/vip）
  "upgrade_date": "2025-01-30"      // 升级日期（可选，YYYY-MM-DD格式，默认为今天）
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功补差 25 天机币",
  "data": {
    "total_bonus_coins": 25,
    "granted_count": 5,
    "granted_dates": ["2025-01-15", "2025-01-16", "2025-01-17", "2025-01-18", "2025-01-19"]
  }
}
```

**说明**:
- 使用数据库事务确保原子性
- 自动跳过已经补差过的日期（避免重复补差）
- 补差金额直接加到用户的天机币余额
- 记录补差日志到 `checkin_upgrade_bonus_logs` 表

**错误响应**:
- `400`: 参数错误
- `401`: 未认证
- `404`: 用户不存在
- `500`: 服务器错误

---

## 🗄️ 数据库表结构

### resonance_feedback 表

```sql
CREATE TABLE IF NOT EXISTS public.resonance_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
  metadata JSONB,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**索引**:
- `resonance_feedback_user_id_idx` - 用户ID索引
- `resonance_feedback_status_idx` - 状态索引
- `resonance_feedback_type_idx` - 类型索引
- `resonance_feedback_created_at_idx` - 创建时间索引

---

### checkin_upgrade_bonus_logs 表

```sql
CREATE TABLE IF NOT EXISTS public.checkin_upgrade_bonus_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in_date DATE NOT NULL,
  old_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL,
  base_coins INTEGER NOT NULL,
  bonus_coins INTEGER NOT NULL,
  total_coins INTEGER NOT NULL,
  upgrade_date DATE NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**索引**:
- `checkin_upgrade_bonus_user_id_idx` - 用户ID索引
- `checkin_upgrade_bonus_check_in_date_idx` - 签到日期索引
- `checkin_upgrade_bonus_upgrade_date_idx` - 升级日期索引
- `checkin_upgrade_bonus_created_at_idx` - 创建时间索引
- `checkin_upgrade_bonus_user_date_unique` - 唯一约束（用户ID + 签到日期）

---

## 🔧 核心功能说明

### 1. 签到奖励配置

不同会员等级的签到基础奖励：
- `free`: 10 天机币
- `basic`: 15 天机币
- `premium`: 20 天机币
- `vip`: 30 天机币

连续签到奖励：每连续7天额外奖励10天机币（所有等级相同）

### 2. 升级补差逻辑

1. **计算补差**:
   - 查询升级日期之前30天内的签到记录
   - 计算如果当时是新等级应该获得的奖励
   - 减去已经发放的奖励，得到补差金额

2. **发放补差**:
   - 使用数据库事务确保原子性
   - 检查是否已经补差过（避免重复补差）
   - 发放天机币到用户余额
   - 记录补差日志

### 3. 缓存管理

- 使用 UPSERT 操作（唯一约束是 `user_id, profile_id, dimension, period_start`）
- 自动检查过期时间，只返回未过期的缓存
- 支持按维度或缓存键清除缓存

---

## 📝 使用示例

### 提交反馈

```bash
curl -X POST http://localhost:3000/api/resonance/feedback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_type": "bug",
    "content": "发现了一个bug",
    "rating": 4
  }'
```

### 获取缓存

```bash
curl -X GET "http://localhost:3000/api/timespace/cache?dimension=dimension1&cache_key=key1" \
  -H "Authorization: Bearer <token>"
```

### 计算升级补差

```bash
curl -X GET "http://localhost:3000/api/checkin/upgrade-bonus/calculate?new_tier=basic&upgrade_date=2025-01-30" \
  -H "Authorization: Bearer <token>"
```

---

## ⚠️ 注意事项

1. **数据库迁移**: 在部署前需要先执行数据库迁移脚本
   - `scripts/migration-create-resonance-feedback-table.sql`
   - `scripts/migration-create-checkin-upgrade-bonus-table.sql`

2. **认证要求**: 所有API端点都需要Bearer Token认证

3. **升级补差**: 
   - 只计算升级日期之前30天内的签到记录
   - 如果新等级不高于旧等级，不会产生补差
   - 已补差过的日期不会重复补差

4. **缓存过期**: 时空导航缓存会自动检查过期时间，过期缓存不会被返回

---

## ✅ 测试建议

1. **共振反馈API**:
   - 测试提交不同类型的反馈
   - 测试查询反馈状态
   - 测试获取反馈统计

2. **时空导航缓存API**:
   - 测试保存和获取缓存
   - 测试缓存过期机制
   - 测试清除缓存功能

3. **签到升级补差API**:
   - 测试计算补差（不同会员等级）
   - 测试发放补差（验证天机币余额变化）
   - 测试重复补差保护机制

---

## 📚 相关文件

- 数据库迁移脚本: `scripts/migration-create-*.sql`
- 服务层: `src/services/resonance.service.ts`, `src/services/timespace.service.ts`, `src/services/checkin-upgrade.service.ts`
- 控制器层: `src/controllers/resonance.controller.ts`, `src/controllers/timespace.controller.ts`, `src/controllers/checkin-upgrade.controller.ts`
- 路由层: `src/routes/resonance.routes.ts`, `src/routes/timespace.routes.ts`, `src/routes/checkin.routes.ts`
- 应用配置: `src/app.ts`

---

**状态**: ✅ **所有API已完整实现并注册**

# 紫微斗数 API 测试文档

**创建时间**: 2025年1月30日  
**API 版本**: v1.0  
**测试状态**: 待测试

---

## 📋 测试概述

本文档用于测试紫微斗数 API 的所有功能，包括：
1. 命盘存档（保存/更新命盘结构）
2. 查询命盘结构
3. 更新简要分析缓存
4. 解锁时空资产（需要扣费）
5. 查询已解锁的时空资产
6. 检查时间段是否已解锁
7. 保存/更新缓存数据
8. 查询缓存数据

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

### 2. 确保用户有足够的天机币

解锁时空资产需要消耗天机币，请确保用户有足够的余额：

```bash
# 查询余额
GET http://localhost:3000/api/coins/balance
Authorization: Bearer <TOKEN>

# 如果余额不足，可以通过管理员调整或购买
```

---

## 🧪 测试用例

### 测试 1: 保存命盘结构 ✅

**测试目标**: 验证保存命盘结构功能

**请求**:
```bash
POST http://localhost:3000/api/astrology/star-chart
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "chart_structure": {
    "birth_date": "1990-01-01",
    "birth_time": "12:00:00",
    "gender": "male",
    "stars": {
      "ziwei": "ziwei",
      "tianji": "tianji",
      "taiyang": "taiyang"
    },
    "palaces": {
      "ming": "ming",
      "fu": "fu",
      "cai": "cai"
    }
  },
  "brief_analysis_cache": {
    "summary": "命盘分析摘要",
    "key_points": ["要点1", "要点2"]
  }
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "命盘保存成功",
  "data": {
    "profile_id": "uuid"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `profile_id`
- ✅ 命盘数据已保存到数据库

---

### 测试 2: 查询命盘结构 ✅

**测试目标**: 验证查询命盘结构功能

**请求**:
```bash
GET http://localhost:3000/api/astrology/star-chart
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "profile_id": "uuid",
    "chart_structure": {
      "birth_date": "1990-01-01",
      "birth_time": "12:00:00",
      "gender": "male",
      "stars": {
        "ziwei": "ziwei",
        "tianji": "tianji",
        "taiyang": "taiyang"
      },
      "palaces": {
        "ming": "ming",
        "fu": "fu",
        "cai": "cai"
      }
    },
    "brief_analysis_cache": {
      "summary": "命盘分析摘要",
      "key_points": ["要点1", "要点2"]
    },
    "created_at": "2025-01-30T12:00:00Z",
    "updated_at": "2025-01-30T12:00:00Z"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回完整的命盘数据
- ✅ 包含 `chart_structure` 和 `brief_analysis_cache`

**如果命盘不存在** (404 Not Found):
```json
{
  "success": false,
  "error": "命盘不存在"
}
```

---

### 测试 3: 更新简要分析缓存 ✅

**测试目标**: 验证更新简要分析缓存功能

**请求**:
```bash
PUT http://localhost:3000/api/astrology/star-chart/brief-analysis
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "brief_analysis_cache": {
    "summary": "更新后的命盘分析摘要",
    "key_points": ["更新要点1", "更新要点2", "更新要点3"],
    "updated_at": "2025-01-30T13:00:00Z"
  }
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "简要分析缓存更新成功",
  "data": {
    "profile_id": "uuid"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `profile_id`
- ✅ 缓存数据已更新

**如果命盘不存在** (404 Not Found):
```json
{
  "success": false,
  "error": "命盘不存在",
  "message": "命盘不存在，请先保存命盘"
}
```

---

### 测试 4: 解锁时空资产（需要扣费）✅

**测试目标**: 验证解锁时空资产功能（需要消耗天机币）

**请求**:
```bash
POST http://localhost:3000/api/astrology/time-assets/unlock
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "dimension": "year",
  "period_start": "2025-01-01",
  "period_end": "2025-12-31",
  "period_type": "year",
  "expires_at": "2026-01-01T00:00:00Z",
  "cost_coins": 10
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "时空资产解锁成功",
  "data": {
    "asset_id": "uuid",
    "remaining_balance": 90
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `asset_id`
- ✅ 返回 `remaining_balance`（扣费后的余额）
- ✅ 天机币已扣除
- ✅ 解锁记录已创建

**如果余额不足** (400 Bad Request):
```json
{
  "success": false,
  "error": "余额不足",
  "message": "余额不足，无法解锁"
}
```

**如果已解锁** (400 Bad Request):
```json
{
  "success": false,
  "error": "已解锁",
  "message": "该时间段已解锁"
}
```

**保存资产ID** 用于后续测试：
```bash
export ASSET_ID="uuid"
```

---

### 测试 5: 查询已解锁的时空资产 ✅

**测试目标**: 验证查询已解锁的时空资产功能

**请求**:
```bash
# 查询所有已解锁的资产
GET http://localhost:3000/api/astrology/time-assets?limit=50&offset=0
Authorization: Bearer <TOKEN>

# 查询特定维度的资产
GET http://localhost:3000/api/astrology/time-assets?dimension=year&limit=50&offset=0
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "profile_id": "uuid",
        "dimension": "year",
        "period_start": "2025-01-01",
        "period_end": "2025-12-31",
        "period_type": "year",
        "unlocked_at": "2025-01-30T12:00:00Z",
        "expires_at": "2026-01-01T00:00:00Z",
        "cost_coins": 10,
        "is_active": true,
        "created_at": "2025-01-30T12:00:00Z",
        "updated_at": "2025-01-30T12:00:00Z"
      }
    ],
    "limit": 50,
    "offset": 0,
    "count": 1
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回资产列表
- ✅ 只返回激活的资产（`is_active: true`）
- ✅ 按解锁时间倒序排列

---

### 测试 6: 检查时间段是否已解锁 ✅

**测试目标**: 验证检查时间段是否已解锁功能

**请求**:
```bash
GET http://localhost:3000/api/astrology/time-assets/check?dimension=year&period_start=2025-01-01&period_end=2025-12-31
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "is_unlocked": true
  }
}
```

**如果未解锁**:
```json
{
  "success": true,
  "data": {
    "is_unlocked": false
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `is_unlocked` 布尔值
- ✅ 只检查未过期的资产

---

### 测试 7: 保存/更新缓存数据 ✅

**测试目标**: 验证保存/更新缓存数据功能

**请求**:
```bash
POST http://localhost:3000/api/astrology/cache
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "dimension": "year",
  "cache_key": "yearly_analysis_2025",
  "cache_data": {
    "analysis": "2025年运势分析",
    "key_events": ["事件1", "事件2"],
    "recommendations": ["建议1", "建议2"]
  },
  "period_start": "2025-01-01",
  "period_end": "2025-12-31",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "message": "缓存保存成功",
  "data": {
    "cache_id": "uuid"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回 `cache_id`
- ✅ 缓存数据已保存

**保存缓存ID** 用于后续测试：
```bash
export CACHE_ID="uuid"
```

---

### 测试 8: 查询缓存数据 ✅

**测试目标**: 验证查询缓存数据功能

**请求**:
```bash
# 基本查询
GET http://localhost:3000/api/astrology/cache?dimension=year&cache_key=yearly_analysis_2025
Authorization: Bearer <TOKEN>

# 带时间段的查询
GET http://localhost:3000/api/astrology/cache?dimension=year&cache_key=yearly_analysis_2025&period_start=2025-01-01&period_end=2025-12-31
Authorization: Bearer <TOKEN>
```

**预期响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "profile_id": "uuid",
    "dimension": "year",
    "cache_key": "yearly_analysis_2025",
    "cache_data": {
      "analysis": "2025年运势分析",
      "key_events": ["事件1", "事件2"],
      "recommendations": ["建议1", "建议2"]
    },
    "period_start": "2025-01-01",
    "period_end": "2025-12-31",
    "expires_at": "2026-01-01T00:00:00Z",
    "created_at": "2025-01-30T12:00:00Z",
    "updated_at": "2025-01-30T12:00:00Z"
  }
}
```

**验证点**:
- ✅ 返回状态码 200
- ✅ `success` 为 `true`
- ✅ 返回完整的缓存数据
- ✅ 只返回未过期的缓存（`expires_at > NOW()`）

**如果缓存不存在或已过期** (404 Not Found):
```json
{
  "success": false,
  "error": "缓存不存在或已过期"
}
```

---

## 🚨 错误处理测试

### 测试 9: 参数验证错误 ✅

**测试目标**: 验证参数验证功能

**请求** (缺少必需参数):
```bash
POST http://localhost:3000/api/astrology/star-chart
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "brief_analysis_cache": {}
}
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "参数错误",
  "message": "命盘结构数据必须提供"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ 返回明确的错误消息

---

### 测试 10: 未认证请求 ✅

**测试目标**: 验证认证保护功能

**请求** (无 Token):
```bash
GET http://localhost:3000/api/astrology/star-chart
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
- ✅ 返回认证错误

---

### 测试 11: 日期格式验证 ✅

**测试目标**: 验证日期格式验证功能

**请求** (错误的日期格式):
```bash
POST http://localhost:3000/api/astrology/time-assets/unlock
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "dimension": "year",
  "period_start": "2025/01/01",
  "period_end": "2025-12-31",
  "period_type": "year",
  "expires_at": "2026-01-01T00:00:00Z",
  "cost_coins": 10
}
```

**预期响应** (400 Bad Request):
```json
{
  "success": false,
  "error": "参数错误",
  "message": "参数错误：日期格式必须为 YYYY-MM-DD"
}
```

**验证点**:
- ✅ 返回状态码 400
- ✅ `success` 为 `false`
- ✅ 返回日期格式错误消息

---

## 📊 测试总结

### 测试用例统计

| 测试用例 | 测试目标 | 状态 |
|---------|---------|------|
| 测试 1 | 保存命盘结构 | ⏳ 待测试 |
| 测试 2 | 查询命盘结构 | ⏳ 待测试 |
| 测试 3 | 更新简要分析缓存 | ⏳ 待测试 |
| 测试 4 | 解锁时空资产 | ⏳ 待测试 |
| 测试 5 | 查询已解锁的时空资产 | ⏳ 待测试 |
| 测试 6 | 检查时间段是否已解锁 | ⏳ 待测试 |
| 测试 7 | 保存/更新缓存数据 | ⏳ 待测试 |
| 测试 8 | 查询缓存数据 | ⏳ 待测试 |
| 测试 9 | 参数验证错误 | ⏳ 待测试 |
| 测试 10 | 未认证请求 | ⏳ 待测试 |
| 测试 11 | 日期格式验证 | ⏳ 待测试 |

### 验收标准

- ✅ 所有 API 端点正常工作
- ✅ 参数验证正确
- ✅ 错误处理完善
- ✅ 认证保护有效
- ✅ 数据库操作正确
- ✅ 扣费逻辑正确（解锁时空资产）
- ✅ 缓存过期检查正确

---

## 📝 测试注意事项

1. **测试顺序**: 建议按照测试用例的顺序进行测试，因为某些测试依赖前面的结果
2. **天机币余额**: 解锁时空资产需要消耗天机币，请确保用户有足够的余额
3. **日期格式**: 所有日期必须使用 `YYYY-MM-DD` 格式
4. **认证 Token**: 所有 API 都需要认证，请确保 Token 有效
5. **数据清理**: 测试完成后可以手动清理测试数据，或使用管理员API删除

---

**最后更新**: 2025年1月30日  
**测试人员**: 待填写  
**测试结果**: 待测试

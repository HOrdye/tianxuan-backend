# 后端 API 开发提示词 - 任务系统

## 📋 概述

前端已迁移到使用后端 API，不再直接访问 Supabase。需要实现以下任务相关的 API 接口。

## 🎯 需要实现的 API 接口

### 1. 获取用户所有任务状态

**接口**: `GET /api/tasks`

**功能**: 获取当前登录用户的所有任务状态

**请求头**:
```
Authorization: Bearer {token}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "task_type": "complete_first_chart",
        "task_status": "pending" | "completed" | "claimed",
        "completed_at": "2025-01-01T00:00:00Z",
        "claimed_at": "2025-01-01T00:00:00Z",
        "coins_rewarded": 100,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z"
      }
    ]
  },
  "message": "获取成功"
}
```

**数据库表**: `user_tasks`

**SQL 查询示例**:
```sql
SELECT * FROM user_tasks 
WHERE user_id = $1 
ORDER BY created_at ASC;
```

---

### 2. 完成任务

**接口**: `POST /api/tasks/complete`

**功能**: 标记任务为已完成

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "taskType": "complete_first_chart"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "uuid",
      "user_id": "uuid",
      "task_type": "complete_first_chart",
      "task_status": "completed",
      "completed_at": "2025-01-01T00:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    "alreadyCompleted": false
  },
  "message": "任务已完成"
}
```

**业务逻辑**:
1. 检查任务是否已存在且已完成，如果是则返回 `alreadyCompleted: true`
2. 如果不存在，创建新记录（状态为 `completed`）
3. 如果存在但未完成，更新状态为 `completed`，设置 `completed_at`
4. 使用 `UPSERT` 操作，冲突键为 `(user_id, task_type)`

**SQL 示例**:
```sql
INSERT INTO user_tasks (user_id, task_type, task_status, completed_at)
VALUES ($1, $2, 'completed', NOW())
ON CONFLICT (user_id, task_type)
DO UPDATE SET 
  task_status = 'completed',
  completed_at = NOW(),
  updated_at = NOW()
RETURNING *;
```

---

### 3. 领取任务奖励

**接口**: `POST /api/tasks/claim`

**功能**: 领取已完成任务的奖励（天机币）

**请求头**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体**:
```json
{
  "taskType": "complete_first_chart"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "coinsGranted": 100
  },
  "message": "奖励已领取"
}
```

**业务逻辑**:
1. 检查任务是否存在，不存在则返回错误
2. 检查任务状态是否为 `completed`，不是则返回错误
3. 检查任务是否已领取（`task_status === 'claimed'`），如果是则返回已领取的币数
4. 获取任务奖励配置（从 `TASK_DEFINITIONS` 或数据库配置表）
5. 如果奖励为 0，直接标记为已领取，不发放币
6. 如果奖励 > 0，调用天机币发放接口（使用现有的 coins API）
7. 更新任务状态为 `claimed`，设置 `claimed_at` 和 `coins_rewarded`

**天机币发放**:
- 使用现有的天机币发放接口（如 `POST /api/coins/grant`）
- 来源类型：`activity`（活动奖励）
- 确保并发安全（使用数据库事务或锁）

**SQL 示例**:
```sql
-- 1. 检查任务状态
SELECT * FROM user_tasks 
WHERE user_id = $1 AND task_type = $2;

-- 2. 发放天机币（使用现有的天机币发放逻辑）
-- 3. 更新任务状态
UPDATE user_tasks 
SET 
  task_status = 'claimed',
  claimed_at = NOW(),
  coins_rewarded = $3,
  updated_at = NOW()
WHERE id = $4;
```

---

### 4. 初始化新用户任务

**接口**: `POST /api/tasks/initialize`

**功能**: 为新注册用户初始化所有任务记录（注册时调用）

**请求头**:
```
Authorization: Bearer {token}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "success": true
  },
  "message": "任务初始化成功"
}
```

**业务逻辑**:
1. 获取所有任务类型（从 `TASK_DEFINITIONS` 或数据库配置表）
2. 为每个任务类型创建一条记录，初始状态为 `pending`
3. 使用批量插入，忽略已存在的记录（避免重复初始化）

**任务类型列表**（参考前端 `TASK_DEFINITIONS`）:
- `complete_first_chart` - 定锚本命
- `complete_profile_info` - 校准心性
- `complete_first_insight` - 首次推演
- `view_daily_fortune` - 每日汲气
- `share_profile` - 分享命盘
- `complete_mbti_test` - 心性测试
- `recharge_first_time` - 首次充值

**SQL 示例**:
```sql
INSERT INTO user_tasks (user_id, task_type, task_status)
SELECT $1, unnest(ARRAY[
  'complete_first_chart',
  'complete_profile_info',
  'complete_first_insight',
  'view_daily_fortune',
  'share_profile',
  'complete_mbti_test',
  'recharge_first_time'
]), 'pending'
ON CONFLICT (user_id, task_type) DO NOTHING;
```

---

### 5. 获取任务完成进度

**接口**: `GET /api/tasks/progress`

**功能**: 获取用户任务完成进度统计

**请求头**:
```
Authorization: Bearer {token}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "total": 7,
    "completed": 3,
    "claimed": 2,
    "progress": 43
  },
  "message": "获取成功"
}
```

**业务逻辑**:
1. 统计总任务数（从 `TASK_DEFINITIONS` 或数据库配置表）
2. 统计已完成任务数（`task_status IN ('completed', 'claimed')`）
3. 统计已领取任务数（`task_status = 'claimed'`）
4. 计算进度百分比：`Math.round((completed / total) * 100)`

**SQL 示例**:
```sql
SELECT 
  COUNT(*) FILTER (WHERE task_status IN ('completed', 'claimed')) as completed,
  COUNT(*) FILTER (WHERE task_status = 'claimed') as claimed
FROM user_tasks
WHERE user_id = $1;
```

---

## 🔒 安全要求

1. **身份验证**: 所有接口都需要 JWT token 验证
2. **用户隔离**: 确保用户只能访问自己的任务数据
3. **并发安全**: 领取奖励时使用数据库事务，防止重复领取
4. **数据验证**: 验证 `taskType` 是否为有效值

## 📊 数据库表结构

**表名**: `user_tasks`

```sql
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- 注意：这里应该是后端生成的用户ID，不是 Supabase auth.users.id
  task_type TEXT NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'completed', 'claimed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  coins_rewarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_type)
);

CREATE INDEX IF NOT EXISTS user_tasks_user_id_idx ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS user_tasks_status_idx ON user_tasks(task_status);
```

**注意**: 
- `user_id` 字段应该使用后端生成的用户ID（不是 Supabase auth.users.id）
- 如果后端用户表与 Supabase 用户表不同，需要确保外键关系正确

## 🧪 测试建议

1. **单元测试**: 测试每个接口的业务逻辑
2. **集成测试**: 测试任务完成 -> 领取奖励的完整流程
3. **并发测试**: 测试同时领取奖励时的并发安全性
4. **边界测试**: 测试已领取任务再次领取、不存在的任务类型等

## 📝 注意事项

1. **任务类型**: 任务类型列表应该与前端 `TASK_DEFINITIONS` 保持一致
2. **奖励配置**: 任务奖励金额应该与前端配置一致，建议存储在数据库配置表中
3. **错误处理**: 返回清晰的错误信息，便于前端调试
4. **日志记录**: 记录任务完成和奖励领取的操作日志，便于审计

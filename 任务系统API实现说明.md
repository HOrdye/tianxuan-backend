# 任务系统 API 实现说明

**创建时间**: 2026年1月11日  
**状态**: ✅ **已完成**

---

## 📋 实现概述

已成功实现任务系统的所有 API 接口，包括：

1. ✅ 获取用户所有任务状态 - `GET /api/tasks`
2. ✅ 完成任务 - `POST /api/tasks/complete`
3. ✅ 领取任务奖励 - `POST /api/tasks/claim`
4. ✅ 初始化新用户任务 - `POST /api/tasks/initialize`
5. ✅ 获取任务完成进度 - `GET /api/tasks/progress`

---

## 📁 创建的文件

### 1. 服务层
- **文件**: `src/services/task.service.ts`
- **功能**: 实现任务相关的业务逻辑
- **主要函数**:
  - `getUserTasks()` - 获取用户所有任务
  - `completeTask()` - 完成任务
  - `claimTaskReward()` - 领取任务奖励
  - `initializeUserTasks()` - 初始化新用户任务
  - `getTaskProgress()` - 获取任务进度

### 2. 控制器层
- **文件**: `src/controllers/task.controller.ts`
- **功能**: 处理 HTTP 请求和响应
- **主要函数**:
  - `getUserTasks()` - 获取用户任务控制器
  - `completeTask()` - 完成任务控制器
  - `claimTaskReward()` - 领取奖励控制器
  - `initializeUserTasks()` - 初始化任务控制器
  - `getTaskProgress()` - 获取进度控制器

### 3. 路由层
- **文件**: `src/routes/task.routes.ts`
- **功能**: 定义 API 路由
- **路由**:
  - `GET /api/tasks` - 获取用户所有任务
  - `POST /api/tasks/complete` - 完成任务
  - `POST /api/tasks/claim` - 领取奖励
  - `POST /api/tasks/initialize` - 初始化任务
  - `GET /api/tasks/progress` - 获取进度

### 4. 数据库迁移脚本
- **文件**: `scripts/migration-create-user-tasks-table.sql`
- **功能**: 创建 `user_tasks` 表

### 5. 应用配置
- **文件**: `src/app.ts` (已更新)
- **变更**: 注册了任务路由 `/api/tasks`

---

## 🔧 核心功能说明

### 1. 任务类型和奖励配置

任务类型定义在 `task.service.ts` 中：

```typescript
export const TASK_TYPES = [
  'complete_first_chart',      // 定锚本命
  'complete_profile_info',     // 校准心性
  'complete_first_insight',    // 首次推演
  'view_daily_fortune',        // 每日汲气
  'share_profile',             // 分享命盘
  'complete_mbti_test',       // 心性测试
  'recharge_first_time',       // 首次充值
] as const;

export const TASK_REWARDS: Record<TaskType, number> = {
  complete_first_chart: 100,      // 100 天机币
  complete_profile_info: 50,      // 50 天机币
  complete_first_insight: 50,     // 50 天机币
  view_daily_fortune: 10,         // 10 天机币
  share_profile: 20,              // 20 天机币
  complete_mbti_test: 30,         // 30 天机币
  recharge_first_time: 200,       // 200 天机币
};
```

**注意**: 奖励配置应该与前端 `TASK_DEFINITIONS` 保持一致。

### 2. 任务状态流转

```
pending → completed → claimed
  ↓         ↓           ↓
待完成    已完成      已领取
```

### 3. 并发安全

- **完成任务**: 使用 `UPSERT` 操作，冲突键为 `(user_id, task_type)`
- **领取奖励**: 使用数据库事务和行锁（`FOR UPDATE`），防止重复领取

### 4. 天机币发放

- 任务奖励直接加到 `profiles.tianji_coins_balance` 字段
- 使用数据库事务确保原子性
- 奖励金额为 0 时，只标记为已领取，不发放币

---

## 🗄️ 数据库表结构

**表名**: `user_tasks`

```sql
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'completed', 'claimed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  coins_rewarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_type)
);
```

**索引**:
- `user_tasks_user_id_idx` - 用户ID索引
- `user_tasks_status_idx` - 状态索引
- `user_tasks_task_type_idx` - 任务类型索引

---

## 🚀 部署步骤

### 1. 创建数据库表

执行 SQL 迁移脚本：

```bash
psql -U your_user -d your_database -f scripts/migration-create-user-tasks-table.sql
```

或者使用 DBeaver 等工具执行 `scripts/migration-create-user-tasks-table.sql` 文件。

### 2. 重启后端服务

重启后端服务以加载新的路由和代码：

```bash
# 如果使用 PM2
pm2 restart backend

# 如果使用 npm
npm run dev
```

### 3. 验证 API

使用 Postman 或 curl 测试 API：

```bash
# 获取用户任务
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>"

# 完成任务
curl -X POST http://localhost:3000/api/tasks/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskType": "complete_first_chart"}'

# 领取奖励
curl -X POST http://localhost:3000/api/tasks/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"taskType": "complete_first_chart"}'
```

---

## 🧪 测试建议

### 1. 单元测试

- 测试每个服务函数的业务逻辑
- 测试参数验证
- 测试错误处理

### 2. 集成测试

- 测试任务完成 → 领取奖励的完整流程
- 测试初始化任务功能
- 测试任务进度统计

### 3. 并发测试

- 测试同时领取奖励时的并发安全性
- 验证不会重复发放奖励

### 4. 边界测试

- 测试已领取任务再次领取
- 测试不存在的任务类型
- 测试未完成任务直接领取奖励

---

## ⚠️ 注意事项

### 1. 任务类型一致性

- 后端 `TASK_TYPES` 和 `TASK_REWARDS` 应该与前端 `TASK_DEFINITIONS` 保持一致
- 如果前端添加了新任务类型，后端也需要同步更新

### 2. 奖励配置

- 建议将奖励配置存储在数据库配置表中，便于动态调整
- 当前实现使用硬编码配置，需要修改代码才能调整奖励

### 3. 用户注册时初始化

- 建议在用户注册时自动调用 `POST /api/tasks/initialize`
- 或者在注册服务中直接调用 `taskService.initializeUserTasks()`

### 4. 错误处理

- 所有接口都返回清晰的错误信息
- 错误信息包含在 `error` 字段中，便于前端调试

### 5. 日志记录

- 任务完成和奖励领取操作已记录日志
- 建议在生产环境中添加更详细的审计日志

---

## 📝 API 使用示例

### 示例 1: 获取用户所有任务

```typescript
// 前端代码
const response = await fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
// data.data.tasks 包含所有任务
```

### 示例 2: 完成任务

```typescript
// 前端代码
const response = await fetch('/api/tasks/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    taskType: 'complete_first_chart'
  })
});

const data = await response.json();
// data.data.task 包含更新后的任务
// data.data.alreadyCompleted 表示是否已经完成过
```

### 示例 3: 领取奖励

```typescript
// 前端代码
const response = await fetch('/api/tasks/claim', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    taskType: 'complete_first_chart'
  })
});

const data = await response.json();
// data.data.coinsGranted 包含发放的天机币数量
```

---

## 🔗 相关文档

- [后端API开发提示词-任务系统.md](./后端API开发提示词-任务系统.md) - 原始需求文档
- [数据库迁移脚本](./scripts/migration-create-user-tasks-table.sql) - 数据库表创建脚本

---

**维护者**: 开发团队  
**最后更新**: 2026年1月11日

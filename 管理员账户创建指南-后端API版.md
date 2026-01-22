# 管理员账户创建指南（后端 API 版本）

## 📋 概述

本文档说明如何通过**后端 API**创建管理员账户。系统已迁移到独立后端，不再使用 Supabase Dashboard。

---

## 🔧 后端需要实现的功能

### 1. 创建管理员账户 API（必须实现）

**API 端点**：`PUT /api/admin/users/:userId/role`

**功能**：设置用户角色（管理员或普通用户）

**请求**：
```http
PUT /api/admin/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"  // 或 "user"
}
```

**响应**：
```json
{
  "success": true,
  "message": "用户角色更新成功",
  "data": {
    "userId": "uuid",
    "role": "admin"
  }
}
```

**权限要求**：
- ⚠️ **第一个管理员账户**：需要特殊处理（见下方"创建第一个管理员账户"）
- ✅ **后续管理员账户**：需要现有管理员权限

---

## 👤 创建管理员账户的方法

### 方法一：通过后端 API 直接调用（推荐）

**适用场景**：已有管理员账户，通过 API 设置新管理员

**步骤**：

1. **使用现有管理员账户登录**，获取 Token
2. **调用 API 设置管理员**：

```bash
# 设置用户为管理员
curl -X PUT "http://localhost:3000/api/admin/users/{userId}/role" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

**注意事项**：
- ✅ 需要管理员权限
- ✅ 通过后端 API，统一管理
- ⚠️ 第一个管理员账户无法使用此方法（见方法二）

---

### 方法二：通过数据库直接设置（创建第一个管理员）

**适用场景**：创建第一个管理员账户（此时还没有管理员）

**步骤**：

1. **连接到 PostgreSQL 数据库**
   ```bash
   # 如果使用 Docker
   docker exec -it <postgres-container> psql -U <username> -d <database>
   
   # 或直接连接
   psql -h localhost -U <username> -d <database>
   ```

2. **查找用户ID或邮箱**
   ```sql
   -- 查看所有用户
   SELECT id, email, username, role 
   FROM public.profiles 
   ORDER BY created_at DESC;
   ```

3. **设置第一个管理员**
   ```sql
   -- 方式1：通过邮箱设置（推荐）
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-admin-email@example.com';
   
   -- 方式2：通过用户ID设置
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE id = 'user-uuid-here';
   ```

4. **验证设置成功**
   ```sql
   SELECT id, email, username, role 
   FROM public.profiles 
   WHERE role = 'admin';
   ```

**注意事项**：
- ⚠️ 需要数据库管理员权限
- ✅ 这是创建第一个管理员账户的唯一方法
- ✅ 设置后即可使用该账户通过方法一创建其他管理员

---

### 方法三：通过前端用户管理页面（如果已有管理员）

**适用场景**：已有管理员账户，通过前端界面设置

**步骤**：

1. **使用管理员账户登录**
2. **访问用户管理页面**：`/admin/users`
3. **找到目标用户**
4. **点击"设为管理员"按钮**

**注意事项**：
- ⚠️ 需要先有一个管理员账户才能使用此方法
- ✅ 最用户友好的方式
- ✅ 前端会调用 `PUT /api/admin/users/:userId/role` API

---

## 🔍 验证管理员账户

### 1. 数据库验证

```sql
-- 查看所有管理员
SELECT id, email, username, role, created_at 
FROM public.profiles 
WHERE role = 'admin';
```

### 2. 前端验证

1. **使用管理员账户登录**
2. **访问管理员页面**：`/admin`
3. **检查是否能访问**：
   - 用户管理页面
   - 天机币流水页面
   - 资金流水页面

### 3. API 验证

使用管理员账户的 token 调用管理员 API：

```bash
# 获取用户列表（需要管理员权限）
curl -X GET "http://localhost:3000/api/admin/users" \
  -H "Authorization: Bearer <admin-token>"
```

---

## 🛡️ 后端实现检查清单

### 必须实现的管理员 API

- ✅ `GET /api/admin/users` - 用户列表（需要管理员权限）
- ✅ `GET /api/admin/users/:userId` - 用户详情（需要管理员权限）
- ✅ `PUT /api/admin/users/:userId/tier` - 修改用户等级（需要管理员权限）
- ✅ `PUT /api/admin/users/:userId/coins` - 调整用户天机币（需要管理员权限）
- ✅ `PUT /api/admin/users/:userId/role` - **设置用户角色（需要管理员权限）** ⚠️ **必须实现**
- ✅ `GET /api/admin/coin-transactions` - 天机币流水（需要管理员权限）
- ✅ `GET /api/admin/payment-transactions` - 资金流水（需要管理员权限）
- ✅ `GET /api/admin/stats/overview` - 数据统计（需要管理员权限）

### 管理员权限检查中间件

后端需要实现管理员权限检查中间件：

```typescript
// backend/src/middleware/admin.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../config/database';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.id; // 从认证中间件获取用户ID
    
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: '未认证' 
      });
    }
    
    // 查询用户角色
    const result = await db.query(
      'SELECT role FROM public.profiles WHERE id = $1',
      [userId]
    );
    
    if (!result.rows[0] || result.rows[0].role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: '需要管理员权限' 
      });
    }
    
    next();
  } catch (error) {
    console.error('管理员权限检查失败:', error);
    return res.status(500).json({ 
      success: false,
      error: '权限检查失败' 
    });
  }
}
```

### 设置用户角色 API 实现示例

```typescript
// backend/src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { db } from '../config/database';

export async function updateUserRole(
  req: Request,
  res: Response
) {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const operatorId = (req as any).user?.id; // 操作人ID
    
    // 验证角色值
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({
        success: false,
        error: '无效的角色值，必须是 "admin" 或 "user"'
      });
    }
    
    // 检查操作人是否为管理员
    const operatorResult = await db.query(
      'SELECT role FROM public.profiles WHERE id = $1',
      [operatorId]
    );
    
    if (!operatorResult.rows[0] || operatorResult.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '需要管理员权限'
      });
    }
    
    // 检查目标用户是否存在
    const userResult = await db.query(
      'SELECT id FROM public.profiles WHERE id = $1',
      [userId]
    );
    
    if (!userResult.rows[0]) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }
    
    // 更新用户角色
    await db.query(
      'UPDATE public.profiles SET role = $1 WHERE id = $2',
      [role, userId]
    );
    
    res.json({
      success: true,
      message: '用户角色更新成功',
      data: {
        userId,
        role
      }
    });
  } catch (error) {
    console.error('更新用户角色失败:', error);
    res.status(500).json({
      success: false,
      error: '更新用户角色失败'
    });
  }
}
```

### 路由注册示例

```typescript
// backend/src/routes/admin.routes.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { updateUserRole } from '../controllers/admin.controller';

const router = express.Router();

// 设置用户角色（需要管理员权限）
router.put(
  '/users/:userId/role',
  authenticateToken,
  requireAdmin,
  updateUserRole
);

export default router;
```

---

## 🚨 特殊处理：创建第一个管理员账户

### 问题

第一个管理员账户无法通过 API 创建，因为：
- API 需要管理员权限
- 此时还没有管理员账户

### 解决方案

**方案一：数据库直接设置（推荐）**

```sql
-- 1. 先注册一个普通用户账户（通过前端注册）
-- 2. 然后通过数据库设置该用户为管理员
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'first-admin@example.com';
```

**方案二：后端启动脚本**

创建一个后端启动脚本，自动设置第一个管理员：

```typescript
// backend/scripts/create-first-admin.ts
import { db } from '../src/config/database';

async function createFirstAdmin(email: string) {
  try {
    const result = await db.query(
      'UPDATE public.profiles SET role = $1 WHERE email = $2 RETURNING id, email, role',
      ['admin', email]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ 用户不存在:', email);
      return;
    }
    
    console.log('✅ 第一个管理员账户创建成功:', result.rows[0]);
  } catch (error) {
    console.error('❌ 创建管理员账户失败:', error);
  }
}

// 使用方式：npm run create-admin -- email@example.com
const email = process.argv[2];
if (email) {
  createFirstAdmin(email);
} else {
  console.error('请提供邮箱地址');
}
```

**方案三：环境变量配置**

在 `.env` 文件中配置第一个管理员邮箱，后端启动时自动设置：

```env
FIRST_ADMIN_EMAIL=admin@example.com
```

---

## 📝 常见问题

### Q1: 如何撤销管理员权限？

```bash
# 通过 API
curl -X PUT "http://localhost:3000/api/admin/users/{userId}/role" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "user"}'
```

### Q2: 忘记管理员账户怎么办？

1. 通过数据库直接设置新的管理员：
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'new-admin@example.com';
   ```

### Q3: 如何批量设置管理员？

```bash
# 需要循环调用 API，或通过数据库批量设置
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com'
);
```

---

## ✅ 快速开始

**最快创建第一个管理员账户的方法**：

1. **通过前端注册一个普通用户账户**
2. **连接到数据库**：
   ```bash
   docker exec -it <postgres-container> psql -U <username> -d <database>
   ```
3. **设置管理员**：
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```
4. **使用该邮箱登录前端，即可访问管理员后台！**

---

## 📚 相关文件

- `backend/src/controllers/admin.controller.ts` - 管理员控制器（需要创建）
- `backend/src/routes/admin.routes.ts` - 管理员路由（需要创建）
- `backend/src/middleware/admin.middleware.ts` - 管理员权限检查中间件（需要创建）
- `src/api/modules/admin.ts` - 前端管理员 API 模块（已实现）
- `src/views/admin/UserManagement.vue` - 用户管理页面（已迁移）

---

**最后更新**：2025-01-30  
**版本**：后端 API 版本（不再使用 Supabase Dashboard）

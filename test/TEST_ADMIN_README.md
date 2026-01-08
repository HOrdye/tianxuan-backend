# 管理员后台 API 测试说明

## ⚠️ 重要提示

**服务器需要重启才能加载新的管理员路由！**

如果测试时遇到 404 错误，请按以下步骤操作：

### 1. 重启服务器

```bash
# 如果使用 PM2
pm2 restart tianxuan-backend

# 如果使用 npm run dev
# 停止当前进程（Ctrl+C），然后重新启动
cd /opt/tianxuan/backend
npm run dev
```

### 2. 验证路由已加载

```bash
# 测试管理员路由（应该返回401未认证，而不是404）
curl http://localhost:3000/api/admin/users

# 如果返回 404，说明路由未加载，需要重启服务器
# 如果返回 401，说明路由已加载，可以继续测试
```

### 3. 准备管理员账号

**方法1：创建新管理员账号**

```bash
# 1. 注册账号
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123456",
    "username": "admin"
  }'

# 2. 连接到数据库，设置为管理员
# 使用 DBeaver 或 psql 执行：
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@example.com';
```

**方法2：将现有用户设置为管理员**

```sql
-- 查看现有用户
SELECT id, email, role FROM public.profiles LIMIT 10;

-- 将某个用户设置为管理员
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your_email@example.com';
```

### 4. 运行测试脚本

```bash
cd /opt/tianxuan/backend

# 使用默认配置
ADMIN_EMAIL="admin@example.com" \
ADMIN_PASSWORD="admin123456" \
node test_admin.js

# 或使用环境变量文件
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="admin123456"
node test_admin.js
```

## 📋 测试前检查清单

- [ ] 服务器已重启（加载新路由）
- [ ] 管理员账号已创建并设置为 `role = 'admin'`
- [ ] 数据库连接正常（`/health` 接口返回 OK）
- [ ] 至少有一个测试用户存在

## 🔍 常见问题

### 问题1: 所有API返回404

**原因**: 服务器未重启，新路由未加载

**解决**: 重启服务器

### 问题2: 返回403权限不足

**原因**: 用户不是管理员

**解决**: 
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'your_email@example.com';
```

### 问题3: 返回401未认证

**原因**: Token无效或过期

**解决**: 重新登录获取Token

## 📝 手动测试示例

### 1. 获取管理员Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123456"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

### 2. 测试获取用户列表

```bash
curl -X GET "http://localhost:3000/api/admin/users?page=1&pageSize=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 测试获取数据概览

```bash
curl -X GET "http://localhost:3000/api/admin/stats/overview" \
  -H "Authorization: Bearer $TOKEN"
```

---

**最后更新**: 2025年1月30日

# app.ts CORS 配置修复说明

## 🔴 原始问题

**第 40-52 行的 CORS 配置存在严重问题：**

```typescript
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : []; // ❌ 空数组

app.use(
  cors({
    origin:
      corsOrigins.length > 0
        ? (origin, cb) => { ... }
        : true, // ❌ 问题：返回 Access-Control-Allow-Origin: *
    credentials: true, // ❌ 与 origin: * 冲突！
  })
);
```

**浏览器规则：**
- 当 `credentials: true` 时，`Access-Control-Allow-Origin` **不能是** `*`
- 必须返回具体的源地址（如 `http://49.232.243.107:5173`）

---

## ✅ 修复方案

### **关键修改点**

#### **1. 设置默认白名单（第 38-44 行）**

```typescript
// 修改前
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : []; // ❌ 空数组导致 origin: true

// 修改后
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://49.232.243.107:5173', // ✅ 添加服务器地址
    ];
```

#### **2. 改进 origin 回调函数（第 49-66 行）**

```typescript
// 修改前
origin:
  corsOrigins.length > 0
    ? (origin, cb) => {
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, corsOrigins[0]); // ❌ 错误的回退逻辑
      }
    : true, // ❌ 返回 *

// 修改后
origin: (origin, cb) => {
  // 允许无 origin 的请求（curl、Postman）
  if (!origin) return cb(null, true);
  
  // 检查白名单
  if (corsOrigins.includes(origin)) {
    return cb(null, true);
  }
  
  // 开发模式：允许但记录日志
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ [CORS] 开发模式：允许来源', origin);
    return cb(null, true);
  }
  
  // 生产模式：拒绝
  console.log('❌ [CORS] 拒绝来源:', origin);
  return cb(new Error('Not allowed by CORS'));
},
```

#### **3. 添加显式 OPTIONS 处理（第 75 行）**

```typescript
// 新增
app.options('*', cors());
```

---

## 📝 修改步骤

### **方法1：直接替换文件（推荐）**

```bash
# 备份原文件
cd /opt/tianxuan/backend
cp src/app.ts src/app.ts.backup

# 下载修复后的文件（我已提供）
# 然后替换
cp 下载的app.ts src/app.ts

# 重启后端
pkill -f "ts-node.*server"
npm run dev
```

### **方法2：手动修改**

**编辑 `/opt/tianxuan/backend/src/app.ts`：**

1. **找到第 38-39 行：**
   ```typescript
   const corsOrigins = process.env.CORS_ORIGIN
     ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
     : [];
   ```

   **替换为：**
   ```typescript
   const corsOrigins = process.env.CORS_ORIGIN
     ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
     : [
         'http://localhost:5173',
         'http://127.0.0.1:5173',
         'http://49.232.243.107:5173',
       ];
   ```

2. **找到第 44-54 行的 cors() 配置，完整替换为：**
   ```typescript
   app.use(
     cors({
       origin: (origin, cb) => {
         if (!origin) return cb(null, true);
         if (corsOrigins.includes(origin)) {
           return cb(null, true);
         }
         if (process.env.NODE_ENV === 'development') {
           console.log('⚠️ [CORS] 开发模式：允许来源', origin);
           return cb(null, true);
         }
         console.log('❌ [CORS] 拒绝来源:', origin);
         return cb(new Error('Not allowed by CORS'));
       },
       methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
       allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
       credentials: true,
       optionsSuccessStatus: 204,
     })
   );
   
   app.options('*', cors());
   ```

3. **保存并重启后端**

---

## 🧪 验证修复

### **1. 检查响应头**

重启后端后，测试 OPTIONS 预检请求：

```bash
curl -X OPTIONS http://49.232.243.107:3000/api/auth/login \
  -H "Origin: http://49.232.243.107:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -i "access-control"
```

**应该看到：**
```
Access-Control-Allow-Origin: http://49.232.243.107:5173
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
```

### **2. 浏览器测试**

1. 清空浏览器缓存（`Ctrl+Shift+R`）
2. 尝试登录
3. 检查开发者工具 Network 标签
4. 应该看到 `POST /api/auth/login` 返回 `200 OK`

### **3. 后端日志**

应该看到：
```
[2026-02-04T...] POST /api/auth/login - 请求开始
[Login Controller] 收到登录请求: ...
✅ 登录成功
```

---

## 🎯 核心修改总结

| 修改项 | 原配置 | 新配置 | 效果 |
|--------|--------|--------|------|
| 默认白名单 | `[]` 空数组 | 包含本地和服务器地址 | 避免 `origin: *` |
| origin 函数 | 使用 `true` 回退 | 总是返回具体源 | 兼容 credentials |
| OPTIONS 处理 | 无 | `app.options('*', cors())` | 正确响应预检 |
| 开发模式 | 无区分 | 开发模式允许所有 | 便于调试 |

---

## 🚀 重启后端

```bash
cd /opt/tianxuan/backend

# 停止当前进程
pkill -f "ts-node.*server"

# 重新启动
npm run dev
```

---

## 📞 仍然有问题？

如果修改后仍然无法登录，请提供：

1. 修改后的 `src/app.ts` 文件（第 38-75 行）
2. 浏览器控制台的 Network 请求详情（截图）
3. 后端控制台的完整日志

我可以进一步协助！

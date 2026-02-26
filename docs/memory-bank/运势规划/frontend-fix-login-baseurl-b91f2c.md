---
title: 前端登录500排查修复说明（baseURL/proxy）
date: 2026-02-22
owner: backend
---

## 1) 根因分析

现象：前端控制台中 `POST /auth/login 500`，且 `responseData: {}`。

后端侧实测：
- `POST /api/auth/login` 可返回 200（正确账号）/401（密码错误）
- `GET /api/user/profile` 可返回 200（携带 token）

说明后端认证链路可用，500 更可能发生在前端 dev server 代理层或 Axios baseURL 组装错误（请求未正确命中后端 `/api/auth/login`）。

从截图可见有 `Axios baseURL` 配置日志异常（`envValue` 未定义，`finalBaseURL` 异常），符合该结论。

## 2) 期望的数据结构 / 接口契约

### 登录请求
- Method: `POST`
- URL: `/api/auth/login`
- Body:
```json
{
  "email": "string",
  "password": "string"
}
```

### 登录成功响应
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "token": "jwt"
  },
  "message": "登录成功"
}
```

### 登录失败响应
- 401（账号/密码错误）
- 400（参数错误）

## 3) 前端具体修改建议（精确到函数行为）

1. **API 客户端 baseURL 初始化函数**
   - 若是 Vite：统一使用 `import.meta.env.VITE_API_BASE_URL`。
   - 为空时默认 `'/api'`，不要拼接文件系统路径、`process.cwd()`、`__dirname` 等。
   - 示例行为：
     - 开发环境 `baseURL = '/api'`（依赖 vite proxy）
     - 生产环境 `baseURL = 'https://your-domain/api'`

2. **登录请求函数（如 `auth.login`）**
   - 路径固定为 `'/auth/login'`（在 baseURL 已含 `/api` 的前提下）。
   - 不要再次手工拼 `/api`，避免出现 `/api/api/auth/login`。

3. **Vite 代理配置（`vite.config.ts`）**
   - 保证有：
     - `server.proxy['/api'].target = 'http://127.0.0.1:3000'`
     - `changeOrigin: true`
   - 如前端请求写的是 `/auth/login`，则需 rewrite 到 `/api/auth/login`；否则统一改前端请求为 `/api/auth/login`。

4. **请求日志**
   - 在 axios request interceptor 中打印 `baseURL + url` 最终值。
   - 目标是确认最终请求确实落到 `http://127.0.0.1:3000/api/auth/login`。

## 4) 后端已做兼容修复（本仓库）

为避免登录后取资料时报 500，后端已移除 `getProfile` 对 `profiles.implicit_traits` 的硬依赖查询，兼容尚未迁移该列的数据库结构。

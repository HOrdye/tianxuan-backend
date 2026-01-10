# 前端适配指南

**创建时间**: 2026年1月8日  
**目标**: 将前端从 Supabase 迁移到自建后端  
**推荐方案**: 模块化API管理 + Axios封装 + Pinia状态管理

---

## 📂 推荐的目录结构

```
src/
├── api/
│   ├── request.ts        # 核心：Axios 封装（拦截器、错误处理）
│   ├── config.ts         # API 端点常量
│   └── modules/          # 具体的业务 API
│       ├── auth.ts       # 认证相关
│       ├── user.ts       # 用户资料
│       ├── coins.ts      # 天机币系统
│       ├── checkin.ts    # 签到系统
│       ├── payment.ts    # 支付与订单
│       ├── subscription.ts # 订阅/会员系统
│       ├── astrology.ts  # 紫微斗数
│       └── admin.ts      # 管理员后台
├── types/
│   └── api.d.ts          # 全局 API 类型定义（与后端同步）
├── stores/
│   └── userStore.ts      # 用户状态管理 (Pinia)
└── utils/
    └── storage.ts        # 本地存储工具（可选）
```

---

## 🛠️ 核心基础设施代码

### 1. 类型定义 (src/types/api.d.ts)

```typescript
// 通用响应结构（与后端保持一致）
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
}

// 用户信息（对应后端 User + Profile）
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  tier: 'explorer' | 'basic' | 'premium' | 'vip'; // 与数据库一致
  tianji_coins_balance: number;
  subscription_status?: string;
  subscription_end_at?: Date | null;
}

// 登录响应
export interface LoginResponse {
  user: User;
  token: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### 2. Axios 核心封装 (src/api/request.ts)

```typescript
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { useUserStore } from '@/stores/userStore';

// 创建实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000, // 15秒超时
  headers: { 'Content-Type': 'application/json' },
});

// 🟢 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 从 LocalStorage 或 Pinia Store 获取 Token
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔴 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 如果后端返回 binary 数据（如下载文件），直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }
    // 解包 data，让业务层直接拿到 result.data
    return response.data;
  },
  (error) => {
    const userStore = useUserStore();
    let message = '请求失败';

    if (error.response) {
      const { status, data } = error.response;
      message = data.message || data.error || message;

      switch (status) {
        case 401:
          // Token 过期，强制登出
          userStore.logout();
          // 可选：记录当前页面路径，登录后跳回
          window.location.href = '/login';
          return Promise.reject(new Error('登录已过期'));
        case 403:
          message = '没有权限执行此操作';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
      }
    } else if (error.message.includes('timeout')) {
      message = '请求超时，请检查网络';
    } else {
      message = '网络连接异常';
    }

    // 这里可以接入你的 UI 库提示，例如 ElMessage.error(message)
    console.error(`[API Error]: ${message}`);
    return Promise.reject(new Error(message));
  }
);

export default service;
```

### 3. 环境配置

#### 3.1 环境变量 (.env.development / .env.production)

```env
# 开发环境
VITE_API_BASE_URL=/api

# 生产环境
# VITE_API_BASE_URL=https://your-domain.com/api
```

#### 3.2 Vite Proxy 配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 你的 Node.js 后端地址
        changeOrigin: true,
        // 如果后端路由就是 /api 开头，则不需要 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

---

## 📦 业务 API 模块化

### 3.1 认证模块 (src/api/modules/auth.ts)

```typescript
import request from '../request';
import type { ApiResponse, LoginResponse, User } from '@/types/api';

export const authApi = {
  // 登录
  login(data: { email: string; password: string }) {
    return request.post<any, ApiResponse<LoginResponse>>('/auth/login', data);
  },
  
  // 注册
  register(data: { email: string; password: string; username?: string }) {
    return request.post<any, ApiResponse<LoginResponse>>('/auth/register', data);
  },
  
  // 获取当前用户
  getMe() {
    return request.get<any, ApiResponse<User>>('/auth/me');
  }
};
```

### 3.2 用户资料模块 (src/api/modules/user.ts)

```typescript
import request from '../request';
import type { ApiResponse, User } from '@/types/api';

export const userApi = {
  // 获取用户资料
  getProfile() {
    return request.get<any, ApiResponse<User>>('/user/profile');
  },
  
  // 更新用户资料
  updateProfile(data: Partial<User>) {
    return request.put<any, ApiResponse<User>>('/user/profile', data);
  }
};
```

### 3.3 天机币模块 (src/api/modules/coins.ts)

```typescript
import request from '../request';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export const coinsApi = {
  // 获取余额
  getBalance() {
    return request.get<any, ApiResponse<{ balance: number }>>('/coins/balance');
  },
  
  // 查询交易流水
  getTransactions(params?: { page?: number; pageSize?: number }) {
    return request.get<any, ApiResponse<PaginatedResponse<any>>>('/coins/transactions', { params });
  }
};
```

### 3.4 支付模块 (src/api/modules/payment.ts)

```typescript
import request from '../request';
import type { ApiResponse } from '@/types/api';

export const paymentApi = {
  // 创建订单
  createOrder(data: { amount: number; packType: string; paymentProvider?: string }) {
    return request.post('/payment/orders', data);
  },
  
  // Mock 支付成功（仅开发环境）
  mockPaySuccess(orderId: string) {
    return request.post('/payment/mock/success', { orderId });
  },
  
  // 查询订单列表
  getOrders(params?: { page?: number; pageSize?: number; status?: string }) {
    return request.get('/payment/orders', { params });
  },
  
  // 查询订单详情
  getOrder(orderId: string) {
    return request.get(`/payment/orders/${orderId}`);
  }
};
```

### 3.5 订阅模块 (src/api/modules/subscription.ts)

```typescript
import request from '../request';
import type { ApiResponse } from '@/types/api';

export const subscriptionApi = {
  // 获取订阅状态
  getStatus() {
    return request.get('/subscription/status');
  },
  
  // 检查功能权限
  checkPermission(feature: string) {
    return request.get(`/subscription/permission/${feature}`);
  },
  
  // 获取今日使用次数
  getUsage(feature: string) {
    return request.get(`/subscription/usage/${feature}`);
  },
  
  // 记录功能使用
  recordUsage(data: { feature: string; metadata?: any }) {
    return request.post('/subscription/record-usage', data);
  },
  
  // 创建订阅订单
  createSubscription(data: { tier: 'basic' | 'premium' | 'vip' }) {
    return request.post('/subscription/create', data);
  },
  
  // 取消订阅
  cancelSubscription() {
    return request.post('/subscription/cancel');
  }
};
```

### 3.6 紫微斗数模块 (src/api/modules/astrology.ts)

```typescript
import request from '../request';
import type { ApiResponse } from '@/types/api';

export const astrologyApi = {
  // 保存/更新命盘
  saveStarChart(data: any) {
    return request.post('/astrology/star-chart', data);
  },
  
  // 查询命盘
  getStarChart() {
    return request.get('/astrology/star-chart');
  },
  
  // 解锁时空资产
  unlockTimeAsset(data: { startTime: string; endTime: string }) {
    return request.post('/astrology/time-assets/unlock', data);
  },
  
  // 查询已解锁资产
  getUnlockedAssets() {
    return request.get('/astrology/time-assets');
  }
};
```

---

## 💾 状态管理改造 (src/stores/userStore.ts)

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '@/api/modules/auth';
import type { User } from '@/types/api';

export const useUserStore = defineStore('user', () => {
  // State
  const token = ref<string | null>(localStorage.getItem('token'));
  const userInfo = ref<User | null>(null);

  // Actions
  async function login(loginForm: { email: string; password: string }) {
    try {
      const res = await authApi.login(loginForm);
      if (res.success) {
        setToken(res.data.token);
        userInfo.value = res.data.user;
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  async function register(registerForm: { email: string; password: string; username?: string }) {
    try {
      const res = await authApi.register(registerForm);
      if (res.success) {
        setToken(res.data.token);
        userInfo.value = res.data.user;
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  }

  function logout() {
    token.value = null;
    userInfo.value = null;
    localStorage.removeItem('token');
  }

  // 初始化：页面刷新时拉取最新用户信息
  async function init() {
    if (token.value) {
      try {
        const res = await authApi.getMe();
        if (res.success) {
          userInfo.value = res.data;
        }
      } catch (error) {
        // Token 可能无效了
        logout();
      }
    }
  }

  return { token, userInfo, login, register, logout, init };
});
```

---

## 🔄 迁移步骤

### 步骤1：安装依赖

```bash
npm install axios pinia
```

### 步骤2：创建目录结构

按照上面的目录结构创建文件。

### 步骤3：替换 Supabase 调用

逐个模块替换：
1. 认证模块（登录/注册）
2. 用户资料模块
3. 天机币模块
4. 支付模块
5. 订阅模块
6. 紫微斗数模块

### 步骤4：更新组件

在 Vue 组件中使用新的 API：

```typescript
import { authApi } from '@/api/modules/auth';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

// 登录
await userStore.login({ email, password });

// 获取用户信息
const res = await authApi.getMe();
```

---

## 📋 API 端点映射表

| 功能模块 | 旧端点（Supabase） | 新端点（自建后端） | 状态 |
|---------|------------------|------------------|------|
| 登录 | `auth.signInWithPassword()` | `POST /api/auth/login` | ✅ |
| 注册 | `auth.signUp()` | `POST /api/auth/register` | ✅ |
| 获取用户 | `auth.getUser()` | `GET /api/auth/me` | ✅ |
| 用户资料 | `profiles.select()` | `GET /api/user/profile` | ✅ |
| 更新资料 | `profiles.update()` | `PUT /api/user/profile` | ✅ |
| 天机币余额 | `rpc('get_balance')` | `GET /api/coins/balance` | ✅ |
| 天机币流水 | `transactions.select()` | `GET /api/coins/transactions` | ✅ |
| 签到 | `rpc('handle_daily_check_in')` | `POST /api/checkin/daily` | ✅ |
| 签到状态 | `rpc('get_checkin_status')` | `GET /api/checkin/status` | ✅ |
| 支付订单 | `transactions.insert()` | `POST /api/payment/orders` | ✅ |
| Mock支付 | - | `POST /api/payment/mock/success` | ✅ |
| 订阅状态 | `subscriptions.select()` | `GET /api/subscription/status` | ✅ |
| 功能权限 | `rpc('check_feature_permission')` | `GET /api/subscription/permission/:feature` | ✅ |
| 使用次数 | `usage_logs.select()` | `GET /api/subscription/usage/:feature` | ✅ |
| 创建订阅 | `subscriptions.insert()` | `POST /api/subscription/create` | ✅ |
| 取消订阅 | `subscriptions.update()` | `POST /api/subscription/cancel` | ✅ |
| 命盘存档 | `star_charts.select()` | `GET /api/astrology/star-chart` | ✅ |
| 解锁资产 | `unlocked_time_assets.insert()` | `POST /api/astrology/time-assets/unlock` | ✅ |
| 管理员-用户列表 | - | `GET /api/admin/users` | ✅ |
| 管理员-数据统计 | - | `GET /api/admin/stats/overview` | ✅ |

---

## 🔧 迁移步骤

### 步骤1：安装依赖

```bash
npm install axios pinia
```

### 步骤2：创建目录结构和文件

按照上面的目录结构创建所有文件。

### 步骤3：配置环境变量和代理

1. 创建 `.env.development` 和 `.env.production`
2. 配置 `vite.config.ts` 的 proxy

### 步骤4：替换 Supabase 调用

按模块逐个替换：
1. ✅ 认证模块（登录/注册/获取用户）
2. ✅ 用户资料模块
3. ✅ 天机币模块
4. ✅ 签到模块
5. ✅ 支付模块
6. ✅ 订阅模块
7. ✅ 紫微斗数模块
8. ✅ 管理员后台（如果有）

### 步骤5：更新组件使用方式

**修改前（Supabase）**:
```typescript
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

**修改后（自建后端）**:
```typescript
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();
await userStore.login({ email, password });
```

---

## ✅ 测试清单

- [ ] 用户注册/登录功能
- [ ] Token 存储和读取
- [ ] 用户资料查询/更新
- [ ] 天机币系统（余额、扣费、充值、流水）
- [ ] 签到系统（每日签到、状态查询）
- [ ] 支付系统（创建订单、Mock支付、订单查询）
- [ ] 订阅系统（状态查询、权限检查、使用次数、创建/取消订阅）
- [ ] 紫微斗数功能（命盘存档、解锁资产）
- [ ] 管理员后台（用户管理、数据统计）
- [ ] 错误处理（401/403/404/500）
- [ ] Token过期自动登出

---

## 🎯 关键优势

1. **模块化管理**：按业务模块拆分API，易于维护
2. **类型安全**：完整的TypeScript类型定义
3. **统一错误处理**：Axios拦截器统一处理错误
4. **状态管理**：Pinia Store管理用户状态
5. **开发体验**：Vite Proxy解决跨域，无需CORS配置

---

**维护者**: 开发团队  
**最后更新**: 2026年1月8日

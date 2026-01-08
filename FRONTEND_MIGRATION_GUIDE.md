# 前端适配指南

**创建时间**: 2026年1月8日  
**目标**: 将前端从 Supabase 迁移到自建后端

---

## 📋 适配清单

### 1. 环境变量配置

**修改 `.env.production` 和 `.env.development`**:

```env
# 旧配置（Supabase）
# VITE_SUPABASE_URL=https://vdxxpsjdiswztipauhwb.supabase.co
# VITE_SUPABASE_ANON_KEY=your_supabase_key

# 新配置（自建后端）
VITE_API_BASE_URL=http://localhost:3000/api
# 生产环境改为: VITE_API_BASE_URL=https://your-domain.com/api
```

---

### 2. 认证系统适配

#### 2.1 登录/注册 API

**修改前（Supabase）**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

**修改后（自建后端）**:
```typescript
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data } = await response.json();
// data.token 存储到 localStorage
// data.user 存储到状态管理
```

#### 2.2 Token 存储

**修改前（Supabase）**:
```typescript
// Supabase 自动管理 session
const session = supabase.auth.session();
```

**修改后（自建后端）**:
```typescript
// 手动管理 Token
localStorage.setItem('auth_token', token);
const token = localStorage.getItem('auth_token');
```

#### 2.3 获取当前用户

**修改前（Supabase）**:
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

**修改后（自建后端）**:
```typescript
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
});
const { data } = await response.json();
```

---

### 3. API 调用适配

#### 3.1 创建统一的 API 客户端

**创建 `src/core/api/client.ts`**:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '请求失败');
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

#### 3.2 API 端点映射

| 功能模块 | 旧端点（Supabase） | 新端点（自建后端） |
|---------|------------------|------------------|
| 登录 | `auth.signInWithPassword()` | `POST /api/auth/login` |
| 注册 | `auth.signUp()` | `POST /api/auth/register` |
| 获取用户 | `auth.getUser()` | `GET /api/auth/me` |
| 用户资料 | `profiles.select()` | `GET /api/user/profile` |
| 更新资料 | `profiles.update()` | `PUT /api/user/profile` |
| 天机币余额 | `rpc('get_balance')` | `GET /api/coins/balance` |
| 签到 | `rpc('handle_daily_check_in')` | `POST /api/checkin/daily` |
| 支付订单 | `transactions.insert()` | `POST /api/payment/orders` |
| 订阅状态 | `subscriptions.select()` | `GET /api/subscription/status` |
| 紫微斗数 | `star_charts.select()` | `GET /api/astrology/star-chart` |

---

### 4. 错误处理适配

**修改前（Supabase）**:
```typescript
if (error) {
  console.error(error.message);
}
```

**修改后（自建后端）**:
```typescript
try {
  const data = await apiClient.get('/user/profile');
} catch (error: any) {
  if (error.message === '认证令牌无效') {
    // Token 过期，跳转登录
    router.push('/login');
  }
  console.error(error.message);
}
```

---

### 5. 测试清单

- [ ] 用户注册/登录功能
- [ ] Token 存储和读取
- [ ] 用户资料查询/更新
- [ ] 天机币系统（余额、扣费、充值）
- [ ] 签到系统
- [ ] 支付系统（创建订单、支付回调）
- [ ] 订阅系统（状态查询、权限检查）
- [ ] 紫微斗数功能
- [ ] 管理员后台（如果前端有）

---

## 🔧 快速开始

1. **修改环境变量**：更新 `.env` 文件
2. **创建 API 客户端**：使用上面的 `ApiClient` 类
3. **替换 Supabase 调用**：逐个模块替换 API 调用
4. **测试功能**：确保所有功能正常工作

---

**维护者**: 开发团队

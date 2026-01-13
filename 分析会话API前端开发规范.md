# 分析会话 API 前端开发规范

**创建时间**: 2026年1月11日  
**目标**: 为前端开发人员提供分析会话相关 API 的完整使用规范  
**状态**: ✅ **已实现** - 所有 API 已完成开发

---

## 📋 目录

1. [API 接口清单](#api-接口清单)
2. [数据结构定义](#数据结构定义)
3. [关键注意事项](#关键注意事项)
4. [前端使用方式](#前端使用方式)
5. [错误处理](#错误处理)
6. [示例代码](#示例代码)
7. [常见问题](#常见问题)

---

## 🔌 API 接口清单

### 已实现的 API

#### 1. 保存分析会话
- **接口**: `POST /api/astrology/analysis-sessions`
- **状态**: ✅ 已实现
- **认证**: 需要 JWT Token
- **请求体**:
  ```typescript
  {
    profileId: string;      // 命盘ID（必填，UUID格式）
    sessionData: any;       // 分析会话数据（必填，任意JSON对象）
  }
  ```
- **响应**: `ApiResponse<{ sessionId: string }>`
- **说明**: 
  - 每次调用都会创建新的分析会话记录
  - `sessionData` 可以是任意 JSON 结构，后端会以 JSONB 格式存储
  - 返回新创建的会话 ID

#### 2. 查询分析会话列表
- **接口**: `GET /api/astrology/analysis-sessions`
- **状态**: ✅ 已实现
- **认证**: 需要 JWT Token
- **查询参数**:
  ```typescript
  {
    profileId?: string;     // 命盘ID（可选，如果提供则只查询该命盘的会话）
  }
  ```
- **响应**: `ApiResponse<{ sessions: AnalysisSession[] }>`
- **说明**:
  - 不提供 `profileId` 时，返回当前用户的所有分析会话
  - 提供 `profileId` 时，只返回该命盘的会话
  - 结果按创建时间倒序排列（最新的在前）

#### 3. 删除命盘的所有分析会话
- **接口**: `DELETE /api/astrology/analysis-sessions/by-profile/:profileId`
- **状态**: ✅ 已实现
- **认证**: 需要 JWT Token
- **路径参数**:
  ```typescript
  {
    profileId: string;      // 命盘ID（必填，UUID格式）
  }
  ```
- **响应**: `ApiResponse<{ deletedCount: number }>`
- **说明**: 
  - 删除指定命盘的所有分析会话
  - 返回删除的记录数量
  - 只能删除当前用户自己的会话

---

## 📊 数据结构定义

### 1. AnalysisSession（分析会话）

```typescript
interface AnalysisSession {
  id: string;                    // 会话ID（UUID）
  userId: string;                // 用户ID（UUID）
  profileId: string;             // 命盘ID（UUID，对应存档或档案）
  sessionData: any;               // 分析会话数据（任意JSON对象）
  createdAt: string;             // 创建时间（ISO 8601格式）
  updatedAt: string;             // 更新时间（ISO 8601格式）
}
```

**字段说明**：
- `id`: 会话的唯一标识符，由后端自动生成
- `userId`: 会话所属的用户ID，由后端从 JWT Token 中获取
- `profileId`: 关联的命盘ID，可以是存档ID或档案ID
- `sessionData`: 分析会话的具体数据，可以是任意结构
  - 例如：`{ analysisType: 'fortune', results: {...}, settings: {...} }`
  - 前端可以根据业务需求自由定义结构
- `createdAt`: 会话创建时间，ISO 8601 格式字符串
- `updatedAt`: 会话最后更新时间，ISO 8601 格式字符串

### 2. SaveAnalysisSessionRequest（保存请求）

```typescript
interface SaveAnalysisSessionRequest {
  profileId: string;             // 命盘ID（必填）
  sessionData: any;               // 分析会话数据（必填）
}
```

### 3. ApiResponse（标准响应格式）

```typescript
interface ApiResponse<T = any> {
  success: boolean;               // 请求是否成功
  message?: string;               // 响应消息（可选）
  error?: string;                 // 错误信息（可选）
  data?: T;                       // 响应数据（可选）
}
```

### 4. SaveAnalysisSessionResponse（保存响应）

```typescript
interface SaveAnalysisSessionResponse {
  success: true;
  message: string;                // 例如："分析会话保存成功"
  data: {
    sessionId: string;            // 新创建的会话ID
  };
}
```

### 5. GetAnalysisSessionsResponse（查询响应）

```typescript
interface GetAnalysisSessionsResponse {
  success: true;
  data: {
    sessions: AnalysisSession[];   // 分析会话列表
  };
}
```

### 6. DeleteAnalysisSessionsResponse（删除响应）

```typescript
interface DeleteAnalysisSessionsResponse {
  success: true;
  message: string;                // 例如："成功删除 5 个分析会话"
  data: {
    deletedCount: number;          // 删除的记录数量
  };
}
```

---

## ⚠️ 关键注意事项

### 1. 认证要求

**所有 API 都需要 JWT Token 认证**：

```typescript
// 请求头必须包含
Authorization: Bearer <your-jwt-token>
```

**未认证的响应**：
```json
{
  "success": false,
  "error": "未认证"
}
```
状态码：`401 Unauthorized`

### 2. profileId 的含义

`profileId` 可以是以下两种之一：
- **命盘存档ID**：来自 `ziwei_chart_archives` 表的 `id`
- **用户档案ID**：来自 `profiles` 表的 `id`（对应"我的命盘"）

**建议**：
- 如果是存档的分析会话，使用存档的 `id` 作为 `profileId`
- 如果是"我的命盘"的分析会话，使用用户的 `userId` 作为 `profileId`

### 3. sessionData 的数据结构

`sessionData` 可以是任意 JSON 结构，建议根据业务需求定义：

**示例结构 1：运势分析会话**
```typescript
{
  analysisType: 'fortune',           // 分析类型
  period: {
    start: '2025-01-01',
    end: '2025-12-31',
    type: 'year'                      // year | month | day
  },
  results: {
    overall: 'good',
    details: [...]
  },
  settings: {
    includeTransits: true,
    includeAspects: false
  },
  createdAt: '2025-01-11T10:00:00Z'
}
```

**示例结构 2：合盘分析会话**
```typescript
{
  analysisType: 'synastry',
  profiles: ['profile-id-1', 'profile-id-2'],
  results: {
    compatibility: 85,
    aspects: [...],
    houses: [...]
  },
  notes: '初次见面分析'
}
```

**⚠️ 重要**：
- `sessionData` 会被完整保存，前端可以存储任意结构的数据
- 建议在 `sessionData` 中包含 `analysisType` 字段，便于后续识别和筛选
- 建议包含时间戳，便于排序和筛选

### 4. 数据隔离

**用户只能访问自己的分析会话**：
- 查询时自动过滤，只返回当前用户的会话
- 删除时自动验证，只能删除自己的会话
- 后端通过 JWT Token 中的 `userId` 进行验证

### 5. 删除操作

**删除是批量操作**：
- `DELETE /api/astrology/analysis-sessions/by-profile/:profileId` 会删除该命盘的所有会话
- 如果需要删除单个会话，需要先查询获取 `sessionId`，然后通过其他方式删除（当前版本不支持单条删除）

---

## 💻 前端使用方式

### 1. 使用 Axios 调用 API

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器，自动添加 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. 保存分析会话

```typescript
/**
 * 保存分析会话
 * @param profileId 命盘ID
 * @param sessionData 分析会话数据
 * @returns 会话ID
 */
async function saveAnalysisSession(
  profileId: string,
  sessionData: any
): Promise<string> {
  try {
    const response = await apiClient.post<SaveAnalysisSessionResponse>(
      '/api/astrology/analysis-sessions',
      {
        profileId,
        sessionData,
      }
    );

    if (response.data.success) {
      return response.data.data.sessionId;
    } else {
      throw new Error(response.data.error || '保存失败');
    }
  } catch (error: any) {
    if (error.response) {
      // 服务器返回了错误响应
      throw new Error(error.response.data.message || error.response.data.error);
    } else {
      // 网络错误或其他错误
      throw new Error('网络错误，请稍后重试');
    }
  }
}

// 使用示例
const sessionId = await saveAnalysisSession('profile-uuid-123', {
  analysisType: 'fortune',
  period: {
    start: '2025-01-01',
    end: '2025-12-31',
    type: 'year',
  },
  results: {
    overall: 'good',
    details: [],
  },
});
console.log('会话已保存，ID:', sessionId);
```

### 3. 查询分析会话列表

```typescript
/**
 * 查询分析会话列表
 * @param profileId 命盘ID（可选）
 * @returns 分析会话列表
 */
async function getAnalysisSessions(
  profileId?: string
): Promise<AnalysisSession[]> {
  try {
    const params = profileId ? { profileId } : {};
    const response = await apiClient.get<GetAnalysisSessionsResponse>(
      '/api/astrology/analysis-sessions',
      { params }
    );

    if (response.data.success) {
      return response.data.data.sessions;
    } else {
      throw new Error(response.data.error || '查询失败');
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || error.response.data.error);
    } else {
      throw new Error('网络错误，请稍后重试');
    }
  }
}

// 使用示例
// 查询所有会话
const allSessions = await getAnalysisSessions();

// 查询特定命盘的会话
const profileSessions = await getAnalysisSessions('profile-uuid-123');
```

### 4. 删除命盘的所有分析会话

```typescript
/**
 * 删除命盘的所有分析会话
 * @param profileId 命盘ID
 * @returns 删除的记录数量
 */
async function deleteAnalysisSessionsByProfile(
  profileId: string
): Promise<number> {
  try {
    const response = await apiClient.delete<DeleteAnalysisSessionsResponse>(
      `/api/astrology/analysis-sessions/by-profile/${profileId}`
    );

    if (response.data.success) {
      return response.data.data.deletedCount;
    } else {
      throw new Error(response.data.error || '删除失败');
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || error.response.data.error);
    } else {
      throw new Error('网络错误，请稍后重试');
    }
  }
}

// 使用示例
const deletedCount = await deleteAnalysisSessionsByProfile('profile-uuid-123');
console.log(`已删除 ${deletedCount} 个会话`);
```

### 5. 在 Vue 组件中使用（Composition API）

```vue
<template>
  <div>
    <button @click="saveSession">保存会话</button>
    <button @click="loadSessions">加载会话</button>
    <button @click="deleteSessions">删除所有会话</button>
    
    <div v-for="session in sessions" :key="session.id">
      <p>会话ID: {{ session.id }}</p>
      <p>创建时间: {{ session.createdAt }}</p>
      <pre>{{ JSON.stringify(session.sessionData, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { saveAnalysisSession, getAnalysisSessions, deleteAnalysisSessionsByProfile } from '@/api/astrology';

const profileId = ref('profile-uuid-123');
const sessions = ref<AnalysisSession[]>([]);

async function saveSession() {
  try {
    const sessionData = {
      analysisType: 'fortune',
      period: { start: '2025-01-01', end: '2025-12-31', type: 'year' },
      results: { overall: 'good' },
    };
    
    const sessionId = await saveAnalysisSession(profileId.value, sessionData);
    console.log('保存成功，会话ID:', sessionId);
    
    // 重新加载列表
    await loadSessions();
  } catch (error: any) {
    console.error('保存失败:', error.message);
    alert('保存失败: ' + error.message);
  }
}

async function loadSessions() {
  try {
    sessions.value = await getAnalysisSessions(profileId.value);
  } catch (error: any) {
    console.error('加载失败:', error.message);
    alert('加载失败: ' + error.message);
  }
}

async function deleteSessions() {
  if (!confirm('确定要删除该命盘的所有分析会话吗？')) {
    return;
  }
  
  try {
    const count = await deleteAnalysisSessionsByProfile(profileId.value);
    alert(`已删除 ${count} 个会话`);
    sessions.value = [];
  } catch (error: any) {
    console.error('删除失败:', error.message);
    alert('删除失败: ' + error.message);
  }
}

// 组件挂载时加载会话
loadSessions();
</script>
```

---

## 🚨 错误处理

### 1. 错误响应格式

所有错误响应都遵循统一格式：

```typescript
interface ErrorResponse {
  success: false;
  error: string;                   // 错误类型
  message?: string;               // 详细错误信息（可选）
}
```

### 2. 常见错误码

| 状态码 | 错误类型 | 说明 | 处理建议 |
|--------|--------|------|----------|
| 401 | `未认证` | JWT Token 缺失或无效 | 重新登录获取新 Token |
| 400 | `参数错误` | 请求参数不正确 | 检查 `profileId` 和 `sessionData` 是否提供 |
| 404 | `存档不存在或无权访问` | profileId 不存在或不属于当前用户 | 检查 profileId 是否正确 |
| 500 | `保存/查询/删除失败` | 服务器内部错误 | 记录错误日志，提示用户稍后重试 |

### 3. 错误处理示例

```typescript
async function saveAnalysisSessionWithErrorHandling(
  profileId: string,
  sessionData: any
): Promise<string> {
  try {
    const response = await apiClient.post(
      '/api/astrology/analysis-sessions',
      { profileId, sessionData }
    );

    if (response.data.success) {
      return response.data.data.sessionId;
    } else {
      throw new Error(response.data.error || '保存失败');
    }
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          // 未认证，跳转到登录页
          router.push('/login');
          throw new Error('请先登录');
        
        case 400:
          // 参数错误
          throw new Error(data.message || '请求参数不正确');
        
        case 404:
          // 资源不存在
          throw new Error('命盘不存在或无权访问');
        
        case 500:
          // 服务器错误
          console.error('服务器错误:', data);
          throw new Error('服务器错误，请稍后重试');
        
        default:
          throw new Error(data.message || '未知错误');
      }
    } else {
      // 网络错误
      throw new Error('网络连接失败，请检查网络设置');
    }
  }
}
```

---

## 📝 示例代码

### 完整的 API 封装示例

```typescript
// api/astrology/analysisSessions.ts

import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加 Token 拦截器
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 类型定义
export interface AnalysisSession {
  id: string;
  userId: string;
  profileId: string;
  sessionData: any;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAnalysisSessionRequest {
  profileId: string;
  sessionData: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// API 函数
export const analysisSessionsApi = {
  /**
   * 保存分析会话
   */
  async save(
    profileId: string,
    sessionData: any
  ): Promise<string> {
    const response = await apiClient.post<ApiResponse<{ sessionId: string }>>(
      '/api/astrology/analysis-sessions',
      { profileId, sessionData }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '保存失败');
    }

    return response.data.data!.sessionId;
  },

  /**
   * 查询分析会话列表
   */
  async list(profileId?: string): Promise<AnalysisSession[]> {
    const params = profileId ? { profileId } : {};
    const response = await apiClient.get<ApiResponse<{ sessions: AnalysisSession[] }>>(
      '/api/astrology/analysis-sessions',
      { params }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '查询失败');
    }

    return response.data.data!.sessions;
  },

  /**
   * 删除命盘的所有分析会话
   */
  async deleteByProfile(profileId: string): Promise<number> {
    const response = await apiClient.delete<ApiResponse<{ deletedCount: number }>>(
      `/api/astrology/analysis-sessions/by-profile/${profileId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || '删除失败');
    }

    return response.data.data!.deletedCount;
  },
};
```

### 在 Pinia Store 中使用

```typescript
// stores/analysisSessionStore.ts

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { analysisSessionsApi, AnalysisSession } from '@/api/astrology/analysisSessions';

export const useAnalysisSessionStore = defineStore('analysisSession', () => {
  const sessions = ref<AnalysisSession[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性：按命盘分组
  const sessionsByProfile = computed(() => {
    const grouped: Record<string, AnalysisSession[]> = {};
    sessions.value.forEach((session) => {
      if (!grouped[session.profileId]) {
        grouped[session.profileId] = [];
      }
      grouped[session.profileId].push(session);
    });
    return grouped;
  });

  // 保存会话
  async function saveSession(profileId: string, sessionData: any) {
    loading.value = true;
    error.value = null;
    
    try {
      const sessionId = await analysisSessionsApi.save(profileId, sessionData);
      // 重新加载列表
      await loadSessions(profileId);
      return sessionId;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 加载会话列表
  async function loadSessions(profileId?: string) {
    loading.value = true;
    error.value = null;
    
    try {
      sessions.value = await analysisSessionsApi.list(profileId);
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // 删除命盘的所有会话
  async function deleteSessionsByProfile(profileId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      const count = await analysisSessionsApi.deleteByProfile(profileId);
      // 从本地状态中移除
      sessions.value = sessions.value.filter(
        (s) => s.profileId !== profileId
      );
      return count;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    sessions,
    loading,
    error,
    sessionsByProfile,
    saveSession,
    loadSessions,
    deleteSessionsByProfile,
  };
});
```

---

## ❓ 常见问题

### Q1: sessionData 应该存储什么数据？

**A**: `sessionData` 可以存储任意 JSON 数据，建议根据业务需求定义结构。例如：
- 分析结果
- 分析设置
- 用户输入
- 分析类型
- 时间范围
- 等等

### Q2: 如何区分不同类型的分析会话？

**A**: 建议在 `sessionData` 中包含 `analysisType` 字段：

```typescript
{
  analysisType: 'fortune' | 'synastry' | 'transit' | 'composite',
  // ... 其他数据
}
```

查询后可以根据 `analysisType` 进行筛选。

### Q3: 可以更新已保存的会话吗？

**A**: 当前版本不支持更新操作。如果需要更新，可以：
1. 删除旧会话
2. 创建新会话

或者联系后端开发人员添加更新接口。

### Q4: 如何删除单个会话？

**A**: 当前版本只支持按 `profileId` 批量删除。如果需要删除单个会话，可以：
1. 先查询获取所有会话
2. 在前端过滤掉要删除的会话
3. 删除该命盘的所有会话
4. 重新保存剩余的会话

或者联系后端开发人员添加单条删除接口。

### Q5: profileId 应该使用什么值？

**A**: 
- 如果是存档的分析会话，使用存档的 `id`（来自 `GET /api/astrology/archives`）
- 如果是"我的命盘"的分析会话，使用用户的 `userId`（来自 `GET /api/auth/me`）

### Q6: 会话数据有大小限制吗？

**A**: PostgreSQL 的 JSONB 类型理论上没有严格的大小限制，但建议：
- 单个会话数据不超过 1MB
- 如果数据很大，考虑只存储关键信息，详细数据可以存储在文件或其他存储中

---

## 📚 相关文档

- [紫微斗数 API 开发规范](./紫微斗数API开发规范.md)
- [前端迁移指南](./FRONTEND_MIGRATION_GUIDE.md)
- [后端类型定义](./BACKEND_TYPES.ts)

---

## 🔄 更新日志

- **2026-01-11**: 初始版本，包含三个 API 的完整规范

---

## 📞 技术支持

如有问题或建议，请联系后端开发团队。

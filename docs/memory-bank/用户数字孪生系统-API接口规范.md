# 用户数字孪生系统 - API接口规范

**文档版本**：v1.0  
**创建日期**：2026-01-31  
**基础URL**：`/api`

---

## 📋 通用说明

### 响应格式

所有API响应遵循统一格式：

```typescript
{
  success: boolean;      // 请求是否成功
  data?: any;           // 响应数据（成功时）
  error?: string;       // 错误代码（失败时）
  message?: string;     // 错误或成功消息
}
```

### 错误代码

- `INVALID_PARAMETER`：参数错误
- `UNAUTHORIZED`：未授权
- `FORBIDDEN`：权限不足
- `NOT_FOUND`：资源不存在
- `INTERNAL_ERROR`：服务器内部错误

### 认证

所有接口需要在请求头中携带认证Token：

```
Authorization: Bearer <token>
```

---

## 🔌 接口列表

### 1. 用户资料相关

#### 1.1 获取用户资料（扩展）

**接口**：`GET /api/user/profile`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```typescript
{
  success: true,
  data: {
    id: string;
    email: string;
    username: string;
    avatar_url?: string;
    role: 'user' | 'admin';
    tier: 'explorer' | 'basic' | 'premium' | 'vip';
    birth_date?: string; // ISO 8601 日期字符串
    gender?: 'male' | 'female';
    // ... 其他现有字段
    
    // 扩展：preferences 结构
    preferences: {
      userContext?: {
        mbti?: string;
        currentStatus?: string;
        identity?: string;
        profession?: string;
        wishes?: string[];
        energyLevel?: 'strong' | 'weak' | 'balanced';
      };
      implicit_traits?: {
        inferred_roles?: string[];
        interest_tags?: string[];
        risk_tolerance?: 'low' | 'medium' | 'high';
        interaction_style?: 'concise' | 'detailed';
        last_active_topic?: string;
        family_structure?: {
          has_spouse?: boolean;
          has_children?: boolean;
          children_count?: number;
        };
        profession_hints?: string[];
      };
    };
    
    // 新增：资料完整度（计算字段）
    completeness?: number; // 0-100
  }
}
```

**错误响应**：
```typescript
{
  success: false,
  error: 'UNAUTHORIZED',
  message: '未授权访问'
}
```

---

#### 1.2 更新用户资料（扩展）

**接口**：`PUT /api/user/profile`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```typescript
{
  username?: string;
  avatar_url?: string;
  birth_date?: string; // ISO 8601 日期字符串
  gender?: 'male' | 'female';
  birth_location?: string;
  
  // 新增：支持更新 userContext
  preferences?: {
    userContext?: {
      mbti?: string;
      currentStatus?: string;
      identity?: string;
      profession?: string;
      wishes?: string[];
      energyLevel?: 'strong' | 'weak' | 'balanced';
    };
  };
}
```

**响应**：
```typescript
{
  success: true,
  data: {
    // 更新后的完整用户资料（同 GET /api/user/profile）
    id: string;
    email: string;
    // ... 其他字段
    completeness?: number;
  },
  message?: string; // 如："生辰信息已同步到命主名刺"
}
```

**业务逻辑**：
1. 如果更新了 `birth_date`，自动触发 `syncBirthdayToUserContext`
2. 如果更新了 `preferences.userContext`，自动计算完整度
3. 如果完整度提升，检查是否需要发放奖励

**错误响应**：
```typescript
{
  success: false,
  error: 'INVALID_PARAMETER',
  message: 'birth_date 格式错误'
}
```

---

### 2. 命主名刺相关（新增）

#### 2.1 获取命主名刺

**接口**：`GET /api/user/destiny-card`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```typescript
{
  success: true,
  data: {
    mbti?: string;
    currentStatus?: string;
    identity?: string;
    profession?: string;
    wishes?: string[];
    energyLevel?: 'strong' | 'weak' | 'balanced';
    completeness: number; // 0-100
    lastUpdated: string; // ISO 8601 时间戳
  }
}
```

**错误响应**：
```typescript
{
  success: false,
  error: 'UNAUTHORIZED',
  message: '未授权访问'
}
```

---

#### 2.2 更新命主名刺

**接口**：`PUT /api/user/destiny-card`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```typescript
{
  mbti?: string;
  currentStatus?: string;
  identity?: string;
  profession?: string;
  wishes?: string[];
  energyLevel?: 'strong' | 'weak' | 'balanced';
}
```

**响应**（增强版，支持即时反馈）：
```typescript
{
  success: true,
  data: {
    // 更新后的完整数据
    mbti?: string;
    currentStatus?: string;
    identity?: string;
    profession?: string;
    wishes?: string[];
    energyLevel?: 'strong' | 'weak' | 'balanced';
    completeness: number;
    lastUpdated: string;
  },
  // 新增：events 字段，用于前端即时反馈
  events?: Array<{
    type: 'COIN_GRANTED' | 'COMPLETENESS_INCREASED' | 'THRESHOLD_REACHED';
    coins?: number;
    reason: string;
    field?: string; // 触发奖励的字段
    threshold?: number; // 达到的阈值
  }>;
  message?: string
}
```

**业务逻辑**（幂等性保证）：
1. 对比旧数据，检测新增字段
2. 更新 `profiles.preferences.userContext`
3. 计算新的完整度
4. **幂等性检查**：检查奖励是否已发放（使用 `completeness_rewards` 表）
5. 如果有新增字段且未发放过，发放奖励（每字段 +5 天机币）
6. 如果达到阈值且未发放过，发放阈值奖励
7. 记录奖励到 `completeness_rewards` 表（防止重复发放）
8. 返回 `events` 数组，供前端即时反馈

**示例响应**（增强版）：
```json
{
  "success": true,
  "data": {
    "mbti": "INTP",
    "profession": "独立开发者",
    "completeness": 20,
    "lastUpdated": "2026-01-31T10:30:00Z"
  },
  "events": [
    {
      "type": "COIN_GRANTED",
      "coins": 5,
      "reason": "完善MBTI信息",
      "field": "mbti"
    },
    {
      "type": "COIN_GRANTED",
      "coins": 5,
      "reason": "完善职业信息",
      "field": "profession"
    },
    {
      "type": "COMPLETENESS_INCREASED",
      "reason": "资料完整度从0%提升到20%"
    }
  ],
  "message": "命主名刺已更新"
}
```

**前端使用示例**：
```typescript
// 前端拿到响应后，可以立即弹出奖励动画
if (response.events) {
  for (const event of response.events) {
    if (event.type === 'COIN_GRANTED') {
      showCoinAnimation(`+${event.coins}`, event.reason);
    } else if (event.type === 'THRESHOLD_REACHED') {
      showThresholdReward(event.threshold, event.coins);
    }
  }
}
```

**错误响应**：
```typescript
{
  success: false,
  error: 'INVALID_PARAMETER',
  message: 'mbti 必须是有效的MBTI类型'
}
```

---

### 3. 资料完整度相关（新增）

#### 3.1 获取资料完整度

**接口**：`GET /api/user/completeness`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```typescript
{
  success: true,
  data: {
    completeness: number; // 0-100
    breakdown: {
      birthData: {
        filled: boolean;
        score: number;
        maxScore: number; // 40
      };
      mbti: {
        filled: boolean;
        score: number;
        maxScore: number; // 10
      };
      profession: {
        filled: boolean;
        score: number;
        maxScore: number; // 10
      };
      currentStatus: {
        filled: boolean;
        score: number;
        maxScore: number; // 20
      };
      wishes: {
        filled: boolean;
        score: number;
        maxScore: number; // 20
      };
    };
    nextRewardThreshold?: number; // 下一个奖励阈值（如：30, 50, 70, 100）
  }
}
```

**示例响应**：
```json
{
  "success": true,
  "data": {
    "completeness": 25,
    "breakdown": {
      "birthData": {
        "filled": false,
        "score": 0,
        "maxScore": 40
      },
      "mbti": {
        "filled": true,
        "score": 10,
        "maxScore": 10
      },
      "profession": {
        "filled": true,
        "score": 10,
        "maxScore": 10
      },
      "currentStatus": {
        "filled": true,
        "score": 5,
        "maxScore": 20
      },
      "wishes": {
        "filled": false,
        "score": 0,
        "maxScore": 20
      }
    },
    "nextRewardThreshold": 30
  }
}
```

---

### 4. 生辰信息同步（新增）

#### 4.1 同步生辰到用户上下文

**接口**：`POST /api/user/sync-birthday-to-context`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```typescript
{
  birthday: string; // ISO 8601 日期字符串，如 "1990-01-15"（推荐使用 birthday，与数据库字段名一致）
  birthDate?: string; // 兼容字段（推荐使用 birthday）
  birth_date?: string; // 兼容字段（推荐使用 birthday）
  birthTime?: string; // HH:mm 格式，如 "14:30"
  birthLocation?: string;
  gender?: 'male' | 'female';
}
```

**响应**：
```typescript
{
  success: true,
  data: {
    synced: boolean;
    userContextUpdated: boolean;
    identityGenerated?: string; // 如果生成了命格法相
  },
  message?: string
}
```

**示例响应**：
```json
{
  "success": true,
  "data": {
    "synced": true,
    "userContextUpdated": true,
    "identityGenerated": "紫微七杀·化杀为权"
  },
  "message": "生辰信息已同步到命主名刺，命格法相已生成"
}
```

**业务逻辑**：
1. 更新 `profiles.birth_date` 字段
2. 同步到 `profiles.preferences.userContext`（如果不存在）
3. 如果用户有命盘数据，尝试生成 `identity`（命格法相）
4. 更新 `profiles.preferences.userContext.identity`

**错误响应**：
```typescript
{
  success: false,
  error: 'INVALID_PARAMETER',
  message: 'birthday 必须提供（支持 birthday、birthDate、birth_date）'
}
```

---

### 5. 隐性信息相关（新增）

#### 5.1 获取隐性信息

**接口**：`GET /api/user/implicit-traits`

**请求头**：
```
Authorization: Bearer <token>
```

**响应**：
```typescript
{
  success: true,
  data: {
    inferred_roles?: string[];
    interest_tags?: string[];
    risk_tolerance?: 'low' | 'medium' | 'high';
    interaction_style?: 'concise' | 'detailed';
    last_active_topic?: string;
    family_structure?: {
      has_spouse?: boolean;
      has_children?: boolean;
      children_count?: number;
    };
    profession_hints?: string[];
  }
}
```

**示例响应**：
```json
{
  "success": true,
  "data": {
    "inferred_roles": ["parent", "spouse"],
    "interest_tags": ["wealth", "career", "relationship"],
    "risk_tolerance": "medium",
    "interaction_style": "detailed",
    "last_active_topic": "career",
    "family_structure": {
      "has_spouse": true,
      "has_children": true,
      "children_count": 1
    },
    "profession_hints": ["designer", "creative"]
  }
}
```

---

#### 5.2 更新隐性信息（系统内部调用）

**接口**：`POST /api/user/implicit-traits`

**权限**：需要管理员权限或系统调用（内部接口）

**请求头**：
```
Authorization: Bearer <system_token>
Content-Type: application/json
```

**请求体**：
```typescript
{
  userId: string; // 目标用户ID（系统调用时需要）
  inferred_roles?: string[];
  interest_tags?: string[];
  risk_tolerance?: 'low' | 'medium' | 'high';
  interaction_style?: 'concise' | 'detailed';
  last_active_topic?: string;
  family_structure?: {
    has_spouse?: boolean;
    has_children?: boolean;
    children_count?: number;
  };
  profession_hints?: string[];
}
```

**响应**：
```typescript
{
  success: true,
  data: {
    // 合并后的完整隐性信息
    inferred_roles?: string[];
    interest_tags?: string[];
    // ... 其他字段
  },
  message?: string
}
```

**业务逻辑**（权限控制 + Token熔断）：
1. **权限检查**：验证调用者是否有权限（管理员或系统调用）
2. **Token限制**：检查隐性信息内容长度，防止Token爆炸（最多200 tokens）
3. 获取现有隐性信息
4. 合并数组字段（去重）
5. 深度合并对象字段
6. 更新标量字段
7. **截断处理**：如果超过Token限制，自动截断数组字段
8. 保存到数据库

**错误响应**：
```typescript
{
  success: false,
  error: 'FORBIDDEN',
  message: '无权访问此接口'
}
```

---

#### 5.3 删除隐性信息（用户操作）

**接口**：`DELETE /api/user/implicit-traits`

**请求头**：
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**：
```typescript
{
  fields?: string[]; // 要删除的字段，如 ["inferred_roles", "interest_tags"]
  // 如果不提供 fields，删除所有隐性信息
}
```

**响应**：
```typescript
{
  success: true,
  data: {
    deleted: string[]; // 已删除的字段列表
  },
  message?: string
}
```

**示例请求**：
```json
{
  "fields": ["inferred_roles", "interest_tags"]
}
```

**示例响应**：
```json
{
  "success": true,
  "data": {
    "deleted": ["inferred_roles", "interest_tags"]
  },
  "message": "已删除指定的隐性信息"
}
```

---

## 📊 数据验证规则

### 1. MBTI类型验证

**有效值**：
```
'INTJ', 'INTP', 'ENTJ', 'ENTP',
'INFJ', 'INFP', 'ENFJ', 'ENFP',
'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
'ISTP', 'ISFP', 'ESTP', 'ESFP'
```

### 2. 能量状态验证

**有效值**：`'strong' | 'weak' | 'balanced'`

### 3. 风险偏好验证

**有效值**：`'low' | 'medium' | 'high'`

### 4. 交互风格验证

**有效值**：`'concise' | 'detailed'`

### 5. 日期格式验证

**birthDate**：ISO 8601 日期格式，如 `"1990-01-15"`

**birthTime**：24小时制时间格式，如 `"14:30"`

### 6. 字符串长度限制

- `currentStatus`：最大500字符
- `profession`：最大100字符
- `identity`：最大200字符
- `wishes`：每个元素最大50字符，最多10个元素

---

## 🔄 业务流程示例

### 场景1：用户首次填写命主名刺

1. **前端调用**：`PUT /api/user/destiny-card`
   ```json
   {
     "mbti": "INTP",
     "profession": "独立开发者"
   }
   ```

2. **后端处理**：
   - 检测到新增字段：`mbti`, `profession`
   - 更新 `preferences.userContext`
   - 计算完整度：10 + 10 = 20分
   - 发放奖励：+5（MBTI）+ 5（职业）= 10天机币

3. **后端响应**：
   ```json
   {
     "success": true,
     "data": {
       "mbti": "INTP",
       "profession": "独立开发者",
       "completeness": 20,
       "rewardGranted": [
         { "coins": 5, "reason": "完善MBTI信息", "field": "mbti" },
         { "coins": 5, "reason": "完善职业信息", "field": "profession" }
       ]
     }
   }
   ```

### 场景2：用户更新生辰信息

1. **前端调用**：`PUT /api/user/profile`
   ```json
   {
     "birth_date": "1990-01-15",
     "gender": "male"
   }
   ```

2. **后端处理**：
   - 更新 `profiles.birth_date`
   - **自动触发**：`syncBirthdayToUserContext`
   - 同步到 `preferences.userContext`
   - 尝试生成命格法相（如果有命盘数据）
   - 重新计算完整度：40（生辰）+ 20（已有）= 60分
   - 检查阈值奖励：达到50分阈值，发放20天机币

3. **后端响应**：
   ```json
   {
     "success": true,
     "data": {
       "birth_date": "1990-01-15",
       "gender": "male",
       "completeness": 60,
       "preferences": {
         "userContext": {
           "identity": "紫微七杀·化杀为权"
         }
       }
     },
     "message": "生辰信息已同步到命主名刺，命格法相已生成"
   }
   ```

### 场景3：系统提取隐性信息

1. **触发时机**：AI解读完成时（异步队列）

2. **系统调用**：`POST /api/user/implicit-traits`
   ```json
   {
     "userId": "user-123",
     "inferred_roles": ["parent"],
     "interest_tags": ["education"],
     "family_structure": {
       "has_children": true,
       "children_count": 1
     }
   }
   ```

3. **后端处理**：
   - 获取现有隐性信息
   - 合并数组字段（去重）
   - 深度合并对象字段
   - 保存到数据库

4. **后端响应**：
   ```json
   {
     "success": true,
     "data": {
       "inferred_roles": ["parent", "spouse"], // 合并后
       "interest_tags": ["wealth", "career", "education"], // 合并后
       "family_structure": {
         "has_spouse": true,
         "has_children": true,
         "children_count": 1
       }
     }
   }
   ```

---

## ✅ 测试用例

### 测试用例1：获取命主名刺（空数据）

**请求**：`GET /api/user/destiny-card`

**预期响应**：
```json
{
  "success": true,
  "data": {
    "completeness": 0,
    "lastUpdated": "2026-01-31T10:00:00Z"
  }
}
```

### 测试用例2：更新命主名刺（新增字段）

**请求**：`PUT /api/user/destiny-card`
```json
{
  "mbti": "INTP"
}
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "mbti": "INTP",
    "completeness": 10,
    "rewardGranted": [
      { "coins": 5, "reason": "完善MBTI信息", "field": "mbti" }
    ]
  }
}
```

### 测试用例3：同步生辰信息

**请求**：`POST /api/user/sync-birthday-to-context`
```json
{
  "birthDate": "1990-01-15",
  "gender": "male"
}
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "synced": true,
    "userContextUpdated": true
  }
}
```

---

## 📚 相关文档

- [用户数字孪生系统-后端开发指南](./用户数字孪生系统-后端开发指南.md)
- [用户数字孪生系统重构方案](../memory-bank/plans/system/260131-用户数字孪生系统重构方案.md)

---

## 🔄 更新日志

- **2026-01-31**：创建初始API接口规范文档
- **2026-01-31**：深度优化补充
  - 响应体增强：添加 `events` 字段，支持前端即时反馈
  - 安全性增强：添加权限控制和前端脱敏说明
  - 幂等性保证：添加奖励发放的幂等性检查
  - Token熔断：添加隐性信息的Token限制说明

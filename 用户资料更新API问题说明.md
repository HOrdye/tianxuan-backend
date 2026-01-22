# 用户资料更新 API 问题说明

**创建时间**: 2026年1月9日  
**问题类型**: 后端 API 返回数据不完整  
**优先级**: 🔴 **高** - 影响用户资料更新功能

---

## 📋 问题描述

### 现象

前端调用 `PUT /api/user/profile` 更新用户资料时，传递了 `user_metadata: {birthday: '1989-12-11'}`，但后端返回的响应中 `user_metadata` 字段不完整，缺少 `birthday` 字段。

### 前端请求示例

```json
PUT /api/user/profile
{
  "username": "test2",
  "user_metadata": {
    "birthday": "1989-12-11"
  }
}
```

### 后端返回示例（当前）

```json
{
  "success": true,
  "data": {
    "id": "25115bfa-2b35-4dca-8aba-9c5abef2ef72",
    "email": "test2@qq.com",
    "username": "test2",
    "avatar_url": null,
    "user_metadata": {
      "username": "test2",
      "avatar_url": null
      // ❌ 缺少 birthday 字段
    }
  }
}
```

### 期望的后端返回

```json
{
  "success": true,
  "data": {
    "id": "25115bfa-2b35-4dca-8aba-9c5abef2ef72",
    "email": "test2@qq.com",
    "username": "test2",
    "avatar_url": null,
    "user_metadata": {
      "username": "test2",
      "avatar_url": null,
      "birthday": "1989-12-11"  // ✅ 应该包含所有传递的字段
    }
  }
}
```

---

## 🔍 问题分析

### 前端代码位置

1. **发送请求**: `src/views/ProfileEdit.vue` (第340-350行)
   ```typescript
   const metadata: any = {};
   if (profileData.value.birthday) {
     metadata.birthday = profileData.value.birthday;
   }
   
   updateData.user_metadata = {
     ...(userStore.userInfo?.user_metadata || {}),
     ...metadata,
   };
   ```

2. **API 调用**: `src/api/modules/user.ts`
   ```typescript
   updateProfile(data: Partial<User>) {
     return request.put<any, ApiResponse<User>>('/user/profile', data);
   }
   ```

3. **Store 处理**: `src/stores/userStore.enhanced.ts` (第620-651行)
   ```typescript
   const res = await userApi.updateProfile(data);
   if (res.success) {
     userInfo.value = res.data;  // 直接使用后端返回的数据
   }
   ```

### 前端读取逻辑

前端在多个地方需要读取 `user_metadata.birthday`：

1. **ZiweiHome.vue** (第318-331行)
   ```typescript
   // 检查 birthday（ProfileEdit.vue 中使用的字段名）
   if (userMeta.birthday) {
     // 解析日期...
   }
   ```

2. **ChartInput.vue** (第468-487行)
   ```typescript
   const birthDate = getUserBirthDate();
   if (birthDate) {
     birthInfo.year = birthDate.year;
     birthInfo.month = birthDate.month;
     birthInfo.day = birthDate.day;
   }
   ```

---

## ⚠️ 后端需要修复的问题

### 问题1：`PUT /api/user/profile` 返回数据不完整

**当前行为**：
- 后端接收了 `user_metadata.birthday`
- 可能保存到了数据库（需要确认）
- 但返回时没有包含 `user_metadata.birthday`

**期望行为**：
- 后端应该保存 `user_metadata` 中的所有字段
- 返回时应该包含完整的 `user_metadata`，包括所有传递的字段

### 问题2：`GET /api/user/profile` 和 `GET /api/auth/me` 返回数据不一致

**需要确认**：
- `GET /api/user/profile` 返回的 `user_metadata` 是否包含 `birthday`
- `GET /api/auth/me` 返回的 `user_metadata` 是否包含 `birthday`
- 两个接口返回的数据结构是否一致

---

## 📝 后端修复建议

### 方案1：确保返回完整的 user_metadata（推荐）

在 `PUT /api/user/profile` 接口中：

1. **接收请求**：
   ```typescript
   {
     username?: string;
     avatar_url?: string;
     user_metadata?: {
       birthday?: string;
       gender?: string;
       bio?: string;
       location?: string;
       website?: string;
       [key: string]: any;  // 允许其他扩展字段
     };
   }
   ```

2. **保存到数据库**：
   - 如果数据库有 `profiles.birthday` 字段，保存到该字段
   - 同时保存到 `user_metadata` JSONB 字段（如果存在）
   - 或者统一保存到 `profiles.user_metadata` JSONB 字段

3. **返回响应**：
   ```typescript
   {
     success: true,
     data: {
       id: string;
       email: string;
       username: string;
       avatar_url?: string;
       user_metadata: {
         username: string;
         avatar_url?: string;
         birthday?: string;  // ✅ 必须包含
         gender?: string;
         bio?: string;
         location?: string;
         website?: string;
         // ... 其他所有传递的字段
       };
     }
   }
   ```

### 方案2：字段映射处理

如果后端将 `user_metadata.birthday` 保存到了 `profiles.birthday` 字段，需要在返回时进行映射：

```typescript
// 后端返回时
const response = {
  id: profile.id,
  email: profile.email,
  username: profile.username,
  avatar_url: profile.avatar_url,
  user_metadata: {
    username: profile.username,
    avatar_url: profile.avatar_url,
    birthday: profile.birthday,  // ✅ 从 profiles.birthday 映射到 user_metadata.birthday
    gender: profile.gender,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    // ... 其他字段
  }
};
```

---

## 🔧 数据库字段映射说明

### 前端期望的数据结构

前端使用 `User` 类型，包含：
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  user_metadata?: {
    username?: string;
    avatar_url?: string;
    birthday?: string;      // ⚠️ 前端期望在这里
    gender?: string;
    bio?: string;
    location?: string;
    website?: string;
    [key: string]: any;
  };
}
```

### 数据库表结构（推测）

根据 `src/types/database.ts`，`profiles` 表可能包含：
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  birthday DATE,           -- 可能存储在这里
  gender TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  user_metadata JSONB,      -- 或者存储在这里
  ...
);
```

### 字段映射建议

**选项A：统一存储在 `user_metadata` JSONB 字段**
- 优点：灵活，易于扩展
- 缺点：查询性能可能略低

**选项B：重要字段存储在独立列，同时同步到 `user_metadata`**
- 优点：查询性能好，同时兼容前端
- 缺点：需要维护数据一致性

**选项C：返回时进行字段映射**
- 优点：数据库结构不变
- 缺点：需要在每个接口都做映射

---

## 🧪 测试步骤

### 1. 测试更新用户资料

```bash
# 请求
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "test2",
  "user_metadata": {
    "birthday": "1989-12-11",
    "gender": "male"
  }
}

# 期望响应
{
  "success": true,
  "data": {
    "id": "...",
    "username": "test2",
    "user_metadata": {
      "username": "test2",
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"            // ✅ 必须包含
    }
  }
}
```

### 2. 测试查询用户资料

```bash
# 请求
GET /api/user/profile
Authorization: Bearer <token>

# 期望响应
{
  "success": true,
  "data": {
    "id": "...",
    "username": "test2",
    "user_metadata": {
      "username": "test2",
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"            // ✅ 必须包含
    }
  }
}
```

### 3. 测试获取当前用户

```bash
# 请求
GET /api/auth/me
Authorization: Bearer <token>

# 期望响应
{
  "success": true,
  "data": {
    "id": "...",
    "username": "test2",
    "user_metadata": {
      "username": "test2",
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"            // ✅ 必须包含
    }
  }
}
```

---

## 📋 检查清单

后端开发人员需要确认：

- [ ] `PUT /api/user/profile` 是否正确保存了 `user_metadata` 中的所有字段
- [ ] `PUT /api/user/profile` 返回时是否包含了完整的 `user_metadata`
- [ ] `GET /api/user/profile` 返回的 `user_metadata` 是否完整
- [ ] `GET /api/auth/me` 返回的 `user_metadata` 是否完整
- [ ] 三个接口返回的 `user_metadata` 结构是否一致
- [ ] 数据库字段映射是否正确（`profiles.birthday` vs `user_metadata.birthday`）

---

## 🚨 影响范围

### 受影响的页面/功能

1. **ProfileEdit.vue** - 用户资料编辑页面
   - 用户更新生日后，无法立即看到更新结果
   - 需要刷新页面才能看到更新

2. **ZiweiHome.vue** - 紫微斗数首页
   - 无法检测到用户是否有出生信息
   - 无法自动填充"我的命盘"的生辰信息

3. **ChartInput.vue** - 命盘输入页面
   - 无法自动填充用户的出生信息
   - 用户需要手动输入，即使已经在个人资料中设置了

### 用户体验影响

- ⚠️ 用户更新生日后，紫微斗数功能无法自动识别
- ⚠️ 用户需要重复输入出生信息
- ⚠️ 数据不一致，导致功能异常

---

## 💡 临时解决方案（前端）

如果后端暂时无法修复，前端可以：

1. **在更新成功后立即刷新用户信息**：
   ```typescript
   await userStore.updateProfile(updateData);
   await userStore.initialize();  // 重新加载用户信息
   ```

2. **手动合并 user_metadata**（不推荐，只是临时方案）：
   ```typescript
   if (res.success && data.user_metadata) {
     userInfo.value.user_metadata = {
       ...res.data.user_metadata,
       ...data.user_metadata
     };
   }
   ```

**但最佳方案是后端修复**，确保返回完整的数据。

---

## 📞 联系方式

如有疑问，请参考：
1. 前端代码：`src/views/ProfileEdit.vue` (第340-350行)
2. API 调用：`src/api/modules/user.ts`
3. Store 处理：`src/stores/userStore.enhanced.ts` (第620-651行)

---

**维护者**: 开发团队  
**最后更新**: 2026年1月9日

---

## ✅ 修复完成说明

**修复时间**: 2026年1月9日  
**修复状态**: ✅ **已完成**

### 修复内容

1. **添加了数据格式转换函数** (`formatProfileForFrontend`)
   - 将数据库的扁平结构转换为前端期望的 `user_metadata` 格式
   - 确保所有字段（包括 `birthday`）都包含在 `user_metadata` 中

2. **修改了 `updateProfile` 函数**
   - 支持处理前端发送的 `user_metadata` 对象
   - 自动提取 `user_metadata` 中的字段更新到数据库
   - 返回时自动转换为前端期望的格式

3. **修改了 `getProfile` 函数**
   - 默认返回包含 `user_metadata` 的前端格式
   - 确保所有字段都正确包含

4. **修改了 `getCurrentUser` 接口**
   - 返回完整的用户资料，包含 `user_metadata`

### 修改的文件

- `src/services/user.service.ts` - 添加了格式转换函数和处理逻辑
- `src/controllers/user.controller.ts` - 自动使用新的格式（无需修改）
- `src/controllers/auth.controller.ts` - 返回完整的用户资料格式

### 测试验证

请按照以下步骤测试修复是否成功：

#### 1. 测试更新用户资料（包含 birthday）

```bash
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "test2",
  "user_metadata": {
    "birthday": "1989-12-11",
    "gender": "male"
  }
}
```

**期望响应**：
```json
{
  "success": true,
  "message": "资料更新成功",
  "data": {
    "id": "...",
    "email": "test2@qq.com",
    "username": "test2",
    "avatar_url": null,
    "user_metadata": {
      "username": "test2",
      "avatar_url": null,
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"             // ✅ 必须包含
    }
  }
}
```

#### 2. 测试获取用户资料

```bash
GET /api/user/profile
Authorization: Bearer <token>
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "username": "test2",
    "user_metadata": {
      "username": "test2",
      "avatar_url": null,
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"            // ✅ 必须包含
    }
  }
}
```

#### 3. 测试获取当前用户

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "username": "test2",
    "user_metadata": {
      "username": "test2",
      "avatar_url": null,
      "birthday": "1989-12-11",  // ✅ 必须包含
      "gender": "male"            // ✅ 必须包含
    }
  }
}
```

### 前端验证

修复后，前端应该能够：

1. ✅ 更新生日后，立即在响应中看到 `user_metadata.birthday`
2. ✅ 紫微斗数功能能够自动识别用户的出生信息
3. ✅ 无需刷新页面即可看到更新结果
4. ✅ `ZiweiHome.vue` 能够检测到 `user_metadata.birthday`
5. ✅ `ChartInput.vue` 能够自动填充用户的出生信息

### 注意事项

- 所有三个接口（`PUT /api/user/profile`、`GET /api/user/profile`、`GET /api/auth/me`）现在都返回一致的 `user_metadata` 格式
- 数据库中的字段（如 `profiles.birthday`）会自动映射到 `user_metadata.birthday`
- 前端发送的 `user_metadata` 对象会被正确处理和保存
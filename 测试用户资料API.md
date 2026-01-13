# 测试用户资料 API

**创建时间**: 2026年1月11日  
**目的**: 验证用户资料 API 是否正确返回 `user_metadata.birthday`

---

## 🧪 测试步骤

### 1. 测试 GET /api/user/profile

使用以下命令测试获取用户资料接口：

```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <你的token>" \
  -H "Content-Type: application/json"
```

**期望响应**：
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
      "birthday": "1988-12-11",  // ✅ 必须包含
      "gender": null,
      "bio": null,
      "location": null,
      "website": null,
      "phone": null
    },
    "birthday": "1988-12-11",
    "gender": null,
    "bio": null,
    "location": null,
    "website": null,
    "phone": null
  }
}
```

### 2. 测试 GET /api/auth/me

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <你的token>" \
  -H "Content-Type: application/json"
```

**期望响应**：
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
      "birthday": "1988-12-11",  // ✅ 必须包含
      "gender": null,
      "bio": null,
      "location": null,
      "website": null,
      "phone": null
    }
  }
}
```

---

## 🔍 检查点

### 检查点 1：user_metadata 是否存在

确认响应中包含 `user_metadata` 对象。

### 检查点 2：birthday 字段是否存在

确认 `user_metadata.birthday` 字段存在，且值为 `"1988-12-11"`。

### 检查点 3：日期格式

确认 `birthday` 的格式：
- ✅ 正确：`"1988-12-11"` (YYYY-MM-DD)
- ✅ 正确：`"1988-12-11T00:00:00.000Z"` (ISO 格式)
- ❌ 错误：`null` 或 `undefined`

---

## 🐛 如果发现问题

### 问题 1：user_metadata 不存在

**现象**: 响应中没有 `user_metadata` 字段

**可能原因**:
- `formatProfileForFrontend` 函数没有被调用
- `getProfile` 函数的 `formatForFrontend` 参数为 `false`

**解决方案**:
- 检查 `getProfile` 调用时是否传递了 `formatForFrontend: true`（默认值应该是 `true`）

### 问题 2：user_metadata.birthday 不存在

**现象**: `user_metadata` 存在，但没有 `birthday` 字段

**可能原因**:
- `formatProfileForFrontend` 函数中 `birthday` 字段处理有问题
- 数据库中的 `birthday` 字段为 `null`

**解决方案**:
- 检查 `formatProfileForFrontend` 函数
- 确认数据库中的 `birthday` 字段值

### 问题 3：birthday 值为 null

**现象**: `user_metadata.birthday` 存在，但值为 `null`

**可能原因**:
- 数据库中的 `birthday` 字段为 `null`
- `formatProfileForFrontend` 函数将 `null` 转换为 `null`（这是正确的）

**解决方案**:
- 确认数据库中的 `birthday` 字段值
- 如果数据库中确实有值，检查 `formatProfileForFrontend` 函数

---

## 📝 测试结果记录

请记录测试结果：

- [ ] GET /api/user/profile 返回了 `user_metadata`
- [ ] GET /api/user/profile 返回了 `user_metadata.birthday`
- [ ] `user_metadata.birthday` 的值为 `"1988-12-11"`（或正确的日期）
- [ ] GET /api/auth/me 返回了 `user_metadata`
- [ ] GET /api/auth/me 返回了 `user_metadata.birthday`
- [ ] 两个接口返回的数据结构一致

---

**维护者**: 开发团队  
**最后更新**: 2026年1月11日

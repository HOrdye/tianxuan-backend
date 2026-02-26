# 合盘功能 - 后端完成总结与前端校验文档

## 一、后端完成情况总结

### 1. 数据库
- **迁移脚本**: `scripts/migration-create-compatibility-archives-table.sql`
- **表名**: `compatibility_archives`
- **字段**: `id`, `user_id`, `chart_a`(JSONB), `chart_b`(JSONB), `name`, `notes`, `tags`(TEXT[]), `created_at`, `updated_at`
- **外键**: `user_id` → `auth.users(id)` ON DELETE CASCADE
- **索引**: `user_id`, `created_at DESC`
- **部署**: 上线前需执行上述 SQL 迁移

### 2. API 实现
| 能力 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 创建合盘 | POST | `/api/astrology/compatibility` | 需认证，Body 见下 |
| 合盘列表 | GET | `/api/astrology/compatibility` | 需认证，支持 limit/offset/keyword |
| 合盘详情 | GET | `/api/astrology/compatibility/:id` | 需认证 |
| 删除合盘 | DELETE | `/api/astrology/compatibility/:id` | 需认证 |

### 3. 请求与响应约定
- 所有接口需在 Header 中携带: `Authorization: Bearer <token>`
- 成功: `{ success: true, data: ... }`，失败: `{ success: false, error: string, message?: string }`
- 列表与详情返回字段均为 **snake_case**（如 `chart_a`、`created_at`）

---

## 二、前端适配与校验说明（给前端核对用）

### 2.1 创建合盘存档

- **请求**: `POST /api/astrology/compatibility`
- **Body**: JSON，字段可传 **camelCase 或 snake_case**，后端均接受  
  - `chartA` 或 `chart_a`（必填）：完整 ZiweiChart 对象  
  - `chartB` 或 `chart_b`（必填）：完整 ZiweiChart 对象  
  - `name`（必填）：合盘名称  
  - `notes`（可选）：备注  
  - `tags`（可选）：字符串数组  

- **成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "合盘名称",
    "created_at": "2025-02-12T00:00:00.000Z"
  }
}
```

- **校验点**:  
  - 请求体至少包含 chart_a/chartA、chart_b/chartB、name；  
  - 响应中能正确使用 `data.id`、`data.name`、`data.created_at` 做展示或跳转。

---

### 2.2 获取合盘列表

- **请求**: `GET /api/astrology/compatibility`
- **Query 参数**（均为可选）:
  - `limit`: 分页大小，默认 20，最大 100  
  - `offset`: 分页偏移，默认 0  
  - `keyword`: 搜索关键词，匹配 name、notes、tags  

- **成功响应** (200):
```json
{
  "success": true,
  "data": {
    "archives": [
      {
        "id": "uuid",
        "name": "合盘名称",
        "tags": ["朋友", "同事"],
        "created_at": "2025-02-12T00:00:00.000Z"
      }
    ],
    "total": 10
  }
}
```

- **校验点**:  
  - 列表只含元数据，无 `chart_a`/`chart_b`；  
  - 分页用 `data.archives` 与 `data.total`；  
  - 搜索时传 `keyword`，结果与 name/notes/tags 匹配。

---

### 2.3 获取合盘详情

- **请求**: `GET /api/astrology/compatibility/:id`
- **路径参数**: `id` 为合盘存档 UUID

- **成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "chart_a": { /* ZiweiChart */ },
    "chart_b": { /* ZiweiChart */ },
    "name": "合盘名称",
    "notes": "备注",
    "tags": ["朋友"],
    "created_at": "2025-02-12T00:00:00.000Z",
    "updated_at": "2025-02-12T00:00:00.000Z"
  }
}
```

- **校验点**:  
  - 详情含完整 `chart_a`、`chart_b`，前端按现有 ZiweiChart 结构渲染；  
  - 若 id 不存在或非当前用户数据，后端返回 404。

---

### 2.4 删除合盘存档

- **请求**: `DELETE /api/astrology/compatibility/:id`
- **路径参数**: `id` 为合盘存档 UUID

- **成功响应** (200):
```json
{
  "success": true,
  "data": {}
}
```

- **校验点**:  
  - 删除成功后仅需判断 `success === true`；  
  - 若 id 不存在或非当前用户，后端返回 404。

---

## 三、字段名约定（前后端对齐）

| 前端常用 (camelCase) | 后端请求 Body 可接受 | 后端响应 (data 内) |
|---------------------|----------------------|---------------------|
| chartA              | chartA 或 chart_a    | chart_a             |
| chartB              | chartB 或 chart_b    | chart_b             |
| -                   | -                    | user_id             |
| -                   | -                    | created_at           |
| -                   | -                    | updated_at           |

- **请求**: 创建接口 body 可任选 camelCase 或 snake_case，后端兼容。  
- **响应**: 所有接口的 `data` 均为 **snake_case**，前端若使用 camelCase 需在己方做一层转换。

---

## 四、错误响应示例（供前端统一处理）

- **401 未认证**: `{ success: false, error: "未认证", message?: string }`
- **400 参数错误**: `{ success: false, error: "参数错误", message?: string }`（如缺 chart_a/chart_b/name）
- **404 不存在/无权限**: `{ success: false, error: "资源不存在", message?: string }`
- **500 服务器错误**: `{ success: false, error: "...", message?: string }`

---

## 五、前端自测检查清单

- [ ] 创建：传 chartA/chartB/name（或 chart_a/chart_b/name），能拿到 id 并展示/跳转
- [ ] 列表：默认与带 limit/offset 分页正常，total 与条数一致
- [ ] 列表：带 keyword 时结果与 name/notes/tags 匹配
- [ ] 详情：用列表项 id 请求详情，能拿到 chart_a、chart_b 并正确渲染
- [ ] 删除：成功后列表刷新或移除对应项；无权限/不存在时按 404 提示
- [ ] 所有请求均带 `Authorization: Bearer <token>`，未登录时为 401

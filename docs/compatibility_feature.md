# 紫微斗数合盘功能 - 后端开发文档

## 1. 概述
本文档描述了紫微斗数“合盘”功能的后端设计，包括数据库 Schema 变更和 API 接口定义。
合盘功能允许用户输入两个人的生辰信息，生成并对比两张命盘，并保存对比记录。

## 2. 数据库设计 (Schema)

### 新增表: `compatibility_archives`

用于存储合盘记录。

```sql
CREATE TABLE compatibility_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 命盘 A 的完整数据（快照）
  chart_a JSONB NOT NULL,
  
  -- 命盘 B 的完整数据（快照）
  chart_b JSONB NOT NULL,
  
  -- 合盘名称，例如 "我与张三"
  name TEXT NOT NULL,
  
  -- 备注
  notes TEXT,
  
  -- 标签
  tags TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_compatibility_archives_user_id ON compatibility_archives(user_id);
CREATE INDEX idx_compatibility_archives_created_at ON compatibility_archives(created_at DESC);
```

> **设计说明**:
> 1. 我们存储完整的 `chart_a` 和 `chart_b` JSON 数据，而不是引用 `archives` 表的 ID。这是为了确保合盘记录是独立的“快照”，即使原单人存档被删除或修改，合盘记录也不受影响。
> 2. `chart_a` 通常代表“我”或“主视角”，`chart_b` 代表“对方”。

## 3. API 接口定义

### 3.1 创建合盘存档

*   **Endpoint**: `POST /api/astrology/compatibility`
*   **Auth**: Required

**Request Body**:
```json
{
  "chart_a": { ... }, // 完整 ZiweiChart 对象
  "chart_b": { ... }, // 完整 ZiweiChart 对象
  "name": "我和李四的合盘",
  "notes": "备注信息",
  "tags": ["朋友", "同事"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "user_id": "uuid...",
    "name": "我和李四的合盘",
    "created_at": "..."
  }
}
```

### 3.2 获取合盘列表

*   **Endpoint**: `GET /api/astrology/compatibility`
*   **Auth**: Required
*   **Query Params**:
    *   `limit`: 分页大小 (default 20)
    *   `offset`: 分页偏移 (default 0)
    *   `keyword`: 搜索关键词 (匹配 name 或 notes)

**Response**:
```json
{
  "success": true,
  "data": {
    "archives": [
      {
        "id": "uuid...",
        "name": "我和李四的合盘",
        "tags": ["朋友"],
        "created_at": "..."
        // 注意：列表接口不返回庞大的 chart_a/chart_b 数据，只返回元数据
      }
    ],
    "total": 10
  }
}
```

### 3.3 获取合盘详情

*   **Endpoint**: `GET /api/astrology/compatibility/:id`
*   **Auth**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid...",
    "chart_a": { ... },
    "chart_b": { ... },
    "name": "...",
    "notes": "...",
    "tags": [],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### 3.4 删除合盘存档

*   **Endpoint**: `DELETE /api/astrology/compatibility/:id`
*   **Auth**: Required

**Response**:
```json
{
  "success": true
}
```

## 4. 字段映射 (Frontend <-> Backend)

| 前端字段 (CamelCase) | 后端字段 (SnakeCase) | 说明 |
| :--- | :--- | :--- |
| `chartA` | `chart_a` | |
| `chartB` | `chart_b` | |
| `userId` | `user_id` | |
| `createdAt` | `created_at` | |
| `updatedAt` | `updated_at` | |

前端 Service 层需要负责进行字段格式转换。

# 紫微斗数 API 开发规范

**创建时间**: 2026年1月9日  
**目标**: 为后端开发人员提供紫微斗数相关 API 开发的完整规范，避免定义错误和兼容性问题  
**状态**: 📋 **规范文档** - 基于前端实际使用情况整理

---

## 📋 目录

1. [API 接口清单](#api-接口清单)
2. [数据结构定义](#数据结构定义)
3. [关键注意事项](#关键注意事项)
4. [前端使用方式](#前端使用方式)
5. [常见错误和避免方法](#常见错误和避免方法)

---

## 🔌 API 接口清单

### 已实现的 API

#### 1. 保存/更新命盘
- **接口**: `POST /api/astrology/star-chart`
- **状态**: ✅ 已实现
- **请求体**:
  ```typescript
  {
    chart_data: {
      birthInfo: BirthInfo;        // 出生信息（必填）
      createdAt: string;            // ISO 8601 格式日期字符串
      id?: string;                  // 命盘ID（可选，更新时提供）
      palaces?: any[];              // 宫位数据（可选）
      mingZhu?: string;             // 命主星（可选）
      shenZhu?: string;             // 身主星（可选）
    }
  }
  ```
- **响应**: `ApiResponse<StarChart>`
- **说明**: 
  - 前端会传递完整的 `chart_data` 对象
  - 后端应保存 `chart_data` 到 `chart_structure` 字段（JSONB）
  - 如果提供了 `id`，则为更新操作；否则为创建操作

#### 2. 查询命盘
- **接口**: `GET /api/astrology/star-chart`
- **状态**: ✅ 已实现
- **响应**: `ApiResponse<StarChart>`
- **说明**:
  - 返回当前用户的命盘数据
  - 如果用户没有命盘，返回 `success: false` 或 `data: null`
  - 前端会从 `chart_data` 字段读取数据

#### 3. 解锁时空资产
- **接口**: `POST /api/astrology/time-assets/unlock`
- **状态**: ✅ 已实现
- **请求体**:
  ```typescript
  {
    startTime: string;  // ISO 8601 格式日期字符串
    endTime: string;    // ISO 8601 格式日期字符串
  }
  ```
- **响应**: `ApiResponse<UnlockedTimeAsset>`

#### 4. 查询已解锁资产
- **接口**: `GET /api/astrology/time-assets`
- **状态**: ✅ 已实现
- **响应**: `ApiResponse<UnlockedTimeAsset[]>`

### 待开发的 API

#### 5. 查询命盘存档列表
- **接口**: `GET /api/astrology/archives`
- **状态**: 🚧 待开发
- **查询参数**:
  ```typescript
  {
    relationshipType?: RelationshipType;  // 关系类型筛选
    keyword?: string;                    // 搜索关键词（匹配名称、备注、标签）
    limit?: number;                      // 分页大小
    offset?: number;                     // 分页偏移
  }
  ```
- **响应**: `ApiResponse<ChartArchiveSummary[]>`
- **说明**: 返回摘要列表，不包含完整命盘数据（性能优化）

#### 6. 创建命盘存档
- **接口**: `POST /api/astrology/archives`
- **状态**: 🚧 待开发
- **请求体**:
  ```typescript
  {
    chart: ZiweiChart;              // 完整命盘数据
    name: string;                   // 命盘名称（必填）
    relationshipType: RelationshipType;  // 关系类型（必填）
    customLabel?: string;           // 自定义标签（可选）
    notes?: string;                 // 备注（可选）
    tags?: string[];                // 标签列表（可选）
  }
  ```
- **响应**: `ApiResponse<{ archiveId: string }>`

#### 7. 更新命盘存档
- **接口**: `PUT /api/astrology/archives/:archiveId`
- **状态**: 🚧 待开发
- **请求体**:
  ```typescript
  {
    name?: string;
    relationshipType?: RelationshipType;
    customLabel?: string;
    notes?: string;
    tags?: string[];
    chart?: ZiweiChart;  // 可选：更新命盘数据
  }
  ```
- **响应**: `ApiResponse<ChartArchive>`

#### 8. 删除命盘存档
- **接口**: `DELETE /api/astrology/archives/:archiveId`
- **状态**: 🚧 待开发
- **响应**: `ApiResponse<{ success: boolean }>`
- **说明**: 
  - 需要验证用户权限（只能删除自己的存档）
  - 如果删除的是"我的命盘"（`relationshipType === 'self'`），需要同时清理相关数据源

#### 9. 查询单个命盘存档
- **接口**: `GET /api/astrology/archives/:archiveId`
- **状态**: 🚧 待开发
- **响应**: `ApiResponse<ChartArchive>`
- **说明**: 返回完整存档数据，包括完整命盘

---

## 📊 数据结构定义

### 1. BirthInfo（出生信息）

**⚠️ 关键注意事项**：这是最重要的数据结构，必须严格按照定义实现。

```typescript
interface BirthInfo {
  year: number;              // 出生年份（必填，范围：1800-2100）
  month: number;             // 出生月份（必填，范围：1-12）
  day: number;               // 出生日期（必填，范围：1-31）
  hour: number;              // ⚠️ 时辰索引（必填，范围：0-11，不是24小时制！）
  gender: 'male' | 'female'; // 性别（必填）
  
  // 农历相关（可选）
  lunarYear?: number;        // 农历年份
  lunarMonth?: number;       // 农历月份
  lunarDay?: number;         // 农历日期
  isLeapMonth?: boolean;     // 是否为闰月
  isLeapDay?: boolean;       // 是否为闰日
}
```

**⚠️ 时辰索引说明**（非常重要）：
- `hour` 字段是**时辰索引**，不是24小时制的时间
- 取值范围：`0-11`
- 映射关系：
  - `0` = 子时 (23:00-01:00)
  - `1` = 丑时 (01:00-03:00)
  - `2` = 寅时 (03:00-05:00)
  - `3` = 卯时 (05:00-07:00)
  - `4` = 辰时 (07:00-09:00)
  - `5` = 巳时 (09:00-11:00)
  - `6` = 午时 (11:00-13:00)
  - `7` = 未时 (13:00-15:00)
  - `8` = 申时 (15:00-17:00)
  - `9` = 酉时 (17:00-19:00)
  - `10` = 戌时 (19:00-21:00)
  - `11` = 亥时 (21:00-23:00)

**常见错误**：
- ❌ 错误：将 `hour` 理解为 24 小时制（0-23）
- ✅ 正确：`hour` 是时辰索引（0-11）

### 2. ZiweiChart（完整紫微命盘）

```typescript
interface ZiweiChart {
  id?: string;                    // 命盘唯一标识（可选）
  birthInfo: BirthInfo;           // 出生信息（必填）
  wuxingJu: WuxingJu;             // 五行局（必填）
  palaces: Palace[];               // 宫位数组（必填，12个宫位）
  patterns: Pattern[];             // 格局列表（可选）
  mingGong: Palace;                // 命宫（必填）
  shenGong: Palace;                // 身宫（必填）
  mingZhu?: string;                // 命主星（可选）
  shenZhu?: string;                // 身主星（可选）
  daxian: Daxian[];               // 大限列表（可选）
  liunian?: LiunianInfo;          // 流年信息（可选）
  liumonth?: LiumonthInfo;        // 流月信息（可选）
  liuday?: LiudayInfo;            // 流日信息（可选）
  createdAt: Date | string;        // 创建时间（必填）
}
```

**类型定义**：
```typescript
type WuxingJu = '水二局' | '木三局' | '金四局' | '土五局' | '火六局';

interface Palace {
  name: PalaceName;
  index: number;                  // 0-11
  dizhi: Dizhi;                   // 地支
  tiangan?: Tiangan;              // 宫干（天干）
  stars: Star[];                  // 星曜列表
  brightness: string;
  sihua?: Sihua;                  // 四化标记
  changsheng?: ChangshengStatus;  // 长生十二神
  description?: string;
  aspects?: PalaceAspects;         // 三方四正星曜
}

type PalaceName = 
  | '命宫' | '兄弟宫' | '夫妻宫' | '子女宫' 
  | '财帛宫' | '疾厄宫' | '迁移宫' | '奴仆宫'
  | '官禄宫' | '田宅宫' | '福德宫' | '父母宫';

type Tiangan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
type Dizhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
```

### 3. ChartArchive（命盘存档）

```typescript
interface ChartArchive {
  id: string;                          // 存档唯一标识（必填）
  userId: string;                      // 用户ID（必填）
  chart: ZiweiChart;                   // 完整命盘数据（必填）
  name: string;                         // 命盘名称（必填）
  relationshipType: RelationshipType;   // 关系类型（必填）
  customLabel?: string;                // 自定义标签（可选）
  notes?: string;                      // 备注（可选）
  tags?: string[];                     // 标签列表（可选）
  createdAt: Date | string;            // 创建时间（必填）
  updatedAt: Date | string;            // 更新时间（必填）
}
```

### 4. ChartArchiveSummary（命盘存档摘要）

```typescript
interface ChartArchiveSummary {
  id: string;
  userId: string;
  name: string;
  relationshipType: RelationshipType;
  customLabel?: string;
  birthInfo: BirthInfo;              // ⚠️ 只包含出生信息，不包含完整命盘
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  tags?: string[];
}
```

### 5. RelationshipType（关系类型）

```typescript
type RelationshipType = 
  | 'self'         // 我的命盘（特殊标记）
  | 'lover'        // 爱人
  | 'child'        // 孩子
  | 'parent'       // 父母
  | 'bestie'       // 闺蜜
  | 'sibling'      // 兄弟
  | 'friend'       // 朋友
  | 'colleague'    // 同事
  | 'celebrity'    // 名人
  | 'custom';      // 自定义
```

**⚠️ 特殊说明**：
- `'self'` 是特殊标记，表示"我的命盘"
- 每个用户只能有一个 `relationshipType === 'self'` 的存档
- 如果用户创建新的"我的命盘"，应该更新现有记录，而不是创建新记录

### 6. StarChart（后端数据库格式）

```typescript
interface StarChart {
  profile_id: string;                 // 用户档案ID（对应 users.id）
  chart_structure: any;                // JSONB 类型，存储完整命盘结构
  brief_analysis_cache?: any;          // JSONB 类型，存储简要分析缓存（可选）
  created_at: Date | string;
  updated_at: Date | string;
}
```

**⚠️ 字段映射说明**：
- 前端传递的 `chart_data` 应该保存到 `chart_structure` 字段
- `profile_id` 对应 `users.id`（当前用户ID）
- 前端读取时，从 `chart_structure` 读取并映射到 `chart_data`

### 7. UnlockedTimeAsset（解锁的时空资产）

```typescript
interface UnlockedTimeAsset {
  id: string;
  user_id: string;
  profile_id: string;
  dimension: string;                  // 维度（如 'year', 'month', 'day'）
  period_start: string;               // 开始日期（date 类型，ISO 8601 格式）
  period_end: string;                 // 结束日期（date 类型，ISO 8601 格式）
  period_type: string;                // 期间类型
  unlocked_at: Date | string;
  expires_at: Date | string;
  cost_coins: number;                 // 消耗的天机币数量
  is_active: boolean;                 // 是否激活
  created_at: Date | string;
  updated_at: Date | string;
}
```

**前端请求格式**（兼容旧代码）：
```typescript
{
  startTime: string;  // ISO 8601 格式
  endTime: string;    // ISO 8601 格式
}
```

**后端应转换为**：
```typescript
{
  period_start: string;  // 从 startTime 转换
  period_end: string;    // 从 endTime 转换
}
```

---

## ⚠️ 关键注意事项

### 1. 时辰索引 vs 24小时制

**❌ 常见错误**：
```typescript
// 错误：将 hour 理解为 24 小时制
hour: 14  // 理解为下午2点
```

**✅ 正确理解**：
```typescript
// 正确：hour 是时辰索引（0-11）
hour: 6   // 表示午时（11:00-13:00）
```

**后端验证规则**：
- `hour` 必须在 `0-11` 范围内
- 如果前端传递了 `hour < 0` 或 `hour > 11`，应返回 400 错误

### 2. 日期格式

**所有日期字段**：
- 前端传递：ISO 8601 格式字符串（如 `"2024-01-09T10:30:00.000Z"`）
- 后端存储：PostgreSQL `TIMESTAMP WITH TIME ZONE` 类型
- 后端返回：ISO 8601 格式字符串或 Date 对象（JSON 序列化后为字符串）

**BirthInfo 中的日期**：
- `year`, `month`, `day` 是数字类型，不是字符串
- 不需要时区信息（只是年月日）

### 3. "我的命盘"特殊处理

**业务规则**：
1. 每个用户只能有一个 `relationshipType === 'self'` 的存档
2. 如果用户创建新的"我的命盘"，应该：
   - 先检查是否已存在 `relationshipType === 'self'` 的存档
   - 如果存在，**更新**现有记录（包括命盘数据）
   - 如果不存在，**创建**新记录
3. 删除"我的命盘"时，需要同时清理：
   - `star_charts` 表中的记录
   - `ziwei_chart_archives` 表中的记录（`relationship_type = 'self'`）
   - `analysis_sessions` 表中的相关分析会话

### 4. 命盘存档的存储策略

**性能优化建议**：
- **列表查询**（`GET /api/astrology/archives`）：只返回摘要（`ChartArchiveSummary`），不包含完整命盘数据
- **详情查询**（`GET /api/astrology/archives/:archiveId`）：返回完整存档（`ChartArchive`），包含完整命盘数据
- **数据库设计**：
  - 可以考虑将完整命盘数据存储在单独的 JSONB 字段中
  - 摘要信息存储在常规字段中，便于查询和排序

### 5. 数据验证规则

**BirthInfo 验证**：
```typescript
// 必填字段
year: number;      // 范围：1800-2100
month: number;     // 范围：1-12
day: number;       // 范围：1-31（需要根据月份和年份验证实际天数）
hour: number;      // 范围：0-11
gender: 'male' | 'female';

// 可选字段
lunarYear?: number;
lunarMonth?: number;
lunarDay?: number;
isLeapMonth?: boolean;
isLeapDay?: boolean;
```

**ChartArchive 验证**：
```typescript
// 必填字段
name: string;                    // 不能为空，需要 trim
relationshipType: RelationshipType;  // 必须是有效的关系类型
chart: ZiweiChart;               // 必须是有效的命盘数据

// 可选字段
customLabel?: string;           // 如果 relationshipType === 'custom'，建议提供
notes?: string;
tags?: string[];                 // 数组，每个元素是字符串
```

### 6. 权限验证

**所有 API 都需要**：
1. 验证用户是否登录（通过 `Authorization: Bearer <token>` 头）
2. 验证用户是否有权限访问资源（只能访问自己的数据）

**特殊权限规则**：
- `GET /api/astrology/star-chart`：只能查询自己的命盘
- `POST /api/astrology/star-chart`：只能保存/更新自己的命盘
- `GET /api/astrology/archives`：只能查询自己的存档列表
- `GET /api/astrology/archives/:archiveId`：只能查询自己的存档
- `PUT /api/astrology/archives/:archiveId`：只能更新自己的存档
- `DELETE /api/astrology/archives/:archiveId`：只能删除自己的存档

---

## 💻 前端使用方式

### 1. 保存命盘

```typescript
import { astrologyApi } from '@/api/modules/astrology';

// 准备数据
const chartData = {
  birthInfo: chart.birthInfo,
  createdAt: chart.createdAt.toISOString(),
  id: chart.id,  // 可选，更新时提供
  palaces: chart.palaces,
  mingZhu: chart.mingZhu,
  shenZhu: chart.shenZhu
};

// 调用 API
const response = await astrologyApi.saveStarChart({
  chart_data: chartData
});

if (response.success) {
  console.log('保存成功');
} else {
  console.error('保存失败:', response.message || response.error);
}
```

### 2. 查询命盘

```typescript
import { astrologyApi } from '@/api/modules/astrology';

const response = await astrologyApi.getStarChart();

if (response.success && response.data) {
  const starChart = response.data;
  const chartData = starChart.chart_data;  // 从 chart_structure 读取
  
  // 使用 chartData 恢复命盘
  // 注意：前端会使用 iztro 库从 birthInfo 重新生成命盘
} else {
  console.log('用户没有命盘数据');
}
```

### 3. 解锁时空资产

```typescript
import { astrologyApi } from '@/api/modules/astrology';

const response = await astrologyApi.unlockTimeAsset({
  startTime: '2024-01-01T00:00:00.000Z',
  endTime: '2024-12-31T23:59:59.999Z'
});

if (response.success) {
  console.log('解锁成功:', response.data);
}
```

### 4. 查询已解锁资产

```typescript
import { astrologyApi } from '@/api/modules/astrology';

const response = await astrologyApi.getUnlockedAssets();

if (response.success) {
  const assets = response.data;  // UnlockedTimeAsset[]
  console.log('已解锁资产:', assets);
}
```

---

## 🚨 常见错误和避免方法

### 错误1：时辰索引理解错误

**错误示例**：
```typescript
// ❌ 错误：将 hour 理解为 24 小时制
if (birthInfo.hour < 0 || birthInfo.hour > 23) {
  throw new Error('小时必须在 0-23 范围内');
}
```

**正确实现**：
```typescript
// ✅ 正确：hour 是时辰索引（0-11）
if (birthInfo.hour < 0 || birthInfo.hour > 11) {
  throw new Error('时辰索引必须在 0-11 范围内');
}
```

### 错误2：日期格式不一致

**错误示例**：
```typescript
// ❌ 错误：直接使用 Date 对象
created_at: new Date()
```

**正确实现**：
```typescript
// ✅ 正确：转换为 ISO 8601 格式字符串
created_at: new Date().toISOString()
```

### 错误3：字段命名不一致

**错误示例**：
```typescript
// ❌ 错误：使用 camelCase 命名
{
  userId: string;
  chartData: any;
}
```

**正确实现**：
```typescript
// ✅ 正确：使用 snake_case 命名（与数据库一致）
{
  user_id: string;
  chart_structure: any;  // 或 chart_data（前端传递时）
}
```

### 错误4：缺少数据验证

**错误示例**：
```typescript
// ❌ 错误：直接保存，不验证数据
await db.insert('star_charts', { chart_data: req.body.chart_data });
```

**正确实现**：
```typescript
// ✅ 正确：验证数据后再保存
const { birthInfo } = req.body.chart_data;

// 验证必填字段
if (!birthInfo.year || !birthInfo.month || !birthInfo.day) {
  return res.status(400).json({ 
    success: false, 
    error: '出生信息不完整' 
  });
}

// 验证时辰索引
if (birthInfo.hour < 0 || birthInfo.hour > 11) {
  return res.status(400).json({ 
    success: false, 
    error: '时辰索引必须在 0-11 范围内' 
  });
}

// 验证性别
if (!['male', 'female'].includes(birthInfo.gender)) {
  return res.status(400).json({ 
    success: false, 
    error: '性别必须是 male 或 female' 
  });
}

// 验证通过后保存
await db.insert('star_charts', { chart_structure: req.body.chart_data });
```

### 错误5：权限验证缺失

**错误示例**：
```typescript
// ❌ 错误：不验证用户权限
const archive = await db.select('ziwei_chart_archives', { id: archiveId });
```

**正确实现**：
```typescript
// ✅ 正确：验证用户权限
const userId = req.user.id;  // 从 token 中获取
const archive = await db.select('ziwei_chart_archives', { 
  id: archiveId,
  user_id: userId  // 只查询当前用户的数据
});

if (!archive) {
  return res.status(404).json({ 
    success: false, 
    error: '存档不存在或无权访问' 
  });
}
```

### 错误6："我的命盘"处理不当

**错误示例**：
```typescript
// ❌ 错误：总是创建新记录
await db.insert('ziwei_chart_archives', {
  user_id: userId,
  relationship_type: 'self',
  chart_data: chartData
});
```

**正确实现**：
```typescript
// ✅ 正确：检查是否存在，存在则更新，不存在则创建
const existing = await db.select('ziwei_chart_archives', {
  user_id: userId,
  relationship_type: 'self'
}).single();

if (existing) {
  // 更新现有记录
  await db.update('ziwei_chart_archives', {
    chart_data: chartData,
    updated_at: new Date().toISOString()
  }, { id: existing.id });
} else {
  // 创建新记录
  await db.insert('ziwei_chart_archives', {
    user_id: userId,
    relationship_type: 'self',
    chart_data: chartData
  });
}
```

---

## 📝 数据库表结构建议

### star_charts 表

```sql
CREATE TABLE star_charts (
  profile_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  chart_structure JSONB NOT NULL,           -- 存储完整命盘结构
  brief_analysis_cache JSONB,              -- 简要分析缓存（可选）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_star_charts_profile_id ON star_charts(profile_id);
```

### ziwei_chart_archives 表

```sql
CREATE TABLE ziwei_chart_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  custom_label TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  birth_info JSONB NOT NULL,              -- 出生信息（用于列表查询）
  chart_structure JSONB NOT NULL,         -- 完整命盘数据（用于详情查询）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：每个用户只能有一个"我的命盘"
  CONSTRAINT unique_self_archive UNIQUE (user_id, relationship_type) 
    WHERE relationship_type = 'self'
);

CREATE INDEX idx_archives_user_id ON ziwei_chart_archives(user_id);
CREATE INDEX idx_archives_relationship_type ON ziwei_chart_archives(relationship_type);
CREATE INDEX idx_archives_created_at ON ziwei_chart_archives(created_at DESC);
CREATE INDEX idx_archives_tags ON ziwei_chart_archives USING GIN(tags);
```

---

## 🔗 相关文档

- [前端迁移指南](../memory-bank/FRONTEND_MIGRATION_GUIDE.md)
- [后端类型定义](./后端定义类型.md)
- [API 需求映射表](../memory-bank/260130-前端转后端API需求映射表.md)

---

## 📞 联系方式

如有疑问，请参考：
1. 前端代码：`src/features/ziwei/` 目录
2. API 调用：`src/api/modules/astrology.ts`
3. 类型定义：`src/features/ziwei/types/` 目录

---

**维护者**: 开发团队  
**最后更新**: 2026年1月9日

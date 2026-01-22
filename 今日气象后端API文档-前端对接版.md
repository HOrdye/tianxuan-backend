# 天感·今日气象后端API文档

**版本**: v1.0.0  
**创建时间**: 2026-01-15  
**最后更新**: 2026-01-15  
**状态**: ✅ **已完成** - 所有API端点已实现

---

## 📋 目录

1. [概述](#概述)
2. [基础信息](#基础信息)
3. [认证说明](#认证说明)
4. [数据类型定义](#数据类型定义)
5. [API端点](#api端点)
6. [错误处理](#错误处理)
7. [示例代码](#示例代码)
8. [注意事项](#注意事项)

---

## 概述

**天感·今日气象 (Celestial Resonance)** 是一个基于 WebGL 的、沉浸式的每日能量生成器。后端API提供完整的定念、共振、显化、解码功能。

### 核心流程

1. **定念 (Calibration)** - 记录用户输入数据，生成共振参数和显化结果
2. **共振 (Resonance)** - 生成能量图谱参数（可选，通常与定念合并）
3. **显化 (Manifestation)** - 获取今日图腾（关键词、核心字、海报等）
4. **解码 (Decode)** - 免费获取专业解读（向所有注册用户开放）

---

## 基础信息

### Base URL

```
生产环境: https://api.yourdomain.com
开发环境: http://localhost:3000
```

### API路径前缀

```
/api/celestial-resonance
```

### 请求格式

- **Content-Type**: `application/json`
- **字符编码**: UTF-8

### 响应格式

所有响应统一使用以下格式：

```typescript
// 成功响应
{
  "success": true,
  "message": "操作成功",  // 可选
  "data": { ... }         // 响应数据
}

// 错误响应
{
  "success": false,
  "error": "错误类型",
  "message": "错误描述"   // 可选
}
```

---

## 认证说明

### 认证方式

所有API端点都需要Bearer Token认证。

### 请求头

```
Authorization: Bearer <token>
```

### 获取Token

通过登录接口获取Token（参考用户认证API文档）。

### 认证失败

如果Token无效或过期，返回：

```json
{
  "success": false,
  "error": "未认证"
}
```

HTTP状态码: `401 Unauthorized`

---

## 数据类型定义

### CalibrationData（定念数据）

```typescript
interface CalibrationData {
  duration: number;              // 按压时长（毫秒）
  mouseTrajectory: number[];    // 鼠标轨迹（归一化坐标数组，如 [0.5, 0.3, 0.7]）
  timestamp: string;            // 时间戳（ISO 8601格式，如 "2025-01-15T12:00:00Z"）
  hour: number;                 // 时辰（0-23）
}
```

### ResonanceParams（共振参数）

```typescript
interface ResonanceParams {
  randomSeed: string;           // 随机种子（32字符）
  particleConfig: {
    count: number;              // 粒子数量
    color: string;               // 主色调（十六进制，如 "#FF6B6B"）
    flowDirection: 'up' | 'down' | 'spiral' | 'ripple';  // 流动方向
    speed: number;               // 流动速度（0-2）
  };
  shaderParams: {
    blurRadius: number;         // 模糊半径（0-20）
    intensity: number;           // 强度（0-1）
    turbulence: number;          // 湍流（0-1）
  };
}
```

### ManifestationData（显化结果）

```typescript
interface ManifestationData {
  keywords: string[];           // 关键词列表（3-5个，如 ["潜龙", "破壁", "微澜"]）
  coreWord: string;             // 核心字（单个汉字，如 "通"）
  imageUrl: string;             // 静态海报URL（当前为占位符）
  videoUrl?: string;            // 动态视频URL（可选，当前未实现）
  layout: {
    coreWordPosition: {          // 核心字位置（像素坐标）
      x: number;
      y: number;
    };
    keywordPositions: Array<{   // 关键词位置数组
      word: string;
      x: number;
      y: number;
    }>;
  };
}
```

### DecodingData（解码数据）

```typescript
interface DecodingData {
  explanation: string;          // 整体解释（AI生成的专业解读）
  astrologicalReason: string;   // 命理原因（如 "因流日紫微化科入命..."）
  warnings: string[];           // 注意事项数组
  suggestions: string[];        // 建议数组
}
```

---

## API端点

### 1. 定念 - 记录用户输入并生成结果

**端点**: `POST /api/celestial-resonance/calibrate`

**功能**: 记录用户定念数据，自动生成共振参数和显化结果，并保存记录。

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "profileId": "self",  // 可选，默认 "self"，支持 camelCase 和 snake_case
  "calibrationData": {
    "duration": 2000,
    "mouseTrajectory": [0.5, 0.3, 0.7, 0.4],
    "timestamp": "2025-01-15T12:00:00Z",
    "hour": 12
  }
}
```

**参数说明**:
- `profileId` / `profile_id` (可选): 档案ID，默认 `"self"`，支持两种命名方式
- `calibrationData` / `calibration_data` (必填): 定念数据对象

**响应示例**:
```json
{
  "success": true,
  "message": "定念成功，共振参数已生成",
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "resonanceParams": {
      "randomSeed": "YWJjZGVmZ2hpams=",
      "particleConfig": {
        "count": 100,
        "color": "#FF6B6B",
        "flowDirection": "up",
        "speed": 1.0
      },
      "shaderParams": {
        "blurRadius": 5,
        "intensity": 0.8,
        "turbulence": 0.7
      }
    },
    "manifestationData": {
      "keywords": ["潜龙", "破壁", "微澜", "归元", "蓄力"],
      "coreWord": "通",
      "imageUrl": "/api/celestial-resonance/poster/1705315200000.png",
      "layout": {
        "coreWordPosition": { "x": 960, "y": 667 },
        "keywordPositions": [
          { "word": "潜龙", "x": 720, "y": 500 },
          { "word": "破壁", "x": 1200, "y": 500 },
          { "word": "微澜", "x": 720, "y": 834 },
          { "word": "归元", "x": 1200, "y": 834 },
          { "word": "蓄力", "x": 960, "y": 400 }
        ]
      }
    }
  }
}
```

**错误响应**:
- `400`: 参数错误（缺少必填字段、格式错误等）
- `401`: 未认证
- `500`: 服务器错误

---

### 2. 共振 - 生成能量图谱参数

**端点**: `POST /api/celestial-resonance/resonate`

**功能**: 仅生成共振参数，不保存记录。通常与定念接口合并使用。

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "profileId": "self",
  "calibrationData": {
    "duration": 2000,
    "mouseTrajectory": [0.5, 0.3],
    "timestamp": "2025-01-15T12:00:00Z",
    "hour": 12
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "共振参数生成成功",
  "data": {
    "resonanceParams": {
      "randomSeed": "YWJjZGVmZ2hpams=",
      "particleConfig": {
        "count": 100,
        "color": "#FF6B6B",
        "flowDirection": "up",
        "speed": 1.0
      },
      "shaderParams": {
        "blurRadius": 5,
        "intensity": 0.8,
        "turbulence": 0.7
      }
    }
  }
}
```

**说明**: 
- 此接口主要用于重新生成共振参数
- 实际使用中，建议直接使用 `calibrate` 接口，它会自动生成共振参数和显化结果

---

### 3. 获取显化结果（按ID）

**端点**: `GET /api/celestial-resonance/manifestation/:id`

**功能**: 根据记录ID获取显化结果。

**请求头**:
```
Authorization: Bearer <token>
```

**路径参数**:
- `id` (必填): 记录ID（UUID）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "resonanceDate": "2025-01-15",
    "manifestationData": {
      "keywords": ["潜龙", "破壁", "微澜", "归元", "蓄力"],
      "coreWord": "通",
      "imageUrl": "/api/celestial-resonance/poster/1705315200000.png",
      "layout": {
        "coreWordPosition": { "x": 960, "y": 667 },
        "keywordPositions": [...]
      }
    },
    "isDecoded": false
  }
}
```

**错误响应**:
- `400`: 参数错误（缺少ID）
- `401`: 未认证或无权访问
- `404`: 记录不存在
- `500`: 服务器错误

---

### 4. 获取今日显化结果

**端点**: `GET /api/celestial-resonance/manifestation/today`

**功能**: 获取今日的显化结果（推荐使用此接口）。

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `profileId` / `profile_id` (可选): 档案ID，默认 `"self"`
- `date` (可选): 日期（YYYY-MM-DD格式），默认今天

**请求示例**:
```
GET /api/celestial-resonance/manifestation/today?profileId=self
GET /api/celestial-resonance/manifestation/today?profileId=self&date=2025-01-15
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "resonanceDate": "2025-01-15",
    "manifestationData": {
      "keywords": ["潜龙", "破壁", "微澜", "归元", "蓄力"],
      "coreWord": "通",
      "imageUrl": "/api/celestial-resonance/poster/1705315200000.png",
      "layout": {
        "coreWordPosition": { "x": 960, "y": 667 },
        "keywordPositions": [...]
      }
    },
    "isDecoded": false
  }
}
```

**错误响应**:
- `401`: 未认证
- `404`: 今日记录不存在（需要先调用 `calibrate` 接口生成）
- `500`: 服务器错误

---

### 5. 解码 - 免费获取专业解读

**端点**: `POST /api/celestial-resonance/decode`

**功能**: 免费获取专业解读（向所有注册用户开放）。如果已解码，直接返回解码数据。

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "recordId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**参数说明**:
- `recordId` / `record_id` (必填): 记录ID，支持两种命名方式

**响应示例**:
```json
{
  "success": true,
  "message": "解码成功",
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "decodingData": {
      "explanation": "今日气象为'通'，因流日紫微化科入命，且定念与火气相合。此象主：难事易解，沟通顺畅。",
      "astrologicalReason": "因流日紫微化科、化权入命，且定念与fire气相合。此象主：通。",
      "warnings": [
        "警惕化忌，午后言多必失，宜闭嘴做事"
      ],
      "suggestions": [
        "今日宜主动出击，把握上升机遇"
      ]
    }
  }
}
```

**如果已解码**:
```json
{
  "success": true,
  "message": "解码数据已存在",
  "data": {
    "recordId": "550e8400-e29b-41d4-a716-446655440000",
    "decodingData": { ... }
  }
}
```

**错误响应**:
- `400`: 参数错误
- `401`: 未认证、无权访问
- `404`: 记录不存在
- `500`: 服务器错误

**说明**:
- 解码功能**完全免费**，向所有注册用户开放
- 如果记录已解码，直接返回已保存的解码数据
- 首次解码时会调用AI生成解读，可能需要几秒钟

---

## 错误处理

### HTTP状态码

| 状态码 | 说明 | 示例场景 |
|--------|------|----------|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求错误 | 参数缺失、格式错误 |
| 401 | 未认证 | Token无效、过期、无权访问 |
| 404 | 资源不存在 | 记录不存在 |
| 500 | 服务器错误 | 内部错误、数据库错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误类型",
  "message": "详细错误描述"
}
```

### 常见错误

#### 1. 参数错误
```json
{
  "success": false,
  "error": "参数错误",
  "message": "定念数据（calibrationData）必须提供"
}
```

#### 2. 参数错误（解码）
```json
{
  "success": false,
  "error": "参数错误",
  "message": "记录ID（recordId）必须提供"
}
```

#### 3. 记录不存在
```json
{
  "success": false,
  "error": "记录不存在",
  "message": "今日记录不存在"
}
```

#### 4. 未认证
```json
{
  "success": false,
  "error": "未认证"
}
```

---

## 示例代码

### JavaScript / TypeScript (Axios)

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://api.yourdomain.com';
const token = 'your-auth-token';

// 1. 定念
async function calibrate(calibrationData: CalibrationData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/celestial-resonance/calibrate`,
      {
        profileId: 'self',
        calibrationData,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '定念失败');
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || '请求失败');
    }
    throw error;
  }
}

// 2. 获取今日显化结果
async function getTodayManifestation(profileId: string = 'self') {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/celestial-resonance/manifestation/today`,
      {
        params: { profileId },
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '获取失败');
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      // 今日记录不存在，需要先调用 calibrate
      return null;
    }
    throw error;
  }
}

// 3. 解码
async function decode(recordId: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/celestial-resonance/decode`,
      { recordId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '解码失败');
    }
  } catch (error: any) {
    // 解码功能免费，无需处理余额问题
    throw error;
  }
}

// 使用示例
async function main() {
  // 1. 定念
  const calibrationData = {
    duration: 2000,
    mouseTrajectory: [0.5, 0.3, 0.7],
    timestamp: new Date().toISOString(),
    hour: new Date().getHours(),
  };
  
  const calibrateResult = await calibrate(calibrationData);
  console.log('定念成功:', calibrateResult);
  
  // 2. 获取今日显化结果
  const manifestation = await getTodayManifestation('self');
  if (manifestation) {
    console.log('显化结果:', manifestation.manifestationData);
  }
  
  // 3. 解码（免费，如果用户点击解码按钮）
  if (manifestation && !manifestation.isDecoded) {
    try {
      const decodeResult = await decode(manifestation.recordId);
      console.log('解码成功:', decodeResult.decodingData);
    } catch (error) {
      console.error('解码失败:', error.message);
    }
  }
}
```

### Vue 3 Composition API 示例

```typescript
import { ref } from 'vue';
import axios from 'axios';

export function useCelestialResonance() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const token = localStorage.getItem('auth_token');
  
  // 定念
  const calibrate = async (calibrationData: CalibrationData) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/celestial-resonance/calibrate`,
        { profileId: 'self', calibrationData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  // 获取今日显化结果
  const getTodayManifestation = async (profileId: string = 'self') => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/celestial-resonance/manifestation/today`,
        {
          params: { profileId },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null; // 记录不存在
      }
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  // 解码（免费）
  const decode = async (recordId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/celestial-resonance/decode`,
        { recordId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message);
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  return {
    loading,
    error,
    calibrate,
    getTodayManifestation,
    decode,
  };
}
```

---

## 注意事项

### 1. 参数命名兼容性

所有API端点同时支持 **camelCase** 和 **snake_case** 参数命名：

- ✅ `profileId` 或 `profile_id`
- ✅ `calibrationData` 或 `calibration_data`
- ✅ `recordId` 或 `record_id`

**建议**: 前端统一使用 camelCase，后端会自动兼容。

### 2. 日期格式

- 所有日期使用 **YYYY-MM-DD** 格式（如 `"2025-01-15"`）
- 时间戳使用 **ISO 8601** 格式（如 `"2025-01-15T12:00:00Z"`）

### 3. 唯一性约束

- 同一用户、同一档案、同一天只能有一条记录
- 如果重复调用 `calibrate`，会更新现有记录（UPSERT）

### 4. 解码功能

- 解码功能**完全免费**，向所有注册用户开放
- 如果记录已解码，直接返回已保存的解码数据
- 首次解码时会调用AI生成解读，可能需要几秒钟

### 5. 权限验证

- 用户只能访问自己的记录
- 尝试访问其他用户的记录会返回 `401 Unauthorized`

### 6. 错误处理建议

- 始终检查 `response.data.success` 字段
- 根据 HTTP 状态码和错误消息进行相应处理
- 解码功能免费，无需担心余额问题
- 记录不存在时，引导用户先进行定念操作

### 7. 性能优化

- 使用 `getTodayManifestation` 接口获取今日结果（推荐）
- 避免频繁调用 `calibrate` 接口（同一天会更新记录）
- 解码数据生成可能需要几秒钟，建议显示加载状态

### 8. 当前限制

- **海报生成**: 当前返回占位符URL，实际图像生成功能待实现
- **视频生成**: 当前未实现，`videoUrl` 为 `undefined`
- **紫微流日数据**: 当前使用简化版数据，真实计算服务待集成

---

## 更新日志

### v1.0.0 (2026-01-15)

- ✅ 实现所有5个API端点
- ✅ 支持参数命名兼容（camelCase / snake_case）
- ✅ 完整的错误处理和权限验证
- ✅ 解码功能（免费向所有注册用户开放）
- ⚠️ 海报生成功能待实现（当前为占位符）
- ⚠️ 紫微流日数据使用简化版（真实计算待集成）

---

## 联系方式

如有问题或建议，请联系后端开发团队。

---

**文档版本**: v1.0.0  
**最后更新**: 2026-01-15

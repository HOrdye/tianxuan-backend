# 修复隐性特征提取 500 错误

前后端联合修复：后端增强 `parseExtractionResponse` 容错使"无新特征"返回 200 而非 500，前端截断过长 `aiAnalysis` 并优化错误静默处理。

## 根因

```
parseExtractionResponse(response.content) → JSON.parse 失败 → return null
→ controller 收到 null → sendInternalError('隐性特征提取解析失败') → 500
```

LLM 返回非标准 JSON（如带 markdown 包裹、多余文字、截断等）导致解析失败。

## 修复方案

### A. 后端修复（3 个文件）

#### A1. `implicit-trait.service.ts` — `parseExtractionResponse` 增强容错

- 用正则 `/\{[\s\S]*\}/` 从 LLM 输出中提取 JSON 块（兼容 markdown 包裹、前后有解释文字等情况）
- `JSON.parse` 失败时，记录 `content` 前 500 字符 + 错误详情到日志
- 返回空对象 `{}` 而非 `null`（语义："无新特征可提取"，不是"系统异常"）

#### A2. `implicit-trait.service.ts` — `analyzeAndMerge` 区分空提取

```
const extracted = parseExtractionResponse(response.content, defaultSourceEvent);
// 旧: if (!extracted) return null;
// 新: if (!extracted) return null;  // 仅真正异常时
//     if (isEmpty(extracted)) return currentTraits 作为 200 返回
```

- `extracted` 为空对象 `{}` 时：不调用 `mergeTraitsFromExtraction`，直接返回当前画像，对外 200
- `extracted` 为 `null` 时（仅在 LLM 完全无响应/严重异常）：保留 500

#### A3. `implicit-trait.service.ts` — 增加诊断日志

- `parseExtractionResponse` catch 中输出 `content` 前 500 字符
- `analyzeAndMerge` 中当返回 null 时，打印 userId、userQuery 长度、aiAnalysis 长度

### B. 前端修复（2 个文件）

#### B1. `historyService.ts` — `aiAnalysis` 截断

在 `extractAIAnalysisFromHistoryItem` 返回值处增加截断：

```typescript
const MAX_AI_ANALYSIS_LENGTH = 2000; // 约 1000 中文字符
const aiAnalysis = extractAIAnalysisFromHistoryItem(result);
const truncated = aiAnalysis.length > MAX_AI_ANALYSIS_LENGTH 
  ? aiAnalysis.substring(0, MAX_AI_ANALYSIS_LENGTH) + '...(已截断)'
  : aiAnalysis;
```

**原因**：`content` 字段（详解）可能非常长（塔罗多章节叙事、三维决策分析等），过长输入增加 LLM 输出非标准 JSON 的概率，且后端 `maxTokens: 800` 限制了输出空间。

#### B2. `ImplicitTraitExtractor.ts` — 优化错误处理

- 将 `console.error` 降级为 `console.warn`（fire-and-forget 模式下不应显示为 error）
- 增加对 500 状态码的静默处理（不影响用户体验）

### C. 次要问题：hexagram SVG 404

- 404 路径 `dilemma/static/hexagrams/7.svg` 是**相对路径**（缺少前导 `/`）
- 文件 `public/static/hexagrams/7.svg` 已存在
- 需检查是否有组件使用了相对路径引用

## 实施顺序

1. **前端 B1** — `aiAnalysis` 截断（立即减少 500 发生概率）
2. **前端 B2** — 错误处理优化（改善用户体验）
3. **后端 A1-A3** — 容错增强（彻底解决根因）
4. **前端 C** — hexagram SVG 路径修复（次要）

## 影响范围

| 文件 | 修改类型 |
|------|----------|
| `src/services/historyService.ts` | 截断 aiAnalysis |
| `src/services/insight/ImplicitTraitExtractor.ts` | 错误处理降级 |
| 后端 `implicit-trait.service.ts` | 容错 + 日志 + 空提取处理 |

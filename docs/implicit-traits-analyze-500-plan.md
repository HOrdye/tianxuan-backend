# 隐性特征提取 500 错误：根因分析与修复计划

## 一、错误现象

| 类型 | 资源 | 状态 |
|------|------|------|
| 404 | `dilemma/static/hexagrams/7.svg` | 静态资源缺失 |
| 500 | `POST /api/user/implicit-traits/analyze` | 隐性特征提取解析失败 |

## 二、500 根因链路

```
前端 destinyCardApi.analyzeImplicitTraits()
  → POST /api/user/implicit-traits/analyze
  → user-digital-twin.controller.analyzeImplicitTraits
  → implicit-trait.service.analyzeAndMerge
  → callLLM() 获取 response.content
  → parseExtractionResponse(response.content) 返回 null
  → controller 收到 null，返回 sendInternalError('隐性特征提取解析失败')
```

**触发条件**：`parseExtractionResponse` 在以下任一情况返回 `null`：

1. `response.content` 不含有效 JSON（正则/`JSON.parse` 失败）
2. LLM 返回的 JSON 与预期结构不符导致解析异常
3. `callLLM` 抛错或返回异常内容

## 三、后端代码（路由 + Controller + Service）

### 3.1 路由注册

**文件**：`src/routes/user.routes.ts`

```typescript
router.post('/implicit-traits/analyze', authenticateToken, analyzeImplicitTraits);
```

### 3.2 Controller

**文件**：`src/controllers/user-digital-twin.controller.ts`

```typescript
export async function analyzeImplicitTraits(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const userId = req.user.userId;
    const userQuery = req.body.userQuery ?? req.body.user_query ?? '';
    const aiAnalysis = req.body.aiAnalysis ?? req.body.ai_analysis ?? '';
    const contextId = req.body.contextId ?? req.body.context_id ?? '';

    if (typeof userQuery !== 'string' || typeof aiAnalysis !== 'string') {
      sendBadRequest(res, 'userQuery 与 aiAnalysis 必填且为字符串');
      return;
    }

    const result = await implicitTraitService.analyzeAndMerge(
      userId,
      userQuery,
      aiAnalysis,
      typeof contextId === 'string' ? contextId : undefined
    );

    if (result === null) {
      sendInternalError(res, '隐性特征提取解析失败', undefined);
      return;
    }

    const payload: Record<string, unknown> = {
      psychometrics: result.psychometrics,
      weighted_interest_tags: result.weighted_interest_tags,
    };
    if (result.changes) (payload as any).changes = result.changes;
    sendSuccess(res, payload);
  } catch (error: any) {
    console.error('分析并合并隐性信息失败:', error);

    if (error.message === '用户不存在') {
      sendNotFound(res, error.message);
      return;
    }

    sendInternalError(res, undefined, error);
  }
}
```

### 3.3 Service（隐 trait 分析）

**文件**：`src/services/implicit-trait.service.ts`

```typescript
import { callLLM } from './llm.service';
import { getImplicitTraits, mergeTraitsFromExtraction } from './user-digital-twin.service';
import type { ImplicitTraits, Psychometrics, WeightedInterestTag } from '../types/user-digital-twin';
import { formatForExtraction } from './context/ImplicitTraitFormatter';

export interface AnalyzeResult {
  psychometrics?: Psychometrics;
  weighted_interest_tags?: WeightedInterestTag[];
  changes?: { risk_delta?: number; new_tags?: string[] };
}

export async function analyzeAndMerge(
  userId: string,
  userQuery: string,
  aiAnalysis: string,
  contextId?: string
): Promise<AnalyzeResult | null> {
  const currentTraits = await getImplicitTraits(userId);
  const prompt = buildExtractionPrompt(userQuery, aiAnalysis, currentTraits);
  const systemPrompt = getSystemPrompt();

  const response = await callLLM({
    prompt,
    systemPrompt,
    temperature: 0.3,
    maxTokens: 800,
  });

  const defaultSourceEvent = defaultSourceEventFromContext(contextId);
  const extracted = parseExtractionResponse(response.content, defaultSourceEvent);
  if (!extracted) return null;  // ← 此处返回 null 触发 500

  if (currentTraits?.psychometrics && extracted.psychometrics) {
    extracted.psychometrics = applySafetyClamp(
      currentTraits.psychometrics,
      extracted.psychometrics
    );
  }

  const updated = await mergeTraitsFromExtraction(userId, extracted);

  const changes: AnalyzeResult['changes'] = {};
  const prevValues = new Set((currentTraits?.weighted_interest_tags || []).map((t) => t.value));
  const newTags = (updated.weighted_interest_tags || [])
    .map((t) => t.value)
    .filter((v) => !prevValues.has(v));
  if (newTags.length) changes.new_tags = newTags;

  return {
    psychometrics: updated.psychometrics,
    weighted_interest_tags: updated.weighted_interest_tags,
    changes: Object.keys(changes).length ? changes : undefined,
  };
}

function defaultSourceEventFromContext(contextId?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return contextId ? `${date} ${contextId}` : `${date} 日常对话分析`;
}

function buildExtractionPrompt(
  userQuery: string,
  aiAnalysis: string,
  currentTraits: ImplicitTraits | null
): string {
  const currentProfileStr = formatForExtraction(currentTraits ?? undefined);

  return `你是一个资深的用户心理侧写师。从对话中提取用户画像，并基于紫微斗数特质维度进行量化。
【已知画像】
${currentProfileStr}

【本次对话】
Q: ${userQuery}
A: ${aiAnalysis}

【提取任务】
请分析用户在以下 6 个维度的表现 (0-100分)：
1. **决断力 (Decisiveness)**: 面对风险的果断程度 (七杀/破军特质)
2. **包容心 (Empathy)**: 对他人的共情与接纳 (天同/太阴特质)
3. **行动力 (Drive)**: 执行力与进取心 (破军/廉贞特质)
4. **稳定感 (Stability)**: 内心秩序与情绪稳定性 (天府/天相特质)
5. **求知欲 (Curiosity)**: 逻辑思考与探索意愿 (天机/巨门特质)
6. **社交力 (Sociability)**: 人际交往能力 (贪狼/太阳特质)

【输出 JSON】
{
  "psychometrics": {
    "decisiveness": number,
    "empathy": number,
    "drive": number,
    "stability": number,
    "curiosity": number,
    "sociability": number
  },
  "weighted_interest_tags": [
    { "value": "关键词", "weight": 0-100, "confidence": 0-1, "source_event": "简短的对话摘要" }
  ]
}`;
}

function getSystemPrompt(): string {
  return `你是一个专业的信息提取助手。你的任务是准确、客观地提取信息，不要过度推断。`;
}

export function parseExtractionResponse(
  content: string,
  defaultSourceEvent: string
): {
  weighted_interest_tags?: WeightedInterestTag[];
  psychometrics?: Psychometrics;
  family_structure?: ImplicitTraits['family_structure'];
  profession_hints?: string[];
} | null {
  try {
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    const now = Math.floor(Date.now() / 1000);
    const result: {
      weighted_interest_tags?: WeightedInterestTag[];
      psychometrics?: Psychometrics;
      family_structure?: ImplicitTraits['family_structure'];
      profession_hints?: string[];
    } = {};

    if (Array.isArray(parsed.weighted_interest_tags)) {
      result.weighted_interest_tags = parsed.weighted_interest_tags.map((t: any) => ({
        value: String(t.value || '').trim() || 'unknown',
        weight: Number(t.weight) || 0,
        confidence: Number(t.confidence) || 0.5,
        source_event: String(t.source_event || '').trim() || defaultSourceEvent,
        last_updated: now,
      }));
    }

    if (parsed.psychometrics) {
      const n = (v: unknown, d: number) => {
        const x = Number(v);
        return Number.isFinite(x) ? Math.round(Math.max(0, Math.min(100, x))) : d;
      };
      result.psychometrics = {
        decisiveness: n(parsed.psychometrics.decisiveness, 50),
        empathy: n(parsed.psychometrics.empathy, 50),
        drive: n(parsed.psychometrics.drive, 50),
        stability: n(parsed.psychometrics.stability, 50),
        curiosity: n(parsed.psychometrics.curiosity, 50),
        sociability: n(parsed.psychometrics.sociability, 50),
      };
    }

    if (parsed.family_structure && typeof parsed.family_structure === 'object') {
      result.family_structure = {
        has_spouse:
          typeof parsed.family_structure.has_spouse === 'boolean'
            ? parsed.family_structure.has_spouse
            : undefined,
        has_children:
          typeof parsed.family_structure.has_children === 'boolean'
            ? parsed.family_structure.has_children
            : undefined,
        children_count:
          typeof parsed.family_structure.children_count === 'number'
            ? parsed.family_structure.children_count
            : undefined,
      };
    }

    if (Array.isArray(parsed.profession_hints)) {
      result.profession_hints = parsed.profession_hints
        .filter((h: any) => typeof h === 'string')
        .slice(0, 10);
    }

    return result;
  } catch (e) {
    console.error('[ImplicitTraitService] parseExtractionResponse error', e);
    return null;
  }
}
```

## 四、修复计划

### 步骤 1：增强解析容错（implicit-trait.service.ts）

- 在 `parseExtractionResponse` 中增加 JSON 提取逻辑：
  - 优先用正则 `/\{[\s\S]*\}/` 提取 JSON 块
  - 若 `JSON.parse(jsonStr)` 抛错，记录 `content` 和 `e` 到日志，便于排查
- 对空内容或无效内容返回空对象 `{}`，而不是 `null`，避免误判为“解析失败”，从而减少 500（业务上可视为“无新特征可提取”）。

### 步骤 2：区分空提取与解析异常（implicit-trait.service.ts）

- 当 `extracted` 为空对象 `{}` 时：
  - 不调用 `mergeTraitsFromExtraction`，直接返回当前画像
  - 对外仍返回 200 + 当前 psychometrics / weighted_interest_tags
- 仅当解析过程本身异常（如 LLM 返回严重乱码、空 response）时，才继续返回 `null` 供 controller 转 500。

### 步骤 3：增加日志（implicit-trait.service.ts）

- 在 `parseExtractionResponse` 的 catch 中：
  - 输出 `content` 前 500 字符
  - 输出 `e.message` 和 `e.stack`
- 在 `analyzeAndMerge` 中：
  - 当 `parseExtractionResponse` 返回 null 时，打 log，包含 userId、userQuery 长度、aiAnalysis 长度

### 步骤 4：404 hexagrams/7.svg（前端）

- 检查 `dilemma/static/hexagrams/` 是否存在 `7.svg`
- 若缺失，补齐或修正前端引用路径

### 步骤 5：验证

1. 用真实对话调用 `POST /api/user/implicit-traits/analyze`
2. 模拟 LLM 返回非 JSON、残缺 JSON、空 content 等情况
3. 确认：正常情况返回 200；解析失败有详细日志；空提取返回 200 + 当前画像

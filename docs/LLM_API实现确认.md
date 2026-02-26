# LLM API 实现确认文档

**创建日期**: 2026-01-14  
**状态**: ✅ **已实现** - 后端统一的 LLM API 调用接口

---

## ✅ 确认事项

### 1. 后端 API 必须存在

**状态**: ✅ **已确认**

**实现详情**:
- ✅ **接口路径**: `POST /api/llm/chat`
- ✅ **路由注册**: 已在 `src/app.ts` 第116行注册 `/api/llm` 路由
- ✅ **路由定义**: `src/routes/llm.routes.ts` 第51行定义 `/chat` 路由
- ✅ **控制器实现**: `src/controllers/llm.controller.ts` 第15行实现 `chat` 函数
- ✅ **服务层实现**: `src/services/llm.service.ts` 第171行实现 `callLLM` 函数

**接口功能**:
- 支持非流式调用：`POST /api/llm/chat`
- 支持流式调用：`POST /api/llm/chat/stream`
- 支持获取配置：`GET /api/llm/config`

---

### 2. Token 认证

**状态**: ✅ **已确认**

**实现详情**:
- ✅ **认证中间件**: 所有 LLM API 接口都使用 `authenticateToken` 中间件
- ✅ **路由保护**: 
  - `router.post('/chat', authenticateToken, chat)` - 第51行
  - `router.post('/chat/stream', authenticateToken, chatStream)` - 第69行
  - `router.get('/config', authenticateToken, getConfig)` - 第90行
- ✅ **控制器验证**: 控制器中双重验证 `req.user` 存在性（第21-24行）

**认证流程**:
1. 客户端在请求头中添加 `Authorization: Bearer <token>`
2. `authenticateToken` 中间件验证 Token 有效性
3. 验证通过后，将用户信息附加到 `req.user`
4. 控制器从 `req.user.userId` 获取用户ID

**未认证响应**:
```json
{
  "success": false,
  "error": "未认证",
  "message": "请先登录"
}
```
HTTP 状态码: `401`

---

### 3. 错误处理

**状态**: ⚠️ **部分实现** - 需要根据业务需求补充扣费和退款逻辑

**当前实现**:
- ✅ **错误分类处理**: 根据错误类型返回不同的 HTTP 状态码
  - 配置错误（环境变量未配置）→ 500
  - 参数错误 → 400
  - API 调用失败 → 500
- ✅ **错误日志**: 记录详细的错误信息（包含 userId、错误消息、堆栈）

**当前错误处理代码** (`src/controllers/llm.controller.ts` 第92-112行):
```typescript
catch (error: any) {
  console.error('[LLM Controller] 调用失败', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.userId,
  });

  // 根据错误类型返回不同的状态码
  if (error.message.includes('环境变量未配置')) {
    sendInternalError(res, 'LLM 服务配置错误，请联系管理员', error);
    return;
  }

  if (error.message.includes('参数错误') || error.message.includes('必须')) {
    sendBadRequest(res, error.message);
    return;
  }

  // 其他错误统一返回 500
  sendInternalError(res, 'LLM 调用失败，请稍后重试', error);
}
```

---

## ⚠️ 需要补充的功能：扣费和退款逻辑

### 当前状态

**LLM API 调用流程**:
1. ✅ 验证 Token 认证
2. ✅ 验证请求参数
3. ✅ 调用 LLM 服务
4. ✅ 返回结果

**缺失的环节**:
- ❌ **扣费逻辑**: LLM API 调用前是否需要先扣费？
- ❌ **退款逻辑**: LLM API 调用失败后是否需要自动退款？

### 业务场景分析

根据"天玄藏经阁"的产品定位，LLM API 调用应该是**付费服务**。有两种可能的业务模式：

#### 模式1：先扣费，后调用（推荐）

**流程**:
1. 用户请求 LLM API
2. **先扣费**（调用 `/api/coins/deduct`）
3. 如果扣费成功，调用 LLM API
4. 如果 LLM API 调用失败，**自动退款**

**优点**:
- 确保用户有足够余额
- 失败时自动退款，用户体验好
- 防止恶意调用

**实现建议**:
```typescript
// 在 llm.controller.ts 的 chat 函数中
export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.userId;
    const coinsToDeduct = 10; // 每次调用消耗的天机币数量
    let transactionId: string | undefined;

    // 1. 先扣费
    try {
      const deductResult = await coinsService.deductCoins(
        userId,
        'llm_chat', // 功能类型
        coinsToDeduct
      );
      transactionId = deductResult.transaction_id;
    } catch (deductError) {
      // 扣费失败（余额不足等）
      sendBadRequest(res, '余额不足，请先充值');
      return;
    }

    // 2. 调用 LLM API
    try {
      const result = await llmService.callLLM({...});
      sendSuccess(res, result, 'LLM 调用成功');
    } catch (llmError) {
      // 3. LLM 调用失败，自动退款
      await paymentService.createServiceRefundLog({
        userId,
        amount: coinsToDeduct,
        reason: `LLM API 调用失败: ${llmError.message}`,
        originalRequestId: transactionId || 'unknown',
      });
      
      sendInternalError(res, 'LLM 调用失败，已自动退款', llmError);
    }
  } catch (error) {
    // 错误处理
  }
}
```

#### 模式2：先调用，后扣费

**流程**:
1. 用户请求 LLM API
2. 调用 LLM API
3. 如果调用成功，**再扣费**
4. 如果调用失败，不扣费

**优点**:
- 失败不扣费，用户体验好
- 实现简单

**缺点**:
- 无法防止恶意调用（可能消耗 API 配额但不付费）
- 需要额外的余额检查

---

## 📋 建议的完整实现方案

### 方案：先扣费，后调用，失败自动退款

**修改文件**: `src/controllers/llm.controller.ts`

**需要添加的导入**:
```typescript
import * as coinsService from '../services/coins.service';
import * as paymentService from '../services/payment.service';
```

**需要添加的配置**:
```typescript
// LLM API 调用价格（天机币）
const LLM_CHAT_PRICE = parseInt(process.env.LLM_CHAT_PRICE || '10', 10);
const LLM_FEATURE_TYPE = 'llm_chat'; // 功能类型
```

**修改后的 chat 函数**:
```typescript
export async function chat(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user?.userId;
  let transactionId: string | undefined;

  try {
    // 1. 先扣费
    try {
      const deductResult = await coinsService.deductCoins(
        userId!,
        LLM_FEATURE_TYPE,
        LLM_CHAT_PRICE
      );
      transactionId = deductResult.transaction_id;
      console.log(`[LLM Controller] 用户 ${userId} 扣费成功`, {
        transactionId,
        remainingBalance: deductResult.remaining_balance,
      });
    } catch (deductError: any) {
      // 扣费失败（余额不足等）
      if (deductError.message?.includes('余额不足')) {
        sendBadRequest(res, '余额不足，请先充值');
        return;
      }
      throw deductError;
    }

    // 2. 调用 LLM API
    const result = await llmService.callLLM({...});

    // 3. 调用成功，返回结果
    sendSuccess(res, {
      content: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      finishReason: result.finishReason,
    }, 'LLM 调用成功');

  } catch (error: any) {
    console.error('[LLM Controller] 调用失败', {
      error: error.message,
      userId,
      transactionId,
    });

    // 4. 如果已扣费但调用失败，自动退款
    if (transactionId) {
      try {
        await paymentService.createServiceRefundLog({
          userId: userId!,
          amount: LLM_CHAT_PRICE,
          reason: `LLM API 调用失败: ${error.message}`,
          originalRequestId: transactionId,
        });
        console.log(`[LLM Controller] 已自动退款给用户 ${userId}`, {
          amount: LLM_CHAT_PRICE,
          transactionId,
        });
      } catch (refundError: any) {
        console.error('[LLM Controller] 自动退款失败', {
          error: refundError.message,
          userId,
          transactionId,
        });
        // 退款失败不影响错误响应
      }
    }

    // 5. 返回错误响应
    if (error.message.includes('环境变量未配置')) {
      sendInternalError(res, 'LLM 服务配置错误，请联系管理员', error);
      return;
    }

    if (error.message.includes('参数错误') || error.message.includes('必须')) {
      sendBadRequest(res, error.message);
      return;
    }

    sendInternalError(res, 'LLM 调用失败，请稍后重试', error);
  }
}
```

---

## 🔧 环境变量配置

**需要添加的环境变量**:
```env
# LLM API 调用价格（天机币）
LLM_CHAT_PRICE=10

# 其他 LLM 配置（已存在）
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ 总结

### 已确认实现
1. ✅ **后端 API 存在**: `/api/llm/chat` 接口已完整实现
2. ✅ **Token 认证**: 所有接口都使用 `authenticateToken` 中间件保护
3. ✅ **错误处理**: 已实现错误分类和日志记录

### 需要补充
1. ⚠️ **扣费逻辑**: 需要在 LLM API 调用前先扣费
2. ⚠️ **退款逻辑**: 需要在 LLM API 调用失败后自动退款

### 建议
- 采用"先扣费，后调用，失败自动退款"的方案
- 使用现有的 `coinsService.deductCoins` 和 `paymentService.createServiceRefundLog` 服务
- 添加 `LLM_CHAT_PRICE` 环境变量配置价格

---

## 📝 下一步行动

1. **确认业务需求**: 确认 LLM API 调用的价格和扣费时机
2. **实现扣费逻辑**: 在 LLM 控制器中添加扣费代码
3. **实现退款逻辑**: 在错误处理中添加自动退款代码
4. **测试验证**: 测试扣费、调用、退款流程
5. **更新文档**: 更新 API 文档，说明价格和退款机制

---

## 🔗 相关文档

- [LLM_API配置说明.md](./LLM_API配置说明.md)
- [退款API参数说明.md](./退款API参数说明.md)
- [移除前端AI服务配置入口计划.md](./260114-移除前端AI服务配置入口计划.md)

---

## 📌 更新记录

- **2026-01-14**: 创建确认文档，总结当前实现状态和需要补充的功能

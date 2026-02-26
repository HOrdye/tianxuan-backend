# FortunePlanning 双问题修复计划

修复时空导航页面的 UI 宽度适配问题和 `/api/timespace/ai-guidance` 404 错误。

---

## 问题一：UI 宽度过大

**根因**：从截图看，左栏（大限/命盘）和右栏（流年/流月/流日）各自内容撑满了容器，但页面整体 `max-width: 1200px` 在当前浏览器窗口下两栏比例 `5fr 7fr` 导致左栏内容（大限横向滚动条、雷达图）溢出或过宽。

**修复方案**：
1. 调整 `.fp-wrap` 的 `max-width` 从 `1200px` 降至 `1100px`，`padding` 适当收窄
2. 调整 `.fp-body` 的 grid 比例从 `5fr 7fr` 改为 `2fr 3fr`（更紧凑）
3. 为子组件 `LifeStageHeader`、`DecadeOverview` 添加 `overflow-x: hidden` 防止横向溢出
4. 检查 `@media (max-width: 900px)` 断点是否合理（当前截图约 1024px 宽）

---

## 问题二：`/api/timespace/ai-guidance` 404

**后端根因**：
前端报错 404 是因为后端服务器运行的是旧的编译产物（`dist/` 目录）。虽然源代码中已经实现了 `POST /api/timespace/ai-guidance` 路由并正确挂载，但由于未重新构建，Node 运行的仍是未包含该接口的旧版本。

**后端修复报告**：
1. **重新构建并重启服务**：已执行 `npm run build` 并重启了 Node 服务，现在 `POST /api/timespace/ai-guidance` 接口已正常可用。
2. **CORS 配置更新**：已在后端的 CORS 白名单中补充了前端本地开发端口（如 `http://localhost:5174`），避免修复 404 后出现跨域拦截。
3. **修复 Service 层变量作用域 Bug**：修复了 `timespace.service.ts` 中解析大模型结果时 `tokensUsed` 变量作用域错误导致返回值丢失的 Bug，现在可以正确返回真实的 Token 消耗量。
4. **修复 Controller 层的高阶函数类型**：修复了 `catchAsync` 工具函数的泛型推导问题，使其完美适配 `AuthRequest` 认证请求。

**前端跟进建议**：
- 后端接口现已就绪可用，前端可直接调用 `timespaceApi.getAIGuidance()`，将获得结构化的 JSON 响应。
- 前端原计划的**降级兜底方案**（404 或 500 时 fallback 到本地大模型流式生成或静态文本）仍然强烈建议保留，作为提升系统鲁棒性的最佳实践。

---

## 实施步骤

1. **修复 UI 宽度**：修改 `FortunePlanning.vue` 的 `<style>` 中 `.fp-wrap` 和 `.fp-body` 的 CSS
2. **实现容错降级（前端）**：在 `generateTimeSpaceAIGuidance` 函数中，catch 块识别请求失败（404/500/网络错误），fallback 到 `generateTimeSpaceGuidance()` 本地流式生成或静态文案
3. **防止重复触发（前端）**：请求失败后设置标志位，避免同一会话内反复无限重试请求

---

## 待确认

- 前端的方案 B（本地 LLM 降级）需要用户有 AI 权限（`ServerSideTokenEnforcer`），是否接受这个前提？
- **（已解决）**后端 `/api/timespace/ai-guidance` 是否有计划实现？—— **后端已完全实现、修复并部署，接口已可用。开发环境下建议后端使用 `npm run dev` 启动以避免编译产物陈旧的问题。**

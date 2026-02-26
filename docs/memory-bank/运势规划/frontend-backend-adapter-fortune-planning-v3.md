# Fortune Planning V3 前后端适配开发文档（发送前端）

## 1. 目标
本次适配目标：将前端“宜忌模块”完全对齐后端 V3 输出协议，统一使用 `PaidYiJiResult` 数据结构渲染，不再依赖旧版字段（如 `directAnswer`、`decisionLine`、`breakthroughActions`）。

---

## 2. 接口信息

### 2.1 请求地址
- **Method**: `POST`
- **URL**: `/api/astrology/inquiry`
- **Auth**: 需要 `Authorization: Bearer <token>`

### 2.2 请求体（兼容蛇形/驼峰）
```json
{
  "category": "career",
  "selectedTag": "晋升",
  "customContext": "最近在推进跨部门项目，沟通阻力大",
  "chartId": "optional",
  "isPaid": true
}
```

字段说明：
- `category` 必填，枚举：`career | love | wealth | health | family | education | other`
- `customContext` 必填，非空字符串，最大 500 字
- `selectedTag` 选填
- `chartId` 选填
- `isPaid` / `is_paid`：是否付费通道（影响策略生成链路）

---

## 3. 响应契约（V3）

### 3.1 顶层结构
```ts
export type PaidYiJiItem = {
  action: string;
  reason?: string;
  tags?: string[];
  priority?: 1 | 2 | 3;
  source?: 'template' | 'ai-extract' | 'legacy';
};

export type PaidYiJiResult = {
  dimension: 'year' | 'month' | 'day';
  do: PaidYiJiItem[];
  dont: PaidYiJiItem[];
  note?: {
    level: 'warning' | 'danger';
    content: string;
  };
};
```

### 3.2 真实返回示例
```json
{
  "success": true,
  "data": {
    "dimension": "day",
    "do": [
      {
        "action": "主动发起关键沟通",
        "reason": "先亮立场再谈细节，合作效率更高。【玄学依据：太阳主发散与施予】",
        "tags": ["人际"],
        "priority": 1,
        "source": "template"
      }
    ],
    "dont": [
      {
        "action": "避免独断压制团队",
        "reason": "过强主导会削弱协作意愿，影响执行闭环。【玄学依据：阳曜过亢则失衡】",
        "tags": ["人际"],
        "priority": 1,
        "source": "template"
      }
    ],
    "note": {
      "level": "warning",
      "content": "流日命中高敏星曜，请优先控制风险并避免高冲突决策。"
    }
  }
}
```

---

## 4. 前端渲染适配规则

### 4.1 必做
1. 仅消费 `data.dimension / data.do / data.dont / data.note`。
2. `do` 走“宜”卡片，`dont` 走“忌”卡片。
3. `priority` 用于排序与层级展示（`1` > `2` > `3`，数字越小优先级越高）。
4. `tags` 用于分类标识（可多标签，建议展示第一个为主标签）。
5. `source` 用于埋点（模板/AI/兜底来源统计）。

### 4.2 极客模式文案处理
- `reason` 已保证兼容：`白话解释 + 【玄学依据：...】`
- 前端可继续沿用当前逻辑：
  - 普通模式：截断 `【` 之后内容
  - 极客模式：展示完整 reason

### 4.3 note 显示逻辑
- `note` 存在时显示顶部风险条：
  - `warning`：黄色样式
  - `danger`：红色样式
- `note` 不存在则隐藏该区域（不要占位）。

---

## 5. 护栏影响（前端需知）
后端已做清洗，请前端不要再重复“语义修复”，仅做展示：
1. `action` 已去前缀并限制在 20 字内。
2. `dont` 中含“宜/适合/利于”等正向语义项会被服务端丢弃。
3. 同主题（同主 tag）可能被合并，额外信息会拼到主项 `reason`。
4. 当 LLM 输出缺失时，后端会返回最小可展示兜底项（避免空白 UI）。

---

## 6. 兼容与回归清单

### 6.1 必测场景
1. 付费请求（`isPaid=true`）正常渲染 do/dont。
2. 免费请求（`isPaid=false`）也能拿到可展示 do/dont。
3. `note` 有/无两种状态下页面布局稳定。
4. `reason` 在普通模式与极客模式的展示一致性。
5. 历史前端若仍读取旧字段，需全部移除（避免 undefined 异常）。

### 6.2 建议埋点
- `source` 分布（template / ai-extract / legacy）
- `note.level` 命中率
- 点击行为按 `priority` 的转化表现

---

## 7. 联调结论
前端请以本文件为准完成适配；后端接口已切换到 V3 结构并已通过构建验证，可直接联调。

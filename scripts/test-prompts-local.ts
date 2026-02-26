/**
 * 本地验证脚本：测试 Prompt 构建器和 Zod Schema 校验
 * 无需启动服务器或调用 API
 *
 * 运行: npx ts-node scripts/test-prompts-local.ts
 */
import {
  PromptBuilderMap,
  OutputSchemaMap,
  FallbackMap,
  YearlyFallback,
  MonthlyFallback,
  DailyFallback,
  TimeDimension,
} from '../src/services/timespace-prompts';

const dimensions: TimeDimension[] = ['yearly', 'monthly', 'daily'];
const mockContext = {
  year: 2026,
  month: 2,
  day: 25,
  stars: ['紫微', '天府', '太阳'],
  palaces: ['命宫', '财帛宫', '事业宫'],
};

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

console.log('========================================');
console.log(' Prompt 构建器 & Schema 本地验证');
console.log('========================================\n');

// ─── 1. 测试 Prompt 构建器输出 ─────────────────
for (const dim of dimensions) {
  console.log(`── ${dim} Prompt 构建 ──`);
  const builder = PromptBuilderMap[dim];
  const prompt = builder(mockContext);

  assert(typeof prompt === 'string', 'prompt 是字符串');
  assert(prompt.length > 100, `prompt 长度足够 (${prompt.length} chars)`);
  assert(prompt.includes('"year": 2026'), 'prompt 包含 context 数据');

  // 确保 prompt 中的 JSON Schema 片段不含破坏性转义
  assert(!prompt.includes('\\\\n'), 'prompt 无双重转义 \\\\n');

  console.log('');
}

// ─── 2. 测试 Fallback 数据通过 Schema 校验 ─────
const fallbacks: Record<TimeDimension, any> = {
  yearly: YearlyFallback,
  monthly: MonthlyFallback,
  daily: DailyFallback,
};

for (const dim of dimensions) {
  console.log(`── ${dim} Fallback Schema 校验 ──`);
  const schema = OutputSchemaMap[dim];
  const fb = fallbacks[dim];

  try {
    schema.parse(fb);
    assert(true, 'Fallback 通过 Zod 校验');
  } catch (e: any) {
    assert(false, `Fallback Zod 校验失败: ${e.message}`);
  }

  // 检查 do/dont 是字符串数组
  assert(
    Array.isArray(fb.do) && fb.do.every((x: any) => typeof x === 'string'),
    'do 是字符串数组'
  );
  assert(
    Array.isArray(fb.dont) && fb.dont.every((x: any) => typeof x === 'string'),
    'dont 是字符串数组'
  );
  assert(
    Array.isArray(fb.keywords) && fb.keywords.every((x: any) => typeof x === 'string'),
    'keywords 是字符串数组'
  );

  console.log('');
}

// ─── 3. 月度 rhythm 特殊检查 ────────────────────
console.log('── monthly rhythm 结构检查 ──');
assert(typeof MonthlyFallback.rhythm === 'object', 'rhythm 是对象');
assert(typeof MonthlyFallback.rhythm.early === 'string', 'rhythm.early 存在');
assert(typeof MonthlyFallback.rhythm.mid === 'string', 'rhythm.mid 存在');
assert(typeof MonthlyFallback.rhythm.late === 'string', 'rhythm.late 存在');

// ─── 4. 流年 sihuaAnalysis 检查 ────────────────
console.log('\n── yearly sihuaAnalysis 结构检查 ──');
assert(Array.isArray(YearlyFallback.sihuaAnalysis), 'sihuaAnalysis 是数组');
assert(YearlyFallback.sihuaAnalysis.length === 4, 'sihuaAnalysis 恰好4个元素');
for (const item of YearlyFallback.sihuaAnalysis) {
  assert(
    typeof item.name === 'string' && typeof item.palace === 'string' && typeof item.effect === 'string',
    `sihuaAnalysis 元素结构正确: ${item.name}`
  );
}

// ─── 5. 模拟 JSON.stringify 往返测试 ───────────
console.log('\n── JSON 序列化往返测试 ──');
for (const dim of dimensions) {
  const fb = fallbacks[dim];
  const json = JSON.stringify(fb);
  const parsed = JSON.parse(json);
  const schema = OutputSchemaMap[dim];

  try {
    schema.parse(parsed);
    assert(true, `${dim}: JSON.stringify → parse → schema.parse 通过`);
  } catch (e: any) {
    assert(false, `${dim}: JSON 往返校验失败: ${e.message}`);
  }
}

// ─── 汇总 ──────────────────────────────────────
console.log('\n========================================');
console.log(` 结果: ${passed} 通过, ${failed} 失败`);
console.log('========================================');

process.exit(failed > 0 ? 1 : 0);

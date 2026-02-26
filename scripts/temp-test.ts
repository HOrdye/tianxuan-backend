import axios, { AxiosError } from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE = 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || '';

// 使用一个真实存在的 userId（profiles.id）
const TEST_USER_ID = '4fa8be4f-bd42-44e8-a0f4-a7e0a121ca2d';
const TEST_EMAIL = 'test6@qq.com';

// 生成测试 token
const token = jwt.sign(
  { userId: TEST_USER_ID, email: TEST_EMAIL },
  JWT_SECRET,
  { expiresIn: '1h' } as jwt.SignOptions
);

const http = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${token}` },
  timeout: 10000,
});

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    const msg = err.response
      ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
      : err.message;
    console.log(`  ❌ ${name} → ${msg}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  console.log('\n========================================');
  console.log(' 时空导航 v2.0 API 自测脚本');
  console.log('========================================\n');
  console.log(`🔑 Token (前20字符): ${token.substring(0, 20)}...`);
  console.log(`👤 User ID: ${TEST_USER_ID}\n`);

  // ============================================
  // 1. 今日复盘打卡 - POST
  // ============================================
  console.log('--- 1. POST /api/fortune/checkin ---');

  await test('创建打卡（正常）', async () => {
    const res = await http.post('/fortune/checkin', {
      checkin_date: new Date().toISOString().slice(0, 10),
      profile_id: TEST_USER_ID, // self profile
      accuracy_score: 4,
      mood_tags: ['satisfied', 'calm'],
      note: '今日感觉运势不错',
      accurate_dimensions: ['daily'],
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    assert(!!res.data.data.id, 'should return id');
    assert(typeof res.data.data.is_new === 'boolean', 'should return is_new');
    console.log(`    → id=${res.data.data.id}, is_new=${res.data.data.is_new}`);
  });

  await test('更新打卡（幂等 UPSERT）', async () => {
    const res = await http.post('/fortune/checkin', {
      checkin_date: new Date().toISOString().slice(0, 10),
      profile_id: TEST_USER_ID,
      accuracy_score: 5,
      mood_tags: ['excited'],
      accurate_dimensions: ['daily', 'monthly'],
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    // is_new should be false on update
    console.log(`    → is_new=${res.data.data.is_new}`);
  });

  await test('打卡参数校验 - accuracy_score 超范围', async () => {
    try {
      await http.post('/fortune/checkin', {
        checkin_date: '2026-02-24',
        profile_id: TEST_USER_ID,
        accuracy_score: 10, // 超范围
      });
      throw new Error('Should have returned 400');
    } catch (err: any) {
      assert(err.response?.status === 400, 'should return 400');
    }
  });

  await test('打卡参数校验 - 无效日期格式', async () => {
    try {
      await http.post('/fortune/checkin', {
        checkin_date: '2026/02/24', // 错误格式
        profile_id: TEST_USER_ID,
        accuracy_score: 3,
      });
      throw new Error('Should have returned 400');
    } catch (err: any) {
      assert(err.response?.status === 400, 'should return 400');
    }
  });

  await test('打卡参数校验 - 无效 mood_tag', async () => {
    try {
      await http.post('/fortune/checkin', {
        checkin_date: '2026-02-24',
        profile_id: TEST_USER_ID,
        accuracy_score: 3,
        mood_tags: ['invalid_tag'],
      });
      throw new Error('Should have returned 400');
    } catch (err: any) {
      assert(err.response?.status === 400, 'should return 400');
    }
  });

  // ============================================
  // 2. 今日复盘打卡 - GET
  // ============================================
  console.log('\n--- 2. GET /api/fortune/checkin ---');

  await test('查询今日打卡', async () => {
    const res = await http.get('/fortune/checkin', {
      params: {
        profile_id: TEST_USER_ID,
        date: new Date().toISOString().slice(0, 10),
      },
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    assert(Array.isArray(res.data.data.checkins), 'checkins should be array');
    assert(typeof res.data.data.streak === 'number', 'streak should be number');
    console.log(`    → checkins=${res.data.data.checkins.length}, streak=${res.data.data.streak}`);
  });

  await test('查询本周打卡', async () => {
    const res = await http.get('/fortune/checkin', {
      params: {
        profile_id: TEST_USER_ID,
        range: 'week',
      },
    });
    assert(res.status === 200, 'status should be 200');
    assert(Array.isArray(res.data.data.checkins), 'checkins should be array');
    console.log(`    → week checkins=${res.data.data.checkins.length}`);
  });

  // ============================================
  // 3. 年度同比 (YOY)
  // ============================================
  console.log('\n--- 3. GET /api/fortune/yearly-comparison ---');

  await test('获取年度同比', async () => {
    const res = await http.get('/fortune/yearly-comparison', {
      params: {
        profile_id: TEST_USER_ID,
        year: 2026,
      },
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    const d = res.data.data;
    assert(d.current_year === 2026, 'current_year should be 2026');
    assert(d.previous_year === 2025, 'previous_year should be 2025');
    assert(typeof d.career_delta === 'number', 'career_delta should be number');
    assert(typeof d.summary === 'string', 'summary should be string');
    console.log(`    → delta: career=${d.career_delta}, wealth=${d.wealth_delta}, love=${d.love_delta}`);
    console.log(`    → tag=${d.decade_year_tag}, cached=${d.is_cached}`);
    console.log(`    → summary: ${d.summary}`);
  });

  // ============================================
  // 4. 用户偏好设置
  // ============================================
  console.log('\n--- 4. GET/PATCH /api/user/preferences ---');

  await test('获取偏好设置（默认值）', async () => {
    const res = await http.get('/user/preferences');
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    const d = res.data.data;
    assert(typeof d.geekMode === 'boolean', 'geekMode should be boolean');
    assert(typeof d.proMode === 'boolean', 'proMode should be boolean');
    assert(typeof d.sidebarCollapsed === 'boolean', 'sidebarCollapsed should be boolean');
    console.log(`    → geekMode=${d.geekMode}, proMode=${d.proMode}, sidebarCollapsed=${d.sidebarCollapsed}`);
  });

  await test('更新偏好设置', async () => {
    const res = await http.patch('/user/preferences', {
      geekMode: true,
      sidebarCollapsed: true,
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.data.updated === true, 'updated should be true');
  });

  await test('验证偏好已更新', async () => {
    const res = await http.get('/user/preferences');
    assert(res.data.data.geekMode === true, 'geekMode should be true');
    assert(res.data.data.sidebarCollapsed === true, 'sidebarCollapsed should be true');
    assert(res.data.data.proMode === false, 'proMode should remain false');
    console.log(`    → geekMode=${res.data.data.geekMode}, sidebarCollapsed=${res.data.data.sidebarCollapsed}`);
  });

  await test('偏好设置 strict 校验 - 未知字段', async () => {
    try {
      await http.patch('/user/preferences', {
        geekMode: true,
        unknownField: 'bad',
      });
      throw new Error('Should have returned 400');
    } catch (err: any) {
      assert(err.response?.status === 400, 'should return 400 for unknown field');
    }
  });

  // ============================================
  // 5. 询价 (Pricing Quote)
  // ============================================
  console.log('\n--- 5. GET /api/pricing/quote ---');

  await test('获取 fortune_daily 报价', async () => {
    const res = await http.get('/pricing/quote', {
      params: {
        sku: 'fortune_daily',
        date: new Date().toISOString().slice(0, 10),
      },
    });
    assert(res.status === 200, 'status should be 200');
    assert(res.data.success === true, 'success should be true');
    const d = res.data.data;
    assert(d.sku === 'fortune_daily', 'sku should match');
    assert(d.original_price === 10, 'original_price should be 10');
    assert(typeof d.actual_price === 'number', 'actual_price should be number');
    console.log(`    → original=${d.original_price}, actual=${d.actual_price}, reason=${d.discount_reason}`);
  });

  await test('询价 - 无效 SKU', async () => {
    try {
      await http.get('/pricing/quote', {
        params: { sku: 'invalid_sku', date: '2026-02-24' },
      });
      throw new Error('Should have returned 400');
    } catch (err: any) {
      assert(err.response?.status === 400, 'should return 400 for invalid SKU');
    }
  });

  // ============================================
  // 6. 无 Token 鉴权测试
  // ============================================
  console.log('\n--- 6. 鉴权测试（无 Token） ---');

  await test('无 Token 访问打卡接口应 401', async () => {
    try {
      await axios.get(`${BASE}/fortune/checkin`, {
        params: { profile_id: TEST_USER_ID },
      });
      throw new Error('Should have returned 401');
    } catch (err: any) {
      assert(err.response?.status === 401, 'should return 401');
    }
  });

  // ============================================
  // 汇总
  // ============================================
  console.log('\n========================================');
  console.log(` 测试结果: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

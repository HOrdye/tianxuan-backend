#!/usr/bin/env node

/**
 * 紫微斗数 API 测试脚本
 * 使用方法: node test_astrology.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `astrology_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';
const TEST_USERNAME = 'astrology_test_user';

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

// 计数器
let passed = 0;
let failed = 0;
let total = 0;
let TOKEN = null; // 全局 Token 变量

// HTTP 请求函数
function httpRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            body: jsonBody,
            rawBody: body,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            rawBody: body,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试函数
async function testAPI(testName, method, endpoint, data = null, expectedStatus = 200, useToken = true) {
  total++;
  process.stdout.write(`测试 ${total}: ${testName} ... `);

  try {
    const token = useToken ? TOKEN : null;
    const response = await httpRequest(method, endpoint, data, token);

    if (response.statusCode === expectedStatus) {
      console.log(`${colors.green}✓ 通过${colors.reset} (HTTP ${response.statusCode})`);
      if (typeof response.body === 'object') {
        console.log(JSON.stringify(response.body, null, 2));
      } else {
        console.log(response.body);
      }
      console.log('');
      passed++;
      return { success: true, response };
    } else {
      console.log(`${colors.red}✗ 失败${colors.reset} (期望 HTTP ${expectedStatus}, 实际 HTTP ${response.statusCode})`);
      if (typeof response.body === 'object') {
        console.log(JSON.stringify(response.body, null, 2));
      } else {
        console.log(response.body);
      }
      console.log('');
      failed++;
      return { success: false, response };
    }
  } catch (error) {
    console.log(`${colors.red}✗ 错误${colors.reset}: ${error.message}`);
    console.log('');
    failed++;
    return { success: false, error };
  }
}

// 主测试流程
async function main() {
  console.log('==========================================');
  console.log('紫微斗数 API 测试开始');
  console.log('==========================================');
  console.log('');

  // 步骤 1: 注册新用户
  console.log('步骤 1: 注册新用户');
  console.log('----------------------------------------');
  let registerResponse = await httpRequest('POST', '/api/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    username: TEST_USERNAME,
  });

  if (registerResponse.statusCode === 200 && registerResponse.body.data && registerResponse.body.data.token) {
    TOKEN = registerResponse.body.data.token;
    console.log(`${colors.green}✓ 注册成功${colors.reset}`);
  } else {
    console.log(`${colors.yellow}注册失败，尝试登录...${colors.reset}`);
    let loginResponse = await httpRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (loginResponse.statusCode === 200 && loginResponse.body.data && loginResponse.body.data.token) {
      TOKEN = loginResponse.body.data.token;
      console.log(`${colors.green}✓ 登录成功${colors.reset}`);
    }
  }

  if (!TOKEN) {
    console.log(`${colors.red}无法获取 Token，测试终止${colors.reset}`);
    process.exit(1);
  }

  console.log(`Token: ${TOKEN.substring(0, 50)}...`);
  console.log('');

  // 步骤 2: 查询余额
  console.log('步骤 2: 查询天机币余额');
  console.log('----------------------------------------');
  let balanceResponse = await httpRequest('GET', '/api/coins/balance', null, TOKEN);
  let balance = 0;
  if (balanceResponse.statusCode === 200 && balanceResponse.body.data) {
    balance = balanceResponse.body.data.tianji_coins_balance || 0;
  }
  console.log(`当前余额: ${balance} 天机币`);
  console.log('');

  // 如果余额不足，尝试签到获取天机币
  if (balance < 20) {
    console.log(`${colors.yellow}余额不足，尝试签到获取天机币...${colors.reset}`);
    let checkinResponse = await httpRequest('POST', '/api/checkin', null, TOKEN);
    console.log(JSON.stringify(checkinResponse.body, null, 2));
    console.log('');
  }

  console.log('==========================================');
  console.log('开始测试紫微斗数 API');
  console.log('==========================================');
  console.log('');

  // 测试 1: 保存命盘结构
  await testAPI('保存命盘结构', 'POST', '/api/astrology/star-chart', {
    chart_structure: {
      birth_date: '1990-01-01',
      birth_time: '12:00:00',
      gender: 'male',
      stars: {
        ziwei: 'ziwei',
        tianji: 'tianji',
        taiyang: 'taiyang',
      },
      palaces: {
        ming: 'ming',
        fu: 'fu',
        cai: 'cai',
      },
    },
    brief_analysis_cache: {
      summary: '命盘分析摘要',
      key_points: ['要点1', '要点2'],
    },
  }, 200);

  // 测试 2: 查询命盘结构
  await testAPI('查询命盘结构', 'GET', '/api/astrology/star-chart', null, 200);

  // 测试 3: 更新简要分析缓存
  await testAPI('更新简要分析缓存', 'PUT', '/api/astrology/star-chart/brief-analysis', {
    brief_analysis_cache: {
      summary: '更新后的命盘分析摘要',
      key_points: ['更新要点1', '更新要点2', '更新要点3'],
      updated_at: '2025-01-30T13:00:00Z',
    },
  }, 200);

  // 测试 4: 解锁时空资产（需要扣费）
  const unlockResult = await testAPI('解锁时空资产', 'POST', '/api/astrology/time-assets/unlock', {
    dimension: 'yearly',
    period_start: '2025-01-01',
    period_end: '2025-12-31',
    period_type: 'year',
    expires_at: '2026-01-01T00:00:00Z',
    cost_coins: 10,
  }, 200);

  // 测试 5: 查询已解锁的时空资产
  await testAPI('查询已解锁的时空资产', 'GET', '/api/astrology/time-assets?limit=50&offset=0', null, 200);

  // 测试 6: 检查时间段是否已解锁
  await testAPI('检查时间段是否已解锁', 'GET', '/api/astrology/time-assets/check?dimension=yearly&period_start=2025-01-01&period_end=2025-12-31', null, 200);

  // 测试 7: 保存/更新缓存数据
  // 🔍 修复：将过期时间设置为未来时间，避免测试时已过期
  const futureExpiresAt = new Date();
  futureExpiresAt.setFullYear(futureExpiresAt.getFullYear() + 1); // 1年后过期
  await testAPI('保存/更新缓存数据', 'POST', '/api/astrology/cache', {
    dimension: 'yearly',
    cache_key: 'yearly_analysis_2025',
    cache_data: {
      analysis: '2025年运势分析',
      key_events: ['事件1', '事件2'],
      recommendations: ['建议1', '建议2'],
    },
    period_start: '2025-01-01',
    period_end: '2025-12-31',
    expires_at: futureExpiresAt.toISOString(),
  }, 200);

  // 测试 8: 查询缓存数据
  await testAPI('查询缓存数据', 'GET', '/api/astrology/cache?dimension=yearly&cache_key=yearly_analysis_2025&period_start=2025-01-01&period_end=2025-12-31', null, 200);

  // 测试 9: 参数验证错误（缺少必需参数）
  await testAPI('参数验证错误（缺少必需参数）', 'POST', '/api/astrology/star-chart', {
    brief_analysis_cache: {},
  }, 400);

  // 测试 10: 未认证请求
  await testAPI('未认证请求', 'GET', '/api/astrology/star-chart', null, 401, false);

  // 测试 11: 日期格式验证（错误的日期格式）
  await testAPI('日期格式验证（错误的日期格式）', 'POST', '/api/astrology/time-assets/unlock', {
    dimension: 'yearly',
    period_start: '2025/01/01',
    period_end: '2025-12-31',
    period_type: 'year',
    expires_at: '2026-01-01T00:00:00Z',
    cost_coins: 10,
  }, 400);

  // 测试 12: 重复解锁（应该失败）
  await testAPI('重复解锁（应该失败）', 'POST', '/api/astrology/time-assets/unlock', {
    dimension: 'yearly',
    period_start: '2025-01-01',
    period_end: '2025-12-31',
    period_type: 'year',
    expires_at: '2026-01-01T00:00:00Z',
    cost_coins: 10,
  }, 400);

  // 测试总结
  console.log('==========================================');
  console.log('测试总结');
  console.log('==========================================');
  console.log(`总测试数: ${total}`);
  console.log(`${colors.green}通过: ${passed}${colors.reset}`);
  console.log(`${colors.red}失败: ${failed}${colors.reset}`);
  console.log('');

  if (failed === 0) {
    console.log(`${colors.green}✓ 所有测试通过！${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ 部分测试失败${colors.reset}`);
    process.exit(1);
  }
}

// 运行测试
main().catch((error) => {
  console.error(`${colors.red}测试执行错误: ${error.message}${colors.reset}`);
  console.error(error);
  process.exit(1);
});

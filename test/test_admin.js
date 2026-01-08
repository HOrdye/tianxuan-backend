#!/usr/bin/env node

/**
 * 管理员后台 API 测试脚本
 * 使用方法: node test_admin.js
 */

const http = require('http');
const { URL } = require('url');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || `test_user_${Date.now()}@example.com`;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123456';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let ADMIN_TOKEN = '';
let TEST_USER_ID = '';
let TEST_USER_TOKEN = '';

// 统计
let passed = 0;
let failed = 0;
let total = 0;

/**
 * HTTP 请求函数（使用 Node.js http 模块）
 */
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
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
        resolve({
          status: res.statusCode,
          body: parsedBody,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        body: { error: error.message },
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * 测试 API
 */
async function testAPI(
  testName,
  method,
  endpoint,
  data = null,
  expectedStatus = 200,
  useToken = true,
  token = ADMIN_TOKEN
) {
  total++;
  process.stdout.write(`测试 ${total}: ${testName} ... `);

  const result = await httpRequest(
    method,
    endpoint,
    data,
    useToken ? token : null
  );

  if (result.status === expectedStatus) {
    console.log(`${colors.green}✓ 通过${colors.reset} (HTTP ${result.status})`);
    passed++;
    if (result.body && typeof result.body === 'object') {
      console.log(JSON.stringify(result.body, null, 2));
    }
    return { success: true, result };
  } else {
    console.log(
      `${colors.red}✗ 失败${colors.reset} (期望 HTTP ${expectedStatus}, 实际 HTTP ${result.status})`
    );
    failed++;
    console.log(JSON.stringify(result.body, null, 2));
    return { success: false, result };
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('========================================');
  console.log('管理员后台 API 测试开始');
  console.log('========================================');
  console.log(`基础URL: ${BASE_URL}`);
  console.log(`管理员邮箱: ${ADMIN_EMAIL}`);
  console.log('');

  try {
    // ========================================
    // 步骤 1: 准备测试数据
    // ========================================
    console.log(`${colors.cyan}步骤 1: 准备测试数据${colors.reset}`);
    console.log('----------------------------------------');

    // 1.1 注册测试用户
    console.log('1.1 注册测试用户...');
    const registerResult = await httpRequest('POST', '/api/auth/register', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      username: 'test_user',
    });

    if (registerResult.status === 200 || registerResult.status === 201) {
      TEST_USER_ID = registerResult.body.data?.userId || registerResult.body.userId;
      console.log(`${colors.green}✓ 测试用户注册成功${colors.reset}`);
      console.log(`用户ID: ${TEST_USER_ID}`);
    } else {
      console.log(`${colors.yellow}⚠ 测试用户可能已存在，尝试登录${colors.reset}`);
      // 尝试登录获取用户ID
      const loginResult = await httpRequest('POST', '/api/auth/login', {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
      });
      if (loginResult.status === 200) {
        TEST_USER_ID = loginResult.body.data?.user?.id || loginResult.body.user?.id;
        TEST_USER_TOKEN = loginResult.body.data?.token || loginResult.body.token;
        console.log(`${colors.green}✓ 测试用户登录成功${colors.reset}`);
        console.log(`用户ID: ${TEST_USER_ID}`);
      }
    }

    // 1.2 登录管理员账号
    console.log('\n1.2 登录管理员账号...');
    const adminLoginResult = await httpRequest('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (adminLoginResult.status === 200) {
      ADMIN_TOKEN =
        adminLoginResult.body.data?.token || adminLoginResult.body.token;
      console.log(`${colors.green}✓ 管理员登录成功${colors.reset}`);
    } else {
      console.log(
        `${colors.red}✗ 管理员登录失败: ${JSON.stringify(adminLoginResult.body)}${colors.reset}`
      );
      console.log(
        `${colors.yellow}提示: 请确保管理员账号存在，或在数据库中设置用户为管理员:${colors.reset}`
      );
      console.log(
        `${colors.yellow}UPDATE public.profiles SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';${colors.reset}`
      );
      process.exit(1);
    }

    // 1.3 如果没有测试用户ID，尝试从用户列表获取
    if (!TEST_USER_ID) {
      console.log('\n1.3 从用户列表获取测试用户ID...');
      const usersResult = await httpRequest(
        'GET',
        '/api/admin/users?pageSize=1',
        null,
        ADMIN_TOKEN
      );
      if (usersResult.status === 200 && usersResult.body.data?.length > 0) {
        TEST_USER_ID = usersResult.body.data[0].id;
        console.log(`${colors.green}✓ 获取到测试用户ID: ${TEST_USER_ID}${colors.reset}`);
      }
    }

    if (!TEST_USER_ID) {
      console.log(
        `${colors.red}✗ 无法获取测试用户ID，请手动设置 TEST_USER_ID 环境变量${colors.reset}`
      );
      process.exit(1);
    }

    console.log('');

    // ========================================
    // 测试组1: 用户管理
    // ========================================
    console.log(`${colors.cyan}测试组1: 用户管理${colors.reset}`);
    console.log('----------------------------------------');

    // 测试1.1: 获取用户列表（分页）
    await testAPI(
      '获取用户列表（分页）',
      'GET',
      '/api/admin/users?page=1&pageSize=20'
    );

    // 测试1.2: 用户列表搜索
    await testAPI(
      '用户列表搜索',
      'GET',
      '/api/admin/users?search=test&page=1&pageSize=20'
    );

    // 测试1.3: 用户列表筛选（按等级）
    await testAPI(
      '用户列表筛选（按等级）',
      'GET',
      '/api/admin/users?tier=explorer&page=1&pageSize=20'
    );

    // 测试1.4: 获取用户详情
    await testAPI(
      '获取用户详情',
      'GET',
      `/api/admin/users/${TEST_USER_ID}`
    );

    // 测试1.5: 修改用户等级
    await testAPI(
      '修改用户等级',
      'PUT',
      `/api/admin/users/${TEST_USER_ID}/tier`,
      { tier: 'premium' }
    );

    // 验证等级已修改
    const verifyTierResult = await httpRequest(
      'GET',
      `/api/admin/users/${TEST_USER_ID}`,
      null,
      ADMIN_TOKEN
    );
    if (
      verifyTierResult.status === 200 &&
      verifyTierResult.body.data?.tier === 'premium'
    ) {
      console.log(`${colors.green}✓ 验证: 用户等级已成功修改为 premium${colors.reset}`);
    }

    // 恢复等级
    await httpRequest(
      'PUT',
      `/api/admin/users/${TEST_USER_ID}/tier`,
      { tier: 'explorer' },
      ADMIN_TOKEN
    );

    // 测试1.6: 调整用户天机币
    await testAPI(
      '调整用户天机币',
      'PUT',
      `/api/admin/users/${TEST_USER_ID}/coins`,
      {
        adjustmentAmount: 100,
        reason: '测试调整',
        coinType: 'tianji_coins_balance',
      }
    );

    console.log('');

    // ========================================
    // 测试组2: 交易流水查询
    // ========================================
    console.log(`${colors.cyan}测试组2: 交易流水查询${colors.reset}`);
    console.log('----------------------------------------');

    // 测试2.1: 获取天机币交易流水
    await testAPI(
      '获取天机币交易流水',
      'GET',
      '/api/admin/coin-transactions?page=1&pageSize=20'
    );

    // 测试2.2: 天机币流水筛选（按用户）
    await testAPI(
      '天机币流水筛选（按用户）',
      'GET',
      `/api/admin/coin-transactions?userId=${TEST_USER_ID}&page=1&pageSize=20`
    );

    // 测试2.3: 天机币流水筛选（按日期范围）
    const today = new Date().toISOString().split('T')[0];
    await testAPI(
      '天机币流水筛选（按日期范围）',
      'GET',
      `/api/admin/coin-transactions?startDate=2025-01-01&endDate=${today}&page=1&pageSize=20`
    );

    // 测试2.4: 获取支付交易流水
    await testAPI(
      '获取支付交易流水',
      'GET',
      '/api/admin/payment-transactions?page=1&pageSize=20'
    );

    // 测试2.5: 支付流水筛选（按状态）
    await testAPI(
      '支付流水筛选（按状态）',
      'GET',
      '/api/admin/payment-transactions?status=paid&page=1&pageSize=20'
    );

    console.log('');

    // ========================================
    // 测试组3: 数据统计
    // ========================================
    console.log(`${colors.cyan}测试组3: 数据统计${colors.reset}`);
    console.log('----------------------------------------');

    // 测试3.1: 获取数据概览统计
    await testAPI('获取数据概览统计', 'GET', '/api/admin/stats/overview');

    // 测试3.2: 获取用户统计
    await testAPI('获取用户统计', 'GET', '/api/admin/stats/users?days=30');

    // 测试3.3: 获取收入统计
    await testAPI('获取收入统计', 'GET', '/api/admin/stats/revenue?days=30');

    console.log('');

    // ========================================
    // 测试组4: 权限验证
    // ========================================
    console.log(`${colors.cyan}测试组4: 权限验证${colors.reset}`);
    console.log('----------------------------------------');

    // 测试4.1: 未认证请求
    await testAPI(
      '未认证请求',
      'GET',
      '/api/admin/users',
      null,
      401,
      false
    );

    // 测试4.2: 非管理员请求（如果有测试用户token）
    if (TEST_USER_TOKEN) {
      await testAPI(
        '非管理员请求',
        'GET',
        '/api/admin/users',
        null,
        403,
        true,
        TEST_USER_TOKEN
      );
    } else {
      console.log(
        `${colors.yellow}⚠ 跳过非管理员请求测试（需要测试用户token）${colors.reset}`
      );
    }

    // 测试4.3: 无效的用户ID
    await testAPI(
      '无效的用户ID',
      'GET',
      '/api/admin/users/invalid-user-id',
      null,
      404
    );

    // 测试4.4: 无效的等级值
    await testAPI(
      '无效的等级值',
      'PUT',
      `/api/admin/users/${TEST_USER_ID}/tier`,
      { tier: 'invalid_tier' },
      500
    );

    console.log('');

    // ========================================
    // 测试结果汇总
    // ========================================
    console.log('========================================');
    console.log('测试结果汇总');
    console.log('========================================');
    console.log(`总测试数: ${total}`);
    console.log(`${colors.green}通过: ${passed}${colors.reset}`);
    console.log(`${colors.red}失败: ${failed}${colors.reset}`);
    console.log(
      `通过率: ${total > 0 ? ((passed / total) * 100).toFixed(2) : 0}%`
    );
    console.log('');

    if (failed === 0) {
      console.log(`${colors.green}✓ 所有测试通过！${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`${colors.red}✗ 部分测试失败，请检查上述错误${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}测试执行出错:${colors.reset}`, error);
    process.exit(1);
  }
}

// 运行测试
main();

#!/usr/bin/env node

/**
 * 订阅/会员系统 API 测试脚本
 * 使用方法: node test_subscription.js
 */

const http = require('http');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `subscription_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';
const TEST_USERNAME = 'subscription_test_user';

// 数据库连接池（用于测试9的独立数据准备）
let dbPool = null;
function getDbPool() {
  if (!dbPool) {
    // 优先使用 DATABASE_URL，如果没有则使用单独配置
    const config = process.env.DATABASE_URL ? {
      connectionString: process.env.DATABASE_URL,
    } : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'tianxuan',
      user: process.env.DB_USER || 'tianxuan',
      password: process.env.DB_PASSWORD,
    };
    dbPool = new Pool(config);
  }
  return dbPool;
}

// 从Token中解析userId
function getUserIdFromToken(token) {
  try {
    // 注意：这里不验证签名，只是解析payload（测试环境）
    const decoded = jwt.decode(token);
    
    // 🔍 调试日志：打印解析后的完整对象
    console.log('🔍 [Test Script Debug] Decoded in Test:', {
      decoded: decoded,
      userId: decoded?.userId,
      user_id: decoded?.user_id,
      id: decoded?.id,
      email: decoded?.email,
    });
    
    // 优先使用 userId（与 TokenPayload 接口一致）
    const userId = decoded?.userId || decoded?.user_id || decoded?.id;
    console.log('🔍 [Test Script Debug] Extracted userId:', userId);
    
    return userId;
  } catch (error) {
    console.error('解析Token失败:', error.message);
    return null;
  }
}

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
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试函数
async function testAPI(name, method, path, data, expectedStatus, useToken = true) {
  total++;
  try {
    const response = await httpRequest(
      method,
      path,
      data,
      useToken ? TOKEN : null
    );

    if (response.statusCode === expectedStatus) {
      console.log(`${colors.green}✓${colors.reset} ${name} ... ${colors.green}通过${colors.reset} (HTTP ${response.statusCode})`);
      passed++;
      if (response.body && typeof response.body === 'object') {
        console.log(JSON.stringify(response.body, null, 2));
      }
      return response.body;
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name} ... ${colors.red}失败${colors.reset} (期望 HTTP ${expectedStatus}, 实际 HTTP ${response.statusCode})`);
      failed++;
      console.log(JSON.stringify(response.body, null, 2));
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} ${name} ... ${colors.red}失败${colors.reset} (错误: ${error.message})`);
    failed++;
    return null;
  }
}

// 主测试函数
async function main() {
  console.log('==========================================');
  console.log('订阅/会员系统 API 测试开始');
  console.log('==========================================');
  console.log('');

  // 步骤 1: 注册新用户
  console.log('步骤 1: 注册新用户');
  console.log('----------------------------------------');
  try {
    const registerResponse = await httpRequest('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      username: TEST_USERNAME,
    });

    // 注册后需要登录获取 Token
    if (registerResponse.statusCode === 200 || registerResponse.statusCode === 201) {
      console.log(`${colors.green}✓ 注册成功${colors.reset}`);
    } else {
      console.log(`${colors.yellow}注册失败，尝试登录...${colors.reset}`);
    }
    
    // 登录获取 Token
    const loginResponse = await httpRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (loginResponse.statusCode === 200) {
      console.log(`${colors.green}✓ 登录成功${colors.reset}`);
      TOKEN = loginResponse.body.token || loginResponse.body.data?.token;
      if (!TOKEN && loginResponse.body.data) {
        TOKEN = loginResponse.body.data.token;
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗ 注册/登录失败: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  if (!TOKEN) {
    console.log(`${colors.red}✗ 无法获取 Token，测试终止${colors.reset}`);
    process.exit(1);
  }

  console.log(`Token: ${TOKEN.substring(0, 50)}...`);
  console.log('');

  console.log('==========================================');
  console.log('开始测试订阅/会员系统 API');
  console.log('==========================================');
  console.log('');

  // 测试 1: 获取订阅状态
  await testAPI('获取订阅状态', 'GET', '/api/subscription/status', null, 200);

  // 测试 2: 检查功能权限（免费用户）
  await testAPI('检查功能权限（yijing.available）', 'GET', '/api/subscription/check-feature?featurePath=yijing.available', null, 200);

  // 测试 3: 检查功能权限（高级功能）
  await testAPI('检查功能权限（ziwei.advancedChart）', 'GET', '/api/subscription/check-feature?featurePath=ziwei.advancedChart', null, 200);

  // 测试 4: 获取今日使用次数
  await testAPI('获取今日使用次数（yijing）', 'GET', '/api/subscription/usage/yijing', null, 200);

  // 测试 5: 记录功能使用
  await testAPI('记录功能使用（yijing）', 'POST', '/api/subscription/record-usage', {
    feature: 'yijing',
    metadata: { type: 'test' },
  }, 200);

  // 测试 6: 再次获取今日使用次数（应该增加）
  await testAPI('再次获取今日使用次数（yijing）', 'GET', '/api/subscription/usage/yijing', null, 200);

  // 测试 7: 创建订阅订单
  await testAPI('创建订阅订单（basic）', 'POST', '/api/subscription/create', {
    tier: 'basic',
    isYearly: false,
    paymentMethod: 'alipay',
  }, 200);

  // 测试 8: 检查过期订阅
  await testAPI('检查过期订阅', 'POST', '/api/subscription/check-expired', null, 200);

  // 测试 9: 取消订阅（独立测试，不依赖测试7）
  // 🛡️ 防御性操作：先给当前测试用户手动插入一条 pending 订阅
  // 这样无论测试 7 发生了什么，测试 9 都能独立运行
  console.log(`${colors.yellow}🛠️ [测试9准备] 为测试用户准备订阅数据...${colors.reset}`);
  let testUserId = null;
  try {
    testUserId = getUserIdFromToken(TOKEN);
    if (!testUserId) {
      console.log(`${colors.red}✗ 无法从Token中解析userId，跳过测试9数据准备${colors.reset}`);
    } else {
      console.log(`${colors.yellow}🔍 [测试9准备] 从Token解析的userId: ${testUserId}${colors.reset}`);
      const pool = getDbPool();
      
      // 先检查是否已有活跃或待支付的订阅
      const checkResult = await pool.query(
        `SELECT id, status, user_id FROM public.subscriptions 
         WHERE user_id = $1 
           AND status IN ('active', 'pending')
         ORDER BY created_at DESC
         LIMIT 1`,
        [testUserId]
      );

      if (checkResult.rows.length === 0) {
        // 如果没有，则插入一条测试订阅
        const startedAt = new Date();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1个月后过期

        const insertResult = await pool.query(
          `INSERT INTO public.subscriptions 
           (id, user_id, tier, status, started_at, expires_at, auto_renew, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id, status, user_id`,
          [testUserId, 'basic', 'pending', startedAt, expiresAt, true]
        );
        const inserted = insertResult.rows[0];
        console.log(`${colors.green}✓ [测试9准备] 已为用户插入测试订阅 (ID: ${inserted.id.substring(0, 8)}..., 状态: ${inserted.status}, user_id: ${inserted.user_id.substring(0, 8)}...)${colors.reset}`);
      } else {
        const existingSub = checkResult.rows[0];
        console.log(`${colors.yellow}⚠ [测试9准备] 用户已有订阅 (ID: ${existingSub.id.substring(0, 8)}..., 状态: ${existingSub.status}, user_id: ${existingSub.user_id.substring(0, 8)}...)${colors.reset}`);
        
        // 如果订阅状态不是 pending 或 active，更新为 pending
        if (!['pending', 'active'].includes(existingSub.status)) {
          await pool.query(
            `UPDATE public.subscriptions 
             SET status = 'pending', updated_at = NOW()
             WHERE id = $1`,
            [existingSub.id]
          );
          console.log(`${colors.green}✓ [测试9准备] 已更新订阅状态为 pending${colors.reset}`);
        }
        
        // 验证查询：再次查询确认订阅存在
        const verifyResult = await pool.query(
          `SELECT id, status FROM public.subscriptions 
           WHERE user_id = $1 
             AND status IN ('active', 'pending')
           ORDER BY created_at DESC
           LIMIT 1`,
          [testUserId]
        );
        console.log(`${colors.yellow}🔍 [测试9准备] 验证查询结果: 找到 ${verifyResult.rows.length} 条订阅${colors.reset}`);
      }
    }
  } catch (error) {
    console.log(`${colors.red}✗ [测试9准备] 数据准备失败: ${error.message}${colors.reset}`);
    console.error(error);
  }

  // 现在执行取消操作
  if (testUserId) {
    console.log(`${colors.yellow}🔍 [测试9] 准备取消订阅，userId: ${testUserId.substring(0, 8)}...${colors.reset}`);
  }
  await testAPI('取消订阅', 'POST', '/api/subscription/cancel', null, 200);

  // 测试 10: 参数验证错误（缺少必需参数）
  await testAPI('参数验证错误（缺少tier）', 'POST', '/api/subscription/create', {
    isYearly: false,
  }, 400);

  // 测试 11: 未认证请求
  await testAPI('未认证请求', 'GET', '/api/subscription/status', null, 401, false);

  // 测试 12: 检查订阅状态（支付回调后）
  // 注意：这个测试需要先有一个支付订单，这里先测试参数验证
  await testAPI('检查订阅状态（缺少orderId）', 'GET', '/api/subscription/check-status', null, 400);

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
  process.exit(1);
}).finally(() => {
  // 清理数据库连接
  if (dbPool) {
    dbPool.end().catch(() => {});
  }
});

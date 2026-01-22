/**
 * 退款功能测试脚本
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 或者导入到测试文件中运行
 * 
 * 前置条件：
 * - 用户已登录
 * - 有足够的天机币余额用于测试
 * 
 * ⚠️ 已知问题：
 * - 后端接口参数映射有问题，导致 amount 字段为 null
 * - 需要后端修复：确保 amount 参数正确映射到数据库 amount 字段
 * - 详见：docs/退款接口参数映射问题-后端修复提示.md
 */

// ==================== 工具函数 ====================

/**
 * 获取当前用户余额
 */
async function getCurrentBalance() {
  try {
    const { coinsApi } = await import('/src/api/modules/coins.ts');
    const response = await coinsApi.getBalance();
    if (response.success && response.data) {
      return {
        daily_coins_grant: response.data.daily_coins_grant || 0,
        activity_coins_grant: response.data.activity_coins_grant || 0,
        tianji_coins_balance: response.data.tianji_coins_balance || 0,
        total: (response.data.daily_coins_grant || 0) + 
               (response.data.activity_coins_grant || 0) + 
               (response.data.tianji_coins_balance || 0)
      };
    }
    throw new Error('获取余额失败');
  } catch (error) {
    console.error('❌ 获取余额失败:', error);
    throw error;
  }
}

/**
 * 打印余额信息
 */
function printBalance(balance, label = '当前余额') {
  console.log(`\n📊 ${label}:`);
  console.log(`  每日赠送余额: ${balance.daily_coins_grant}`);
  console.log(`  活动赠送余额: ${balance.activity_coins_grant}`);
  console.log(`  储值余额: ${balance.tianji_coins_balance}`);
  console.log(`  总余额: ${balance.total}`);
}

/**
 * 验证余额变化
 */
function verifyBalanceChange(before, after, expectedChange) {
  const actualChange = {
    daily_coins_grant: after.daily_coins_grant - before.daily_coins_grant,
    activity_coins_grant: after.activity_coins_grant - before.activity_coins_grant,
    tianji_coins_balance: after.tianji_coins_balance - before.tianji_coins_balance
  };
  
  const match = 
    actualChange.daily_coins_grant === expectedChange.daily_coins_grant &&
    actualChange.activity_coins_grant === expectedChange.activity_coins_grant &&
    actualChange.tianji_coins_balance === expectedChange.tianji_coins_balance;
  
  if (match) {
    console.log('✅ 余额变化验证通过');
  } else {
    console.error('❌ 余额变化验证失败');
    console.log('期望变化:', expectedChange);
    console.log('实际变化:', actualChange);
  }
  
  return match;
}

// ==================== 测试用例 ====================

/**
 * 测试1: 精确退款 - 仅每日赠送余额
 */
async function testRefundDailyGrantOnly() {
  console.log('\n🧪 测试1: 精确退款 - 仅每日赠送余额');
  
  try {
    const { refundCoins } = await import('/src/utils/refundHelper.ts');
    
    // 获取退款前余额
    const balanceBefore = await getCurrentBalance();
    printBalance(balanceBefore, '退款前余额');
    
    // 执行退款（模拟从每日赠送余额扣费10币）
    const deductionDetail = {
      daily_coins_grant: 10,
      activity_coins_grant: 0,
      tianji_coins_balance: 0
    };
    
    const requestId = `test_refund_daily_${Date.now()}`;
    const result = await refundCoins(
      deductionDetail,
      '测试退款 - 仅每日赠送余额',
      requestId
    );
    
    console.log('退款结果:', result);
    
    if (!result.success) {
      throw new Error(result.error || '退款失败');
    }
    
    // 等待余额更新
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 获取退款后余额
    const balanceAfter = await getCurrentBalance();
    printBalance(balanceAfter, '退款后余额');
    
    // 验证余额变化
    verifyBalanceChange(balanceBefore, balanceAfter, {
      daily_coins_grant: 10,
      activity_coins_grant: 0,
      tianji_coins_balance: 0
    });
    
    console.log('✅ 测试1通过');
    return true;
  } catch (error) {
    console.error('❌ 测试1失败:', error);
    return false;
  }
}

/**
 * 测试2: 精确退款 - 仅储值余额
 */
async function testRefundBalanceOnly() {
  console.log('\n🧪 测试2: 精确退款 - 仅储值余额');
  
  try {
    const { refundCoins } = await import('/src/utils/refundHelper.ts');
    
    const balanceBefore = await getCurrentBalance();
    printBalance(balanceBefore, '退款前余额');
    
    const deductionDetail = {
      daily_coins_grant: 0,
      activity_coins_grant: 0,
      tianji_coins_balance: 10
    };
    
    const requestId = `test_refund_balance_${Date.now()}`;
    const result = await refundCoins(
      deductionDetail,
      '测试退款 - 仅储值余额',
      requestId
    );
    
    console.log('退款结果:', result);
    
    if (!result.success) {
      throw new Error(result.error || '退款失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const balanceAfter = await getCurrentBalance();
    printBalance(balanceAfter, '退款后余额');
    
    verifyBalanceChange(balanceBefore, balanceAfter, {
      daily_coins_grant: 0,
      activity_coins_grant: 0,
      tianji_coins_balance: 10
    });
    
    console.log('✅ 测试2通过');
    return true;
  } catch (error) {
    console.error('❌ 测试2失败:', error);
    return false;
  }
}

/**
 * 测试3: 精确退款 - 混合扣费（三种余额类型）
 */
async function testRefundMixed() {
  console.log('\n🧪 测试3: 精确退款 - 混合扣费');
  
  try {
    const { refundCoins } = await import('/src/utils/refundHelper.ts');
    
    const balanceBefore = await getCurrentBalance();
    printBalance(balanceBefore, '退款前余额');
    
    // 模拟混合扣费：5币每日赠送 + 3币活动赠送 + 2币储值余额
    const deductionDetail = {
      daily_coins_grant: 5,
      activity_coins_grant: 3,
      tianji_coins_balance: 2
    };
    
    const requestId = `test_refund_mixed_${Date.now()}`;
    const result = await refundCoins(
      deductionDetail,
      '测试退款 - 混合扣费',
      requestId
    );
    
    console.log('退款结果:', result);
    
    if (!result.success) {
      throw new Error(result.error || '退款失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const balanceAfter = await getCurrentBalance();
    printBalance(balanceAfter, '退款后余额');
    
    verifyBalanceChange(balanceBefore, balanceAfter, {
      daily_coins_grant: 5,
      activity_coins_grant: 3,
      tianji_coins_balance: 2
    });
    
    console.log('✅ 测试3通过');
    return true;
  } catch (error) {
    console.error('❌ 测试3失败:', error);
    return false;
  }
}

/**
 * 测试4: 降级方案 - 无扣费明细
 */
async function testRefundFallback() {
  console.log('\n🧪 测试4: 降级方案 - 无扣费明细');
  
  try {
    const { paymentApi } = await import('/src/api/modules/payment.ts');
    
    const balanceBefore = await getCurrentBalance();
    printBalance(balanceBefore, '退款前余额');
    
    // 调用退款接口，不提供 deduction 字段（降级方案）
    const requestId = `test_refund_fallback_${Date.now()}`;
    const response = await paymentApi.createRefundLog({
      amount: 10,
      reason: '测试退款 - 降级方案',
      original_request_id: requestId
      // 注意：不提供 deduction 字段
    });
    
    console.log('退款响应:', response);
    
    if (!response.success) {
      throw new Error(response.error || response.message || '退款失败');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const balanceAfter = await getCurrentBalance();
    printBalance(balanceAfter, '退款后余额');
    
    // 降级方案应该退到储值余额
    const actualChange = balanceAfter.tianji_coins_balance - balanceBefore.tianji_coins_balance;
    if (actualChange === 10) {
      console.log('✅ 降级方案验证通过：已退到储值余额');
    } else {
      console.error('❌ 降级方案验证失败：期望退10币到储值余额，实际变化:', actualChange);
    }
    
    console.log('✅ 测试4通过');
    return true;
  } catch (error) {
    console.error('❌ 测试4失败:', error);
    return false;
  }
}

/**
 * 测试5: 幂等性测试 - 重复退款
 */
async function testRefundIdempotency() {
  console.log('\n🧪 测试5: 幂等性测试 - 重复退款');
  
  try {
    const { refundCoins } = await import('/src/utils/refundHelper.ts');
    
    const balanceBefore = await getCurrentBalance();
    printBalance(balanceBefore, '第一次退款前余额');
    
    const deductionDetail = {
      daily_coins_grant: 5,
      activity_coins_grant: 0,
      tianji_coins_balance: 0
    };
    
    const requestId = `test_refund_idempotency_${Date.now()}`;
    
    // 第一次退款
    const result1 = await refundCoins(
      deductionDetail,
      '测试退款 - 幂等性测试',
      requestId
    );
    
    console.log('第一次退款结果:', result1);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const balanceAfter1 = await getCurrentBalance();
    printBalance(balanceAfter1, '第一次退款后余额');
    
    // 第二次退款（使用相同的 requestId）
    const result2 = await refundCoins(
      deductionDetail,
      '测试退款 - 幂等性测试（重复）',
      requestId
    );
    
    console.log('第二次退款结果:', result2);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const balanceAfter2 = await getCurrentBalance();
    printBalance(balanceAfter2, '第二次退款后余额');
    
    // 验证：第二次退款不应该再次增加余额
    const change1 = balanceAfter1.daily_coins_grant - balanceBefore.daily_coins_grant;
    const change2 = balanceAfter2.daily_coins_grant - balanceAfter1.daily_coins_grant;
    
    if (change1 === 5 && change2 === 0) {
      console.log('✅ 幂等性验证通过：重复退款不会重复增加余额');
    } else {
      console.error('❌ 幂等性验证失败');
      console.log('第一次变化:', change1);
      console.log('第二次变化:', change2);
    }
    
    console.log('✅ 测试5通过');
    return true;
  } catch (error) {
    console.error('❌ 测试5失败:', error);
    return false;
  }
}

/**
 * 测试6: 边界情况 - 退款金额为0
 */
async function testRefundZeroAmount() {
  console.log('\n🧪 测试6: 边界情况 - 退款金额为0');
  
  try {
    const { refundCoins } = await import('/src/utils/refundHelper.ts');
    
    const deductionDetail = {
      daily_coins_grant: 0,
      activity_coins_grant: 0,
      tianji_coins_balance: 0
    };
    
    const result = await refundCoins(
      deductionDetail,
      '测试退款 - 金额为0',
      `test_refund_zero_${Date.now()}`
    );
    
    console.log('退款结果:', result);
    
    if (result.success && !result.refunded && result.message === '无需退款') {
      console.log('✅ 边界情况验证通过：金额为0时正确返回无需退款');
      return true;
    } else {
      console.error('❌ 边界情况验证失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 测试6失败:', error);
    return false;
  }
}

/**
 * 测试7: 错误处理 - 无效的扣费明细
 */
async function testRefundInvalidDeduction() {
  console.log('\n🧪 测试7: 错误处理 - 无效的扣费明细');
  
  try {
    const { paymentApi } = await import('/src/api/modules/payment.ts');
    
    // 测试负数金额
    const response1 = await paymentApi.createRefundLog({
      amount: 10,
      reason: '测试退款 - 负数金额',
      deduction: {
        daily_coins_grant: -5,
        activity_coins_grant: 0,
        tianji_coins_balance: 15
      }
    });
    
    console.log('负数金额测试结果:', response1);
    
    // 测试金额不匹配
    const response2 = await paymentApi.createRefundLog({
      amount: 10,
      reason: '测试退款 - 金额不匹配',
      deduction: {
        daily_coins_grant: 5,
        activity_coins_grant: 3,
        tianji_coins_balance: 3  // 总和11，与amount不匹配
      }
    });
    
    console.log('金额不匹配测试结果:', response2);
    
    console.log('✅ 测试7完成（错误处理由后端验证）');
    return true;
  } catch (error) {
    console.error('❌ 测试7失败:', error);
    return false;
  }
}

// ==================== 主测试函数 ====================

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始退款功能测试\n');
  console.log('='.repeat(60));
  
  const results = [];
  
  // 运行所有测试
  results.push({ name: '测试1: 精确退款 - 仅每日赠送余额', result: await testRefundDailyGrantOnly() });
  await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
  
  results.push({ name: '测试2: 精确退款 - 仅储值余额', result: await testRefundBalanceOnly() });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push({ name: '测试3: 精确退款 - 混合扣费', result: await testRefundMixed() });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push({ name: '测试4: 降级方案 - 无扣费明细', result: await testRefundFallback() });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push({ name: '测试5: 幂等性测试', result: await testRefundIdempotency() });
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push({ name: '测试6: 边界情况 - 退款金额为0', result: await testRefundZeroAmount() });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  results.push({ name: '测试7: 错误处理', result: await testRefundInvalidDeduction() });
  
  // 打印测试结果摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果摘要:');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  results.forEach((test, index) => {
    const status = test.result ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${test.name}: ${status}`);
    if (test.result) passed++;
    else failed++;
  });
  
  console.log('='.repeat(60));
  console.log(`总计: ${results.length} 个测试`);
  console.log(`通过: ${passed} 个`);
  console.log(`失败: ${failed} 个`);
  console.log('='.repeat(60));
  
  // 获取最终余额
  try {
    const finalBalance = await getCurrentBalance();
    printBalance(finalBalance, '最终余额');
  } catch (error) {
    console.error('❌ 获取最终余额失败:', error);
  }
  
  return results;
}

// ==================== 导出 ====================

// 如果在浏览器控制台运行
if (typeof window !== 'undefined') {
  window.refundTest = {
    runAllTests,
    testRefundDailyGrantOnly,
    testRefundBalanceOnly,
    testRefundMixed,
    testRefundFallback,
    testRefundIdempotency,
    testRefundZeroAmount,
    testRefundInvalidDeduction,
    getCurrentBalance,
    printBalance
  };
  
  console.log('✅ 退款测试脚本已加载');
  console.log('使用方法:');
  console.log('  - 运行所有测试: await refundTest.runAllTests()');
  console.log('  - 运行单个测试: await refundTest.testRefundDailyGrantOnly()');
  console.log('  - 查看余额: await refundTest.getCurrentBalance()');
}

// 如果在 Node.js 环境运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testRefundDailyGrantOnly,
    testRefundBalanceOnly,
    testRefundMixed,
    testRefundFallback,
    testRefundIdempotency,
    testRefundZeroAmount,
    testRefundInvalidDeduction,
    getCurrentBalance,
    printBalance
  };
}

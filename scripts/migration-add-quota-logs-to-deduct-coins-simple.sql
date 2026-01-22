-- ============================================================================
-- 修改 deduct_coins 函数，添加写入 quota_logs 表的逻辑（简化版）
-- 创建时间: 2026-01-14
-- 说明: 提供代码片段，可以手动插入到 deduct_coins 函数中
-- ============================================================================

-- ⚠️ 重要提示：
-- 1. 执行前请先备份数据库！
-- 2. 请先查看当前 deduct_coins 函数的完整定义
-- 3. 找到函数中计算完余额后、返回结果前的位置
-- 4. 将下面的代码片段插入到该位置

-- ============================================================================
-- 步骤1: 查看当前函数定义
-- ============================================================================
-- 执行以下查询查看函数定义：
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 或者查看函数源代码：
SELECT prosrc as function_source
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 步骤2: 在函数中添加变量声明（如果还没有）
-- ============================================================================
-- 在 DECLARE 部分添加以下变量（如果函数中还没有）：
/*
DECLARE
  -- 原有变量...
  v_balance_before INTEGER;  -- ✅ 新增：扣费前余额
  v_balance_after INTEGER;  -- ✅ 新增：扣费后余额
*/

-- ============================================================================
-- 步骤3: 在查询余额后，计算扣费前总余额
-- ============================================================================
-- 在查询当前余额后，添加以下代码：
/*
  -- ✅ 计算扣费前总余额
  v_balance_before := COALESCE(v_current_tianji_balance, 0) + 
                      COALESCE(v_current_daily_grant, 0) + 
                      COALESCE(v_current_activity_grant, 0);
*/

-- ============================================================================
-- 步骤4: 在扣费成功后、返回结果前，添加写入 quota_logs 的代码
-- ============================================================================
-- 找到函数中计算完 v_remaining_balance 后、RETURN 语句前的位置
-- 插入以下代码：

/*
  -- ✅ 计算扣费后总余额
  v_balance_after := v_remaining_balance;

  -- ✅ 写入 quota_logs 表（配额消耗日志）
  INSERT INTO public.quota_logs (
    user_id,
    feature,
    action_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
  )
  VALUES (
    p_user_id,
    p_feature_type,           -- feature: 功能类型（如 'deep_insight', 'chat_assistant' 等）
    'consume',                 -- action_type: 消耗
    -p_price,                  -- amount: 负数表示减少
    v_balance_before,          -- balance_before: 扣费前余额
    v_balance_after,           -- balance_after: 扣费后余额
    '扣费：' || p_feature_type, -- description: 扣费描述
    NOW()
  );
*/

-- ============================================================================
-- 步骤5: 完整的函数修改示例（参考）
-- ============================================================================
-- 以下是一个完整的函数修改示例，展示如何将代码插入到函数中
-- 注意：需要根据实际函数结构进行调整

/*
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_user_id UUID,
  p_feature_type TEXT,
  p_price INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- 原有变量声明
  v_current_daily_grant INTEGER;
  v_current_activity_grant INTEGER;
  v_current_tianji_balance INTEGER;
  v_remaining_balance INTEGER;
  
  -- ✅ 新增变量
  v_balance_before INTEGER;  -- 扣费前余额
  v_balance_after INTEGER;   -- 扣费后余额
  
  v_result JSONB;
BEGIN
  -- 1. 查询当前余额（原有逻辑）
  SELECT 
    COALESCE(tianji_coins_balance, 0),
    COALESCE(daily_coins_grant, 0),
    COALESCE(activity_coins_grant, 0)
  INTO 
    v_current_tianji_balance,
    v_current_daily_grant,
    v_current_activity_grant
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', '用户不存在');
  END IF;

  -- ✅ 2. 计算扣费前总余额（新增）
  v_balance_before := COALESCE(v_current_tianji_balance, 0) + 
                      COALESCE(v_current_daily_grant, 0) + 
                      COALESCE(v_current_activity_grant, 0);

  -- 3. 执行扣费逻辑（原有逻辑，根据实际情况调整）
  -- ... 扣费逻辑 ...

  -- ✅ 4. 计算扣费后总余额（新增）
  v_balance_after := v_remaining_balance;

  -- ✅ 5. 写入 quota_logs 表（新增）
  INSERT INTO public.quota_logs (
    user_id,
    feature,
    action_type,
    amount,
    balance_before,
    balance_after,
    description,
    created_at
  )
  VALUES (
    p_user_id,
    p_feature_type,
    'consume',
    -p_price,
    v_balance_before,
    v_balance_after,
    '扣费：' || p_feature_type,
    NOW()
  );

  -- 6. 返回结果（原有逻辑）
  v_result := jsonb_build_object(
    'success', true,
    'message', '扣费成功',
    'remaining_balance', v_remaining_balance
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '扣费失败：' || SQLERRM
    );
END;
$function$;
*/

-- ============================================================================
-- 步骤6: 验证修改
-- ============================================================================
-- 修改后，执行以下查询验证函数是否包含 quota_logs 相关代码：
SELECT 
  proname as function_name,
  CASE WHEN prosrc LIKE '%quota_logs%' THEN '✅ 包含 quota_logs' ELSE '❌ 不包含 quota_logs' END as has_quota_logs,
  CASE WHEN prosrc LIKE '%INSERT%quota_logs%' THEN '✅ 包含 INSERT INTO quota_logs' ELSE '❌ 不包含' END as has_insert_quota_logs
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 步骤7: 测试（可选）
-- ============================================================================
-- 测试前请确保有测试用户和足够的余额
/*
-- 测试扣费
SELECT deduct_coins(
  '测试用户ID'::UUID,
  'deep_insight',
  10
);

-- 检查 quota_logs 表是否有记录
SELECT * FROM quota_logs 
WHERE user_id = '测试用户ID'::UUID
ORDER BY created_at DESC 
LIMIT 1;
*/

-- ============================================================================
-- 使用说明
-- ============================================================================
-- 1. 执行步骤1，查看当前函数定义
-- 2. 找到函数中计算完余额后、返回结果前的位置
-- 3. 在 DECLARE 部分添加 v_balance_before 和 v_balance_after 变量（如果还没有）
-- 4. 在查询余额后，添加计算 v_balance_before 的代码
-- 5. 在扣费成功后、返回结果前，添加写入 quota_logs 表的代码
-- 6. 执行步骤6验证修改
-- 7. 执行步骤7测试（可选）

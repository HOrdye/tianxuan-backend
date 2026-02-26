-- ============================================================================
-- 修改 deduct_coins 函数，添加写入 quota_logs 表的逻辑
-- 创建时间: 2026-01-14
-- 说明: 在扣费成功后，将扣费记录写入 quota_logs 表（配额消耗日志）
-- ============================================================================

-- ⚠️ 重要提示：
-- 1. 执行前请先备份数据库！
-- 2. 请先查看当前 deduct_coins 函数的完整定义，确认函数结构
-- 3. 如果函数结构不同，需要根据实际情况调整此脚本

-- ============================================================================
-- 步骤1: 查看当前函数定义（用于确认函数结构）
-- ============================================================================
-- 执行以下查询查看函数定义：
/*
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
*/

-- ============================================================================
-- 步骤2: 修改 deduct_coins 函数，添加写入 quota_logs 表的逻辑
-- ============================================================================
-- 注意：以下是一个通用的修改模板，需要根据实际函数结构进行调整
-- 关键点：在扣费成功后、返回结果前，添加写入 quota_logs 表的代码

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
  -- 原有的变量声明（需要根据实际函数调整）
  v_current_daily_grant INTEGER;
  v_current_activity_grant INTEGER;
  v_current_tianji_balance INTEGER;
  v_remaining_balance INTEGER;
  v_balance_before INTEGER;  -- ✅ 新增：扣费前余额
  v_balance_after INTEGER;   -- ✅ 新增：扣费后余额
  v_result JSONB;
BEGIN
  -- ============================================================================
  -- 1. 查询当前余额（扣费前）
  -- ============================================================================
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

  -- 如果用户不存在，返回错误
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', '用户不存在'
    );
  END IF;

  -- ✅ 计算扣费前总余额
  v_balance_before := COALESCE(v_current_tianji_balance, 0) + 
                       COALESCE(v_current_daily_grant, 0) + 
                       COALESCE(v_current_activity_grant, 0);

  -- ============================================================================
  -- 2. 执行扣费逻辑（原有逻辑，需要根据实际函数调整）
  -- ============================================================================
  -- 注意：以下是示例逻辑，需要根据实际函数实现调整
  
  -- 优先扣除限时缘分（缘分币，daily_coins_grant）
  IF v_current_daily_grant >= p_price THEN
    -- 只扣除限时缘分
    UPDATE public.profiles
    SET daily_coins_grant = daily_coins_grant - p_price,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    v_remaining_balance := v_current_tianji_balance + 
                          (v_current_daily_grant - p_price) + 
                          v_current_activity_grant;
  ELSE
    -- 先扣除限时缘分，再扣除永久余额
    DECLARE
      v_remaining_price INTEGER;
    BEGIN
      v_remaining_price := p_price - v_current_daily_grant;
      
      IF v_current_tianji_balance + v_current_activity_grant < v_remaining_price THEN
        -- 余额不足
        RETURN jsonb_build_object(
          'success', false,
          'error', '余额不足'
        );
      END IF;
      
      -- 扣除限时缘分和永久余额
      UPDATE public.profiles
      SET daily_coins_grant = 0,
          tianji_coins_balance = GREATEST(0, tianji_coins_balance - v_remaining_price),
          updated_at = NOW()
      WHERE id = p_user_id;
      
      v_remaining_balance := (GREATEST(0, v_current_tianji_balance - v_remaining_price)) + 
                            v_current_activity_grant;
    END;
  END IF;

  -- ✅ 计算扣费后总余额
  v_balance_after := v_remaining_balance;

  -- ============================================================================
  -- 3. ✅ 新增：写入 quota_logs 表（配额消耗日志）
  -- ============================================================================
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

  -- ============================================================================
  -- 4. 返回结果
  -- ============================================================================
  v_result := jsonb_build_object(
    'success', true,
    'message', '扣费成功',
    'remaining_balance', v_remaining_balance
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- 错误处理
    RETURN jsonb_build_object(
      'success', false,
      'error', '扣费失败：' || SQLERRM
    );
END;
$function$;

-- ============================================================================
-- 步骤3: 验证修改后的函数
-- ============================================================================
-- 检查函数是否包含 quota_logs 相关代码
SELECT 
  proname as function_name,
  CASE WHEN prosrc LIKE '%quota_logs%' THEN '✅ 包含 quota_logs' ELSE '❌ 不包含 quota_logs' END as has_quota_logs,
  CASE WHEN prosrc LIKE '%INSERT%quota_logs%' THEN '✅ 包含 INSERT INTO quota_logs' ELSE '❌ 不包含' END as has_insert_quota_logs
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 步骤4: 测试函数（可选）
-- ============================================================================
-- 注意：测试前请确保有测试用户和足够的余额
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
-- 注意事项
-- ============================================================================
-- 1. 此脚本是一个模板，需要根据实际 deduct_coins 函数的结构进行调整
-- 2. 如果函数已经存在，CREATE OR REPLACE 会替换现有函数
-- 3. 建议先在测试环境执行，验证无误后再在生产环境执行
-- 4. 执行前请备份数据库
-- 5. 如果函数结构复杂，建议先查看完整函数定义，然后手动修改

-- ============================================================================
-- 如果函数结构不同，可以使用以下方法：
-- ============================================================================
-- 方法1: 查看完整函数定义
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'deduct_coins';
--
-- 方法2: 查看函数源代码
-- SELECT prosrc FROM pg_proc WHERE proname = 'deduct_coins';
--
-- 方法3: 在函数返回前添加写入 quota_logs 的代码
-- 找到 RETURN 语句前的位置，添加 INSERT INTO quota_logs 的代码

-- ============================================================================
-- 修复 deduct_coins 函数（如果需要）
-- 用途：如果函数写入的是 coin_transactions 表，修改为写入 transactions 表
-- 注意：执行前请先备份数据库！
-- ============================================================================

-- ============================================================================
-- 步骤1: 检查当前函数使用的表名
-- ============================================================================
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%INSERT INTO%public.transactions%' OR 
         prosrc LIKE '%INSERT INTO public.transactions%'
      THEN '✅ 已使用 public.transactions 表（无需修复）'
    WHEN prosrc LIKE '%INSERT INTO%public.coin_transactions%' OR 
         prosrc LIKE '%INSERT INTO public.coin_transactions%'
      THEN '❌ 使用 public.coin_transactions 表（需要修复）'
    ELSE '❓ 无法确定（需要查看完整函数定义）'
  END as current_status
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- 步骤2: 如果发现使用 coin_transactions，执行以下修复
-- ============================================================================
-- 注意：以下SQL是示例，需要根据实际函数实现进行调整
-- 请先查看完整函数定义，然后修改相应的 INSERT INTO 语句

-- 示例修复（需要根据实际函数实现调整）:
/*
CREATE OR REPLACE FUNCTION public.deduct_coins(
  p_user_id uuid, 
  p_feature_type text, 
  p_price integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_daily_grant INTEGER;
  v_current_activity_grant INTEGER;
  v_current_tianji_balance INTEGER;
  v_transaction_id UUID;
  v_remaining_balance INTEGER;
  v_result JSONB;
BEGIN
  -- ... 扣费逻辑 ...
  
  -- ✅ 修复：确保写入 public.transactions 表
  INSERT INTO public.transactions (
    id,
    user_id,
    type,
    amount,
    coins_amount,
    item_type,
    description,
    status,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    'deduct',
    0,  -- amount 为 0（天机币扣费不涉及现金）
    -p_price,  -- coins_amount 为负数（扣费）
    p_feature_type,
    '扣费：' || p_feature_type,
    'completed',
    NOW()
  )
  RETURNING id INTO v_transaction_id;
  
  -- ... 返回结果 ...
  
  RETURN v_result;
END;
$function$;
*/

-- ============================================================================
-- 步骤3: 验证修复后的函数
-- ============================================================================
-- 执行一次测试扣费，然后检查记录是否写入 transactions 表
/*
-- 测试扣费（使用测试用户ID）
SELECT deduct_coins('测试用户ID', 'star_chart', 10);

-- 检查记录是否在 transactions 表中
SELECT id, user_id, type, coins_amount, item_type, created_at
FROM public.transactions
WHERE user_id = '测试用户ID'
  AND type = 'deduct'
  AND item_type = 'star_chart'
ORDER BY created_at DESC
LIMIT 1;
*/

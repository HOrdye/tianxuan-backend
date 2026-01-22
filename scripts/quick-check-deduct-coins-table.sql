-- ============================================================================
-- 快速检查 deduct_coins 函数使用的表名
-- 用途：快速确认函数写入的是 transactions 还是 coin_transactions 表
-- ============================================================================

-- 检查1: 检查函数体中 INSERT INTO 语句使用的表名
SELECT 
  proname as function_name,
  CASE 
    WHEN prosrc LIKE '%INSERT INTO%public.transactions%' OR 
         prosrc LIKE '%INSERT INTO public.transactions%' OR
         prosrc LIKE '%INTO public.transactions%'
      THEN '✅ 使用 public.transactions 表（正确）'
    WHEN prosrc LIKE '%INSERT INTO%public.coin_transactions%' OR 
         prosrc LIKE '%INSERT INTO public.coin_transactions%' OR
         prosrc LIKE '%INTO public.coin_transactions%'
      THEN '❌ 使用 public.coin_transactions 表（需要修复）'
    WHEN prosrc LIKE '%INSERT INTO%transactions%' AND prosrc NOT LIKE '%coin_transactions%'
      THEN '⚠️ 可能使用 transactions 表（需要确认是否有 schema 前缀）'
    WHEN prosrc LIKE '%INSERT INTO%coin_transactions%'
      THEN '⚠️ 可能使用 coin_transactions 表（需要修复）'
    ELSE '❓ 未找到明确的 INSERT INTO 语句或表名不明确'
  END as table_usage_status,
  LENGTH(prosrc) as function_body_length,
  CASE 
    WHEN prosrc LIKE '%INSERT INTO%' THEN '包含 INSERT INTO'
    ELSE '未找到 INSERT INTO'
  END as has_insert_statement
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 检查2: 检查函数中使用的关键字（可能使用动态SQL或调用其他函数）
SELECT 
  proname as function_name,
  CASE WHEN upper(prosrc) LIKE '%EXECUTE%' THEN '✅ 包含 EXECUTE（可能使用动态SQL）' ELSE '❌ 不包含' END as has_execute,
  CASE WHEN upper(prosrc) LIKE '%PERFORM%' THEN '✅ 包含 PERFORM（可能调用其他函数）' ELSE '❌ 不包含' END as has_perform,
  CASE WHEN upper(prosrc) LIKE '%TRANSACTIONS%' THEN '✅ 包含 transactions' ELSE '❌ 不包含' END as has_transactions,
  CASE WHEN upper(prosrc) LIKE '%COIN_TRANSACTIONS%' THEN '✅ 包含 coin_transactions' ELSE '❌ 不包含' END as has_coin_transactions,
  CASE WHEN upper(prosrc) LIKE '%TRANSACTION_ID%' THEN '✅ 包含 transaction_id' ELSE '❌ 不包含' END as has_transaction_id,
  CASE WHEN upper(prosrc) LIKE '%RETURNING%' THEN '✅ 包含 RETURNING' ELSE '❌ 不包含' END as has_returning
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 检查3: 如果包含 EXECUTE，查找动态SQL中使用的表名
SELECT 
  '动态SQL片段（如果存在）' as description,
  CASE 
    WHEN upper(prosrc) LIKE '%EXECUTE%TRANSACTIONS%' THEN
      substring(prosrc, 
        greatest(1, position('EXECUTE' in upper(prosrc)) - 50),
        least(300, length(prosrc) - position('EXECUTE' in upper(prosrc)) + 250)
      )
    ELSE '未找到 EXECUTE 语句'
  END as execute_snippet
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND upper(prosrc) LIKE '%EXECUTE%';

-- 检查4: 查找函数体中所有包含 "transactions" 的部分（上下文）
SELECT 
  '包含 transactions 的上下文' as description,
  CASE 
    WHEN upper(prosrc) LIKE '%TRANSACTIONS%' THEN
      -- 找到第一个包含 transactions 的位置，显示前后各200字符
      substring(prosrc, 
        greatest(1, position('transactions' in lower(prosrc)) - 200),
        least(500, length(prosrc) - position('transactions' in lower(prosrc)) + 200)
      )
    ELSE '未找到 transactions 关键字'
  END as transactions_context
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND upper(prosrc) LIKE '%TRANSACTIONS%';

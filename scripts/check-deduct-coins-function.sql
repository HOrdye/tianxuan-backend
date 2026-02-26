-- ============================================================================
-- 检查 deduct_coins 函数实现
-- 用途：确认函数写入的表名，确保与代码一致
-- ============================================================================

-- 方法1: 查询完整函数定义
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 方法2: 如果函数定义太长，可以分段查看
-- 先查看函数的基本信息
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 方法3: 检查函数中是否有 INSERT INTO 语句，以及使用的表名
-- 注意：这个方法需要函数体包含 INSERT INTO 关键字
SELECT 
  proname,
  CASE 
    WHEN prosrc LIKE '%INSERT INTO%public.transactions%' THEN 'transactions'
    WHEN prosrc LIKE '%INSERT INTO%public.coin_transactions%' THEN 'coin_transactions'
    WHEN prosrc LIKE '%INSERT INTO%transactions%' THEN 'transactions (可能)'
    WHEN prosrc LIKE '%INSERT INTO%coin_transactions%' THEN 'coin_transactions (可能)'
    ELSE '未找到 INSERT INTO 语句或表名不明确'
  END as target_table
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

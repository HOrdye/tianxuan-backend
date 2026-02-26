-- ============================================================================
-- 获取 deduct_coins 函数的完整源代码
-- 用途：查看完整函数实现，确认写入的表名
-- ============================================================================

-- 方法1: 获取完整函数源代码（prosrc）
SELECT 
  proname as function_name,
  prosrc as full_function_body
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 方法2: 如果函数体太长，可以分段查看
-- 查看函数体的前1000个字符
SELECT 
  proname,
  substring(prosrc, 1, 1000) as function_body_start,
  substring(prosrc, 1000, 1000) as function_body_middle_1,
  substring(prosrc, 2000, 1000) as function_body_middle_2,
  substring(prosrc, 3000) as function_body_end
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 方法3: 搜索函数体中包含的关键字
SELECT 
  proname,
  CASE WHEN prosrc LIKE '%transactions%' THEN '包含 transactions' ELSE '不包含' END as has_transactions,
  CASE WHEN prosrc LIKE '%coin_transactions%' THEN '包含 coin_transactions' ELSE '不包含' END as has_coin_transactions,
  CASE WHEN prosrc LIKE '%EXECUTE%' THEN '包含 EXECUTE（可能使用动态SQL）' ELSE '不包含' END as has_execute,
  CASE WHEN prosrc LIKE '%PERFORM%' THEN '包含 PERFORM（可能调用其他函数）' ELSE '不包含' END as has_perform,
  CASE WHEN prosrc LIKE '%SELECT%' AND prosrc LIKE '%INTO%' THEN '包含 SELECT INTO' ELSE '不包含' END as has_select_into,
  CASE WHEN prosrc LIKE '%RETURNING%' THEN '包含 RETURNING' ELSE '不包含' END as has_returning,
  CASE WHEN prosrc LIKE '%transaction_id%' THEN '包含 transaction_id' ELSE '不包含' END as has_transaction_id
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 方法4: 查找函数中所有包含 "INSERT" 的行（如果函数体可以分行查看）
-- 注意：PostgreSQL 的 prosrc 是单行文本，但我们可以搜索关键字周围的上下文
SELECT 
  '函数体包含的关键字上下文' as description,
  -- 尝试找到 INSERT 关键字的位置和上下文
  CASE 
    WHEN position('INSERT' in upper(prosrc)) > 0 THEN
      substring(prosrc, 
        greatest(1, position('INSERT' in upper(prosrc)) - 100),
        least(500, length(prosrc) - position('INSERT' in upper(prosrc)) + 100)
      )
    ELSE '未找到 INSERT 关键字'
  END as insert_context
FROM pg_proc
WHERE proname = 'deduct_coins'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

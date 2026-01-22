-- ============================================================================
-- 用户数字孪生系统迁移验证脚本
-- 创建时间: 2026-01-31
-- 说明: 验证迁移结果，检查字段、表、触发器、函数等是否创建成功
-- ============================================================================

-- ============================================================================
-- 1. 检查 implicit_traits 字段
-- ============================================================================

SELECT 
    'implicit_traits 字段检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name = 'implicit_traits'
            AND table_schema = 'public'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    COALESCE(
        (SELECT data_type FROM information_schema.columns 
         WHERE table_name = 'profiles' 
         AND column_name = 'implicit_traits'
         AND table_schema = 'public'),
        'N/A'
    ) as data_type
UNION ALL

-- ============================================================================
-- 2. 检查 completeness_rewards 表
-- ============================================================================

SELECT 
    'completeness_rewards 表检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'completeness_rewards'
            AND table_schema = 'public'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    COALESCE(
        (SELECT COUNT(*)::text FROM public.completeness_rewards),
        'N/A'
    ) as data_type
UNION ALL

-- ============================================================================
-- 3. 检查 GIN 索引
-- ============================================================================

SELECT 
    'preferences GIN 索引检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'profiles' 
            AND indexname = 'idx_profiles_preferences_gin'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    'GIN' as data_type
UNION ALL

SELECT 
    'implicit_traits GIN 索引检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'profiles' 
            AND indexname = 'idx_profiles_implicit_traits_gin'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    'GIN' as data_type
UNION ALL

-- ============================================================================
-- 4. 检查触发器
-- ============================================================================

SELECT 
    '生辰信息同步触发器检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trigger_sync_birthday_to_user_context'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    COALESCE(
        (SELECT tgname FROM pg_trigger 
         WHERE tgname = 'trigger_sync_birthday_to_user_context'),
        'N/A'
    ) as data_type
UNION ALL

-- ============================================================================
-- 5. 检查函数
-- ============================================================================

SELECT 
    'sync_birthday_to_user_context 函数检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'sync_birthday_to_user_context'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    COALESCE(
        (SELECT proname FROM pg_proc 
         WHERE proname = 'sync_birthday_to_user_context'),
        'N/A'
    ) as data_type
UNION ALL

SELECT 
    'calculate_completeness 函数检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'calculate_completeness'
        ) THEN '✅ 存在'
        ELSE '❌ 不存在'
    END as status,
    COALESCE(
        (SELECT proname || '(' || pg_get_function_arguments(oid) || ')' 
         FROM pg_proc 
         WHERE proname = 'calculate_completeness' 
         LIMIT 1),
        'N/A'
    ) as data_type
UNION ALL

-- ============================================================================
-- 6. 检查 birthday 字段（查找可能的字段名）
-- ============================================================================

SELECT 
    'birthday 相关字段检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            AND column_name IN ('birthday', 'birth_date', 'birth_date_time')
            AND table_schema = 'public'
        ) THEN '✅ 找到字段'
        ELSE '⚠️ 未找到字段'
    END as status,
    COALESCE(
        (SELECT string_agg(column_name || ' (' || data_type || ')', ', ')
         FROM information_schema.columns 
         WHERE table_name = 'profiles' 
         AND column_name IN ('birthday', 'birth_date', 'birth_date_time')
         AND table_schema = 'public'),
        '未找到 birthday/birth_date 字段'
    ) as data_type
UNION ALL

-- ============================================================================
-- 7. 检查完整度索引（如果存在）
-- ============================================================================

SELECT 
    '完整度索引检查' as check_item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'profiles' 
            AND indexname LIKE '%completeness%'
        ) THEN '✅ 存在'
        ELSE '⚠️ 不存在（如果 birthday 是 TEXT 类型，这是正常的）'
    END as status,
    COALESCE(
        (SELECT string_agg(indexname, ', ')
         FROM pg_indexes 
         WHERE tablename = 'profiles' 
         AND indexname LIKE '%completeness%'),
        'N/A'
    ) as data_type;

-- ============================================================================
-- 8. 检查 profiles 表的所有日期相关字段
-- ============================================================================

SELECT 
    'profiles 表日期相关字段' as info_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
AND (
    column_name LIKE '%birth%' 
    OR column_name LIKE '%date%'
    OR data_type IN ('date', 'timestamp', 'timestamp with time zone')
)
ORDER BY column_name;

-- ============================================================================
-- 9. 测试完整度计算函数（如果 birthday 字段存在）
-- ============================================================================

DO $$
DECLARE
    birthday_col_name TEXT;
    test_result INTEGER;
BEGIN
    -- 查找 birthday 相关字段
    SELECT column_name INTO birthday_col_name
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name IN ('birthday', 'birth_date')
    AND table_schema = 'public'
    LIMIT 1;
    
    IF birthday_col_name IS NOT NULL THEN
        -- 测试函数调用
        EXECUTE format(
            'SELECT calculate_completeness(preferences, %I::date) FROM public.profiles LIMIT 1',
            birthday_col_name
        ) INTO test_result;
        
        RAISE NOTICE '✅ 完整度计算函数测试成功，示例结果: %', test_result;
    ELSE
        RAISE NOTICE '⚠️ 未找到 birthday 字段，跳过函数测试';
    END IF;
END $$;

-- ============================================================================
-- 10. 统计信息
-- ============================================================================

SELECT 
    '统计信息' as info_type,
    '总用户数' as metric,
    COUNT(*)::text as value
FROM public.profiles
UNION ALL
SELECT 
    '统计信息',
    '有 implicit_traits 数据的用户数',
    COUNT(*)::text
FROM public.profiles
WHERE implicit_traits IS NOT NULL 
AND implicit_traits != '{}'::jsonb
UNION ALL
SELECT 
    '统计信息',
    '有 userContext 的用户数',
    COUNT(*)::text
FROM public.profiles
WHERE preferences->'userContext' IS NOT NULL
UNION ALL
SELECT 
    '统计信息',
    'completeness_rewards 记录数',
    COUNT(*)::text
FROM public.completeness_rewards;

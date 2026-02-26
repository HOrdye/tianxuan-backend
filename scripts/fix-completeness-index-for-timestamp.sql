-- ============================================================================
-- 修复完整度索引创建问题（TIMESTAMP 类型字段）
-- 创建时间: 2026-01-31
-- 说明: 为 TIMESTAMP 类型的 birthday 字段创建 IMMUTABLE 转换函数和索引
-- ============================================================================

-- ============================================================================
-- 1. 创建 IMMUTABLE 转换函数（用于索引）
-- ============================================================================

-- 版本1：TIMESTAMP 转 DATE
CREATE OR REPLACE FUNCTION birthday_to_date(p_birthday TIMESTAMP)
RETURNS DATE AS $$
BEGIN
  RETURN p_birthday::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 添加注释
COMMENT ON FUNCTION birthday_to_date(TIMESTAMP) IS '将 TIMESTAMP 转换为 DATE（IMMUTABLE，用于索引）';

-- 版本2：TIMESTAMP WITH TIME ZONE 转 DATE
CREATE OR REPLACE FUNCTION birthday_to_date(p_birthday TIMESTAMP WITH TIME ZONE)
RETURNS DATE AS $$
BEGIN
  RETURN p_birthday::date;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- 添加注释
COMMENT ON FUNCTION birthday_to_date(TIMESTAMP WITH TIME ZONE) IS '将 TIMESTAMPTZ 转换为 DATE（IMMUTABLE，用于索引）';

-- ============================================================================
-- 2. 创建 TIMESTAMP 版本的完整度计算函数（如果不存在）
-- ============================================================================

-- 版本1：TIMESTAMP 类型
CREATE OR REPLACE FUNCTION calculate_completeness(
  p_preferences JSONB,
  p_birthday TIMESTAMP
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  user_context JSONB;
BEGIN
  -- 获取 userContext
  user_context := COALESCE(p_preferences->'userContext', '{}'::jsonb);
  
  -- 基石层（40分）：生辰信息
  IF p_birthday IS NOT NULL THEN
    score := score + 40;
  END IF;
  
  -- 显性层（60分）
  -- MBTI（10分）
  IF user_context->>'mbti' IS NOT NULL AND user_context->>'mbti' != '' THEN
    score := score + 10;
  END IF;
  
  -- 职业（10分）
  IF user_context->>'profession' IS NOT NULL AND user_context->>'profession' != '' THEN
    score := score + 10;
  END IF;
  
  -- 现状（20分）
  IF user_context->>'currentStatus' IS NOT NULL AND user_context->>'currentStatus' != '' THEN
    score := score + 20;
  END IF;
  
  -- 愿景（20分）
  IF user_context->'wishes' IS NOT NULL AND jsonb_array_length(user_context->'wishes') > 0 THEN
    score := score + 20;
  END IF;
  
  -- 确保不超过100分
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 添加注释
COMMENT ON FUNCTION calculate_completeness(JSONB, TIMESTAMP) IS '计算用户资料完整度（0-100）- TIMESTAMP 版本';

-- 版本2：TIMESTAMP WITH TIME ZONE 类型（如果 birthday 是 TIMESTAMPTZ）
CREATE OR REPLACE FUNCTION calculate_completeness(
  p_preferences JSONB,
  p_birthday TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  user_context JSONB;
BEGIN
  -- 获取 userContext
  user_context := COALESCE(p_preferences->'userContext', '{}'::jsonb);
  
  -- 基石层（40分）：生辰信息
  IF p_birthday IS NOT NULL THEN
    score := score + 40;
  END IF;
  
  -- 显性层（60分）
  -- MBTI（10分）
  IF user_context->>'mbti' IS NOT NULL AND user_context->>'mbti' != '' THEN
    score := score + 10;
  END IF;
  
  -- 职业（10分）
  IF user_context->>'profession' IS NOT NULL AND user_context->>'profession' != '' THEN
    score := score + 10;
  END IF;
  
  -- 现状（20分）
  IF user_context->>'currentStatus' IS NOT NULL AND user_context->>'currentStatus' != '' THEN
    score := score + 20;
  END IF;
  
  -- 愿景（20分）
  IF user_context->'wishes' IS NOT NULL AND jsonb_array_length(user_context->'wishes') > 0 THEN
    score := score + 20;
  END IF;
  
  -- 确保不超过100分
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 添加注释
COMMENT ON FUNCTION calculate_completeness(JSONB, TIMESTAMP WITH TIME ZONE) IS '计算用户资料完整度（0-100）- TIMESTAMPTZ 版本';

-- ============================================================================
-- 3. 创建索引
-- ============================================================================

-- 方法1：直接使用 TIMESTAMP/TIMESTAMPTZ 版本的函数（推荐）
DROP INDEX IF EXISTS idx_profiles_completeness;

CREATE INDEX idx_profiles_completeness 
  ON public.profiles (calculate_completeness(preferences, birthday))
  WHERE birthday IS NOT NULL;

-- 如果方法1失败，可以尝试方法2：使用 IMMUTABLE 转换函数
-- DROP INDEX IF EXISTS idx_profiles_completeness;
-- CREATE INDEX idx_profiles_completeness 
--   ON public.profiles (calculate_completeness(preferences, birthday_to_date(birthday)))
--   WHERE birthday IS NOT NULL;

-- ============================================================================
-- 4. 验证索引创建
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_completeness'
  ) THEN
    RAISE NOTICE '✅ 完整度索引创建成功';
  ELSE
    RAISE NOTICE '⚠️ 完整度索引创建失败，请检查错误信息';
  END IF;
END $$;

-- ============================================================================
-- 5. 测试函数和索引
-- ============================================================================

-- 测试转换函数
SELECT 
    '转换函数测试' as test_type,
    birthday_to_date(birthday) as converted_date,
    birthday as original_timestamp
FROM public.profiles
WHERE birthday IS NOT NULL
LIMIT 1;

-- 测试完整度计算函数（TIMESTAMP 版本）
SELECT 
    '完整度计算测试' as test_type,
    id,
    username,
    birthday,
    calculate_completeness(preferences, birthday) as completeness
FROM public.profiles
WHERE birthday IS NOT NULL
LIMIT 5;

-- ============================================================================
-- 用户数字孪生系统数据库迁移脚本
-- 创建时间: 2026-01-31
-- 说明: 添加 implicit_traits 字段、completeness_rewards 表和生辰信息同步触发器
-- ============================================================================

-- ============================================================================
-- 1. 扩展 profiles 表：添加 implicit_traits 字段
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'implicit_traits'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN implicit_traits JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN public.profiles.implicit_traits IS '隐性特征（隐性层），由AI提取的用户画像标签';
    END IF;
END $$;

-- ============================================================================
-- 2. 创建资料完整度奖励记录表（防止重复发放）
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.completeness_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('field_reward', 'threshold_reward')),
  reward_field TEXT, -- 字段奖励时使用，如 'mbti', 'profession'
  reward_threshold INTEGER, -- 阈值奖励时使用，如 30, 50, 70, 100
  coins INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：防止重复发放
  CONSTRAINT unique_completeness_reward UNIQUE(user_id, reward_type, reward_field, reward_threshold)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_completeness_rewards_user_id 
  ON public.completeness_rewards(user_id);

CREATE INDEX IF NOT EXISTS idx_completeness_rewards_created_at 
  ON public.completeness_rewards(created_at DESC);

-- 添加注释
COMMENT ON TABLE public.completeness_rewards IS '资料完整度奖励记录表，用于防止重复发放奖励';
COMMENT ON COLUMN public.completeness_rewards.reward_type IS '奖励类型：field_reward（字段奖励）或 threshold_reward（阈值奖励）';
COMMENT ON COLUMN public.completeness_rewards.reward_field IS '触发奖励的字段名（字段奖励时使用）';
COMMENT ON COLUMN public.completeness_rewards.reward_threshold IS '达到的完整度阈值（阈值奖励时使用）';

-- ============================================================================
-- 3. 创建 GIN 索引（优化 JSONB 查询）
-- ============================================================================

-- 为 preferences JSONB 字段创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_profiles_preferences_gin 
  ON public.profiles USING GIN (preferences);

-- 为 implicit_traits JSONB 字段创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_profiles_implicit_traits_gin 
  ON public.profiles USING GIN (implicit_traits);

-- ============================================================================
-- 4. 创建生辰信息同步触发器函数
-- ============================================================================
-- 注意：如果数据库表使用 birthday 字段而非 birth_date，需要修改触发器
-- 检查方法：SELECT column_name FROM information_schema.columns 
--          WHERE table_name = 'profiles' AND column_name IN ('birthday', 'birth_date');

CREATE OR REPLACE FUNCTION sync_birthday_to_user_context()
RETURNS TRIGGER AS $$
DECLARE
    current_user_context JSONB;
    birth_date_str TEXT;
    birth_date_value DATE;
BEGIN
  -- 使用 birthday 字段（根据实际数据库字段名）
  -- 如果数据库使用 birth_date，将下面的 NEW.birthday 改为 NEW.birth_date
  birth_date_value := NEW.birthday::date;
  
  -- 如果生辰信息发生变化
  IF birth_date_value IS DISTINCT FROM OLD.birthday::date THEN
    -- 获取现有的 userContext
    current_user_context := COALESCE(NEW.preferences->'userContext', '{}'::jsonb);
    
    -- 统一时区处理：转换为 ISO8601 字符串（YYYY-MM-DD）
    birth_date_str := to_char(birth_date_value, 'YYYY-MM-DD');
    
    -- 更新 userContext，添加 birthDate（如果不存在或需要更新）
    IF current_user_context->>'birthDate' IS NULL OR 
       current_user_context->>'birthDate' != birth_date_str THEN
      current_user_context := current_user_context || jsonb_build_object(
        'birthDate', birth_date_str
      );
      
      -- 更新 preferences
      NEW.preferences := COALESCE(NEW.preferences, '{}'::jsonb) || 
        jsonb_build_object('userContext', current_user_context);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_sync_birthday_to_user_context ON public.profiles;

-- 创建触发器（使用 birthday 字段）
-- 如果数据库使用 birth_date 字段，将下面的 birthday 改为 birth_date
CREATE TRIGGER trigger_sync_birthday_to_user_context
BEFORE UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.birthday IS DISTINCT FROM OLD.birthday)
EXECUTE FUNCTION sync_birthday_to_user_context();

-- 添加注释
COMMENT ON FUNCTION sync_birthday_to_user_context() IS '自动同步生辰信息到 userContext 的触发器函数';

-- ============================================================================
-- 5. 创建资料完整度计算函数（数据库层）
-- ============================================================================
-- 注意：函数参数类型根据 birthday 字段的实际类型调整
-- 如果 birthday 是 DATE 类型，使用 DATE 参数
-- 如果 birthday 是 TIMESTAMP 类型，使用 TIMESTAMP 参数并在函数内部转换为 DATE
-- 如果 birthday 是 TEXT 类型，使用 TEXT 参数并在函数内部转换

-- 创建函数（兼容 DATE、TIMESTAMP 和 TEXT 类型）
-- 版本1：接受 DATE 类型参数
CREATE OR REPLACE FUNCTION calculate_completeness(
  p_preferences JSONB,
  p_birthday DATE
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
COMMENT ON FUNCTION calculate_completeness(JSONB, DATE) IS '计算用户资料完整度（0-100）- DATE 版本';

-- 版本2：接受 TIMESTAMP 类型参数（如果 birthday 是 TIMESTAMP 类型）
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

-- 版本3：接受 TIMESTAMP WITH TIME ZONE 类型参数（如果 birthday 是 TIMESTAMPTZ 类型）
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

-- 创建 IMMUTABLE 转换函数（用于索引）
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

-- 创建索引函数（用于查询优化）
-- 注意：索引创建需要 birthday 字段是 DATE 类型
-- 如果 birthday 字段是 TEXT 类型，索引创建会失败，但不会影响其他操作
-- 索引不是必需的，只是用于查询优化，可以跳过

-- 检查 birthday 字段类型并创建相应的索引
DO $$
DECLARE
  birthday_type TEXT;
  birthday_udt_name TEXT;
BEGIN
  -- 检查 birthday 字段的数据类型
  SELECT data_type, udt_name INTO birthday_type, birthday_udt_name
  FROM information_schema.columns 
  WHERE table_name = 'profiles' 
    AND column_name = 'birthday'
    AND table_schema = 'public';
  
  IF birthday_type IS NULL THEN
    RAISE NOTICE '⚠️ 未找到 birthday 字段，跳过索引创建';
    RAISE NOTICE '   提示：请确认字段名是否正确，或字段是否存在于 profiles 表中';
  ELSIF birthday_type = 'date' OR birthday_udt_name = 'date' THEN
    -- birthday 是 DATE 类型，直接创建索引
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_completeness 
               ON public.profiles (calculate_completeness(preferences, birthday))
               WHERE birthday IS NOT NULL';
      RAISE NOTICE '✅ 完整度索引已创建（birthday 字段是 DATE 类型）';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ 索引创建失败: %', SQLERRM;
      RAISE NOTICE '   提示：索引不是必需的，不影响功能';
    END;
  ELSIF birthday_type IN ('timestamp', 'timestamp without time zone', 'timestamp with time zone') 
     OR birthday_udt_name IN ('timestamp', 'timestamptz') THEN
    -- birthday 是 TIMESTAMP 类型，使用 IMMUTABLE 转换函数创建索引
    BEGIN
      -- 方法1：直接使用 TIMESTAMP/TIMESTAMPTZ 版本的函数（推荐）
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_completeness 
               ON public.profiles (calculate_completeness(preferences, birthday))
               WHERE birthday IS NOT NULL';
      RAISE NOTICE '✅ 完整度索引已创建（birthday 字段是 % 类型，直接使用对应版本的函数）', birthday_type;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- 方法2：使用 IMMUTABLE 转换函数（如果方法1失败）
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_completeness 
                 ON public.profiles (calculate_completeness(preferences, birthday_to_date(birthday)))
                 WHERE birthday IS NOT NULL';
        RAISE NOTICE '✅ 完整度索引已创建（birthday 字段是 % 类型，使用 IMMUTABLE 转换函数）', birthday_type;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ 索引创建失败: %', SQLERRM;
        RAISE NOTICE '   提示：索引不是必需的，不影响功能';
      END;
    END;
  ELSIF birthday_type IN ('text', 'character varying') OR birthday_udt_name IN ('varchar', 'text') THEN
    -- birthday 是 TEXT 类型，跳过索引创建（类型转换不是 IMMUTABLE）
    RAISE NOTICE '⚠️ birthday 字段是 TEXT 类型，跳过完整度索引创建（索引不是必需的）';
    RAISE NOTICE '   提示：TEXT 转 DATE 不是 IMMUTABLE，无法用于索引';
  ELSE
    RAISE NOTICE '⚠️ birthday 字段类型未知: % (udt_name: %)，跳过索引创建', birthday_type, birthday_udt_name;
    RAISE NOTICE '   提示：如果字段类型是 DATE 或 TIMESTAMP，可以手动创建索引';
  END IF;
END $$;

-- ============================================================================
-- 6. 数据迁移：初始化现有用户的 userContext
-- ============================================================================

-- 为现有用户初始化 userContext（如果不存在）
UPDATE public.profiles
SET preferences = COALESCE(preferences, '{}'::jsonb) || 
    jsonb_build_object('userContext', '{}'::jsonb)
WHERE preferences->'userContext' IS NULL;

-- 为有生辰信息的用户同步到 userContext
-- 使用 birthday 字段（根据实际数据库字段名）
UPDATE public.profiles
SET preferences = preferences || jsonb_build_object(
    'userContext',
    COALESCE(preferences->'userContext', '{}'::jsonb) || 
    jsonb_build_object('birthDate', to_char(birthday::date, 'YYYY-MM-DD'))
)
WHERE birthday IS NOT NULL
  AND (preferences->'userContext'->>'birthDate' IS NULL 
       OR preferences->'userContext'->>'birthDate' = '');

-- ============================================================================
-- 7. 验证迁移结果
-- ============================================================================

-- 验证 implicit_traits 字段是否存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'implicit_traits'
  ) THEN
    RAISE EXCEPTION 'implicit_traits 字段创建失败';
  END IF;
END $$;

-- 验证 completeness_rewards 表是否存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'completeness_rewards'
  ) THEN
    RAISE EXCEPTION 'completeness_rewards 表创建失败';
  END IF;
END $$;

-- 验证触发器是否存在
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_birthday_to_user_context'
  ) THEN
    RAISE EXCEPTION '生辰信息同步触发器创建失败';
  END IF;
END $$;

-- 输出成功信息
DO $$
BEGIN
  RAISE NOTICE '✅ 用户数字孪生系统数据库迁移完成';
  RAISE NOTICE '   - implicit_traits 字段已添加';
  RAISE NOTICE '   - completeness_rewards 表已创建';
  RAISE NOTICE '   - GIN 索引已创建';
  RAISE NOTICE '   - 生辰信息同步触发器已创建';
  RAISE NOTICE '   - 资料完整度计算函数已创建';
END $$;

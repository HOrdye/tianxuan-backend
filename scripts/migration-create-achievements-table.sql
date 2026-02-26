-- ============================================================================
-- 成就系统数据库表创建脚本
-- 创建时间: 2026-01-26
-- 说明: 创建 user_achievements 表用于存储用户成就
-- ============================================================================

-- 创建 user_achievements 表
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：同一用户不能重复获得同一类型的成就
  UNIQUE(user_id, achievement_type)
);

-- 如果表已存在但缺少 created_at 列，则添加该列
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_achievements'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_achievements' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_achievements 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
  ON public.user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_type 
  ON public.user_achievements(achievement_type);

-- 只有在 created_at 列存在时才创建索引
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_achievements' 
    AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_achievements_created_at 
    ON public.user_achievements(created_at DESC);
  END IF;
END $$;

-- 添加外键约束（如果 profiles 表存在且约束不存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_achievements
      ADD CONSTRAINT user_achievements_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 添加注释
COMMENT ON TABLE public.user_achievements IS '用户成就表，存储用户获得的成就记录';
COMMENT ON COLUMN public.user_achievements.id IS '成就记录ID';
COMMENT ON COLUMN public.user_achievements.user_id IS '用户ID';
COMMENT ON COLUMN public.user_achievements.achievement_type IS '成就类型（如：shared_unlock_profile_slot）';
COMMENT ON COLUMN public.user_achievements.metadata IS '成就元数据（JSONB格式，存储额外信息）';
COMMENT ON COLUMN public.user_achievements.created_at IS '获得成就的时间';

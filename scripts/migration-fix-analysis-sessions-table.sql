-- ============================================================================
-- 修复 analysis_sessions 表结构脚本
-- 创建时间: 2026年1月11日
-- 说明: 修复 analysis_sessions 表，添加缺失的字段
-- ============================================================================

-- 检查并添加 session_data 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'analysis_sessions' 
      AND column_name = 'session_data'
  ) THEN
    ALTER TABLE public.analysis_sessions 
    ADD COLUMN session_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    
    -- 移除默认值（因为字段应该是必填的）
    ALTER TABLE public.analysis_sessions 
    ALTER COLUMN session_data DROP DEFAULT;
  END IF;
END $$;

-- 检查并添加其他可能缺失的字段
DO $$
BEGIN
  -- 检查并添加 user_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'analysis_sessions' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.analysis_sessions 
    ADD COLUMN user_id UUID NOT NULL;
  END IF;

  -- 检查并添加 profile_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'analysis_sessions' 
      AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.analysis_sessions 
    ADD COLUMN profile_id UUID NOT NULL;
  END IF;

  -- 检查并添加 created_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'analysis_sessions' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.analysis_sessions 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 检查并添加 updated_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'analysis_sessions' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.analysis_sessions 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_profile_id ON public.analysis_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON public.analysis_sessions(created_at DESC);

-- 添加注释
COMMENT ON TABLE public.analysis_sessions IS '分析会话表，存储命盘分析会话数据';
COMMENT ON COLUMN public.analysis_sessions.id IS '会话ID';
COMMENT ON COLUMN public.analysis_sessions.user_id IS '用户ID';
COMMENT ON COLUMN public.analysis_sessions.profile_id IS '命盘ID（对应存档或档案）';
COMMENT ON COLUMN public.analysis_sessions.session_data IS '分析会话数据（JSONB格式）';
COMMENT ON COLUMN public.analysis_sessions.created_at IS '创建时间';
COMMENT ON COLUMN public.analysis_sessions.updated_at IS '更新时间';

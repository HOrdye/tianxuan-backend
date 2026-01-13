-- ============================================================================
-- 分析会话数据库表创建脚本
-- 创建时间: 2026年1月11日
-- 说明: 创建 analysis_sessions 表用于存储命盘分析会话数据
-- ============================================================================

-- 创建 analysis_sessions 表
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_profile_id ON public.analysis_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_created_at ON public.analysis_sessions(created_at DESC);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：根据项目实际情况，profile_id 可能引用 profiles.id 或 ziwei_chart_archives.id
-- 如果 profile_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.analysis_sessions
--   ADD CONSTRAINT analysis_sessions_profile_id_fkey
--   FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 如果 profile_id 引用的是 ziwei_chart_archives.id，请取消下面的注释
-- ALTER TABLE public.analysis_sessions
--   ADD CONSTRAINT analysis_sessions_profile_id_fkey
--   FOREIGN KEY (profile_id) REFERENCES public.ziwei_chart_archives(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.analysis_sessions IS '分析会话表，存储命盘分析会话数据';
COMMENT ON COLUMN public.analysis_sessions.id IS '会话ID';
COMMENT ON COLUMN public.analysis_sessions.user_id IS '用户ID';
COMMENT ON COLUMN public.analysis_sessions.profile_id IS '命盘ID（对应存档或档案）';
COMMENT ON COLUMN public.analysis_sessions.session_data IS '分析会话数据（JSONB格式）';
COMMENT ON COLUMN public.analysis_sessions.created_at IS '创建时间';
COMMENT ON COLUMN public.analysis_sessions.updated_at IS '更新时间';

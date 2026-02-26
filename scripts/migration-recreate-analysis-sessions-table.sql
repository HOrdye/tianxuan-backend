-- ============================================================================
-- 重建 analysis_sessions 表脚本（⚠️ 会删除所有数据）
-- 创建时间: 2026年1月11日
-- 说明: 如果表结构有问题，可以使用此脚本删除并重建表
-- ⚠️ 警告：此脚本会删除 analysis_sessions 表中的所有数据！
-- ============================================================================

-- ⚠️ 警告：此操作会删除所有数据，请确保已备份！
-- 如果需要保留数据，请先导出数据：
-- pg_dump -t analysis_sessions > analysis_sessions_backup.sql

-- 删除表（如果存在）
DROP TABLE IF EXISTS public.analysis_sessions CASCADE;

-- 重新创建表
CREATE TABLE public.analysis_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  session_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX idx_analysis_sessions_profile_id ON public.analysis_sessions(profile_id);
CREATE INDEX idx_analysis_sessions_created_at ON public.analysis_sessions(created_at DESC);

-- 添加注释
COMMENT ON TABLE public.analysis_sessions IS '分析会话表，存储命盘分析会话数据';
COMMENT ON COLUMN public.analysis_sessions.id IS '会话ID';
COMMENT ON COLUMN public.analysis_sessions.user_id IS '用户ID';
COMMENT ON COLUMN public.analysis_sessions.profile_id IS '命盘ID（对应存档或档案）';
COMMENT ON COLUMN public.analysis_sessions.session_data IS '分析会话数据（JSONB格式）';
COMMENT ON COLUMN public.analysis_sessions.created_at IS '创建时间';
COMMENT ON COLUMN public.analysis_sessions.updated_at IS '更新时间';

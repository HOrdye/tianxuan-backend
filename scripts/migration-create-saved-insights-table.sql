-- ============================================================================
-- 收藏洞察数据库表创建脚本
-- 创建时间: 2026-01-26
-- 说明: 创建 saved_insights 表用于存储用户收藏的洞察
-- ============================================================================

-- 创建 saved_insights 表
CREATE TABLE IF NOT EXISTS public.saved_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  chart_id UUID,
  session_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果表已存在但缺少 created_at 或 updated_at 列，则添加这些列
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'saved_insights'
  ) THEN
    -- 添加 created_at 列（如果不存在）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'saved_insights' 
      AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.saved_insights 
      ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- 添加 updated_at 列（如果不存在）
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'saved_insights' 
      AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.saved_insights 
      ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_saved_insights_user_id 
  ON public.saved_insights(user_id);

CREATE INDEX IF NOT EXISTS idx_saved_insights_type 
  ON public.saved_insights(insight_type);

CREATE INDEX IF NOT EXISTS idx_saved_insights_chart_id 
  ON public.saved_insights(chart_id);

CREATE INDEX IF NOT EXISTS idx_saved_insights_session_id 
  ON public.saved_insights(session_id);

-- 只有在 created_at 列存在时才创建索引
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'saved_insights' 
    AND column_name = 'created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_saved_insights_created_at 
    ON public.saved_insights(created_at DESC);
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
    WHERE conname = 'saved_insights_user_id_fkey'
  ) THEN
    ALTER TABLE public.saved_insights
      ADD CONSTRAINT saved_insights_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 添加注释
COMMENT ON TABLE public.saved_insights IS '收藏洞察表，存储用户收藏的洞察内容';
COMMENT ON COLUMN public.saved_insights.id IS '收藏记录ID';
COMMENT ON COLUMN public.saved_insights.user_id IS '用户ID';
COMMENT ON COLUMN public.saved_insights.insight_type IS '洞察类型';
COMMENT ON COLUMN public.saved_insights.content IS '洞察内容';
COMMENT ON COLUMN public.saved_insights.chart_id IS '关联的命盘ID（可选）';
COMMENT ON COLUMN public.saved_insights.session_id IS '关联的会话ID（可选）';
COMMENT ON COLUMN public.saved_insights.metadata IS '元数据（JSONB格式，存储额外信息）';
COMMENT ON COLUMN public.saved_insights.created_at IS '收藏时间';
COMMENT ON COLUMN public.saved_insights.updated_at IS '更新时间';

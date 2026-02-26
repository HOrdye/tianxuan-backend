-- ============================================================================
-- 占卜历史记录数据库表创建脚本
-- 创建时间: 2025年1月30日
-- 说明: 创建 divination_history 表用于存储用户占卜历史记录
-- ============================================================================

-- ============================================================================
-- 创建占卜历史记录表 (divination_history)
-- ============================================================================
-- 用途：记录用户的占卜历史记录（易经、困境、塔罗、筊杯、三维决策等）

-- 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS public.divination_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('yijing', 'dilemma', 'tarot', 'jiaobei', 'triple_analysis')),
  question TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 检查并添加缺失的列（如果表已存在但缺少某些列）
DO $$
BEGIN
  -- 检查并添加 user_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN user_id UUID NOT NULL;
  END IF;

  -- 检查并添加 type 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'type'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN type TEXT NOT NULL CHECK (type IN ('yijing', 'dilemma', 'tarot', 'jiaobei', 'triple_analysis'));
  END IF;

  -- 检查并添加 question 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'question'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN question TEXT;
  END IF;

  -- 检查并添加 result 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'result'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN result JSONB NOT NULL;
  END IF;

  -- 检查并添加 created_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 检查并添加 updated_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'divination_history' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.divination_history 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_divination_history_user_id ON public.divination_history(user_id);
CREATE INDEX IF NOT EXISTS idx_divination_history_type ON public.divination_history(type);
CREATE INDEX IF NOT EXISTS idx_divination_history_created_at ON public.divination_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_divination_history_user_type ON public.divination_history(user_id, type);
CREATE INDEX IF NOT EXISTS idx_divination_history_user_created ON public.divination_history(user_id, created_at DESC);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.divination_history
--   ADD CONSTRAINT divination_history_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.divination_history IS '占卜历史记录表，记录用户的占卜历史（易经、困境、塔罗、筊杯、三维决策等）';
COMMENT ON COLUMN public.divination_history.id IS '记录ID';
COMMENT ON COLUMN public.divination_history.user_id IS '用户ID';
COMMENT ON COLUMN public.divination_history.type IS '占卜类型：yijing（易经）、dilemma（困境）、tarot（塔罗）、jiaobei（筊杯）、triple_analysis（三维决策）';
COMMENT ON COLUMN public.divination_history.question IS '占卜问题（可选）';
COMMENT ON COLUMN public.divination_history.result IS '占卜结果（JSONB格式）';
COMMENT ON COLUMN public.divination_history.created_at IS '创建时间';
COMMENT ON COLUMN public.divination_history.updated_at IS '更新时间';

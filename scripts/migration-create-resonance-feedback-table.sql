-- ============================================================================
-- 共振反馈数据库表创建脚本
-- 创建时间: 2026年1月30日
-- 说明: 创建 resonance_feedback 表用于存储用户反馈信息
-- ============================================================================

-- 创建 resonance_feedback 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.resonance_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feedback_type TEXT NOT NULL,                    -- 反馈类型（如：'bug', 'suggestion', 'praise'等）
  content TEXT NOT NULL,                          -- 反馈内容
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 评分（1-5分，可选）
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')), -- 反馈状态
  metadata JSONB,                                 -- 元数据（可选，存储额外的反馈信息）
  reviewed_at TIMESTAMP WITH TIME ZONE,           -- 审核时间
  reviewed_by UUID,                               -- 审核人ID（可选）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 检查并添加缺失的列（如果表已存在但缺少某些列）
DO $$
BEGIN
  -- 检查并添加 id 字段（如果不存在）
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN id UUID DEFAULT gen_random_uuid();
    
    -- 添加主键约束（如果不存在）
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
        AND table_name = 'resonance_feedback' 
        AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE public.resonance_feedback 
      ADD PRIMARY KEY (id);
    END IF;
  END IF;

  -- 检查并添加 user_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN user_id UUID NOT NULL;
  END IF;

  -- 检查并添加 feedback_type 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'feedback_type'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN feedback_type TEXT NOT NULL;
  END IF;

  -- 检查并添加 content 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'content'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN content TEXT NOT NULL;
  END IF;

  -- 检查并添加 rating 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);
  END IF;

  -- 检查并添加 status 字段（关键修复）
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
  END IF;
  
  -- 添加CHECK约束（如果不存在）
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'resonance_feedback_status_check'
  ) AND EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD CONSTRAINT resonance_feedback_status_check 
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected'));
  END IF;

  -- 检查并添加 metadata 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN metadata JSONB;
  END IF;

  -- 检查并添加 reviewed_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 检查并添加 reviewed_by 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'reviewed_by'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN reviewed_by UUID;
  END IF;

  -- 检查并添加 created_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 检查并添加 updated_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.resonance_feedback 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引（只有在列存在时才创建）
DO $$
BEGIN
  -- 创建 user_id 索引
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'resonance_feedback' 
      AND indexname = 'resonance_feedback_user_id_idx'
  ) THEN
    CREATE INDEX resonance_feedback_user_id_idx ON public.resonance_feedback(user_id);
  END IF;

  -- 创建 status 索引（关键修复）
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'status'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'resonance_feedback' 
      AND indexname = 'resonance_feedback_status_idx'
  ) THEN
    CREATE INDEX resonance_feedback_status_idx ON public.resonance_feedback(status);
  END IF;

  -- 创建 feedback_type 索引
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'feedback_type'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'resonance_feedback' 
      AND indexname = 'resonance_feedback_type_idx'
  ) THEN
    CREATE INDEX resonance_feedback_type_idx ON public.resonance_feedback(feedback_type);
  END IF;

  -- 创建 created_at 索引
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'resonance_feedback' 
      AND column_name = 'created_at'
  ) AND NOT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'resonance_feedback' 
      AND indexname = 'resonance_feedback_created_at_idx'
  ) THEN
    CREATE INDEX resonance_feedback_created_at_idx ON public.resonance_feedback(created_at DESC);
  END IF;
END $$;

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.resonance_feedback
--   ADD CONSTRAINT resonance_feedback_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.resonance_feedback IS '共振反馈表，存储用户的反馈信息';
COMMENT ON COLUMN public.resonance_feedback.id IS '反馈记录ID';
COMMENT ON COLUMN public.resonance_feedback.user_id IS '用户ID';
COMMENT ON COLUMN public.resonance_feedback.feedback_type IS '反馈类型（如：bug, suggestion, praise等）';
COMMENT ON COLUMN public.resonance_feedback.content IS '反馈内容';
COMMENT ON COLUMN public.resonance_feedback.rating IS '评分（1-5分，可选）';
COMMENT ON COLUMN public.resonance_feedback.status IS '反馈状态：pending（待审核）、reviewed（已审核）、resolved（已解决）、rejected（已拒绝）';
COMMENT ON COLUMN public.resonance_feedback.metadata IS '元数据（JSONB格式，存储额外的反馈信息）';
COMMENT ON COLUMN public.resonance_feedback.reviewed_at IS '审核时间';
COMMENT ON COLUMN public.resonance_feedback.reviewed_by IS '审核人ID（可选）';

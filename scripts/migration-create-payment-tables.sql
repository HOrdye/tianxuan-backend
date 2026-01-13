-- ============================================================================
-- 支付相关数据库表创建脚本
-- 创建时间: 2025年1月30日
-- 说明: 创建配额日志表和退款日志表
-- ============================================================================

-- ============================================================================
-- 1. 创建配额日志表 (quota_logs)
-- ============================================================================
-- 用途：记录用户配额（如功能使用次数、天机币等）的变化日志
-- 支持的功能：易筋经、紫微斗数、八字、奇门遁甲、六爻等

-- 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS public.quota_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,                    -- 功能名称（如 'yijing', 'ziwei', 'bazi' 等）
  action_type TEXT NOT NULL,               -- 操作类型：'consume'（消耗）、'grant'（授予）、'refund'（退款）
  amount INTEGER NOT NULL,                  -- 配额变化数量（正数表示增加，负数表示减少）
  balance_before INTEGER NOT NULL,          -- 操作前余额
  balance_after INTEGER NOT NULL,           -- 操作后余额
  description TEXT,                         -- 操作描述（可选）
  metadata JSONB,                           -- 元数据（可选，存储额外的操作信息）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 检查并添加缺失的列（如果表已存在但缺少某些列）
DO $$
BEGIN
  -- 检查并添加 feature 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'feature'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN feature TEXT NOT NULL DEFAULT '';
  END IF;

  -- 检查并添加 action_type 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'action_type'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN action_type TEXT NOT NULL DEFAULT '';
  END IF;

  -- 检查并添加 amount 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'amount'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN amount INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- 检查并添加 balance_before 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'balance_before'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN balance_before INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- 检查并添加 balance_after 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'balance_after'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN balance_after INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- 检查并添加 description 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN description TEXT;
  END IF;

  -- 检查并添加 metadata 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN metadata JSONB;
  END IF;

  -- 检查并添加 created_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quota_logs' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.quota_logs 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_quota_logs_user_id ON public.quota_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_logs_feature ON public.quota_logs(feature);
CREATE INDEX IF NOT EXISTS idx_quota_logs_action_type ON public.quota_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_quota_logs_created_at ON public.quota_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quota_logs_user_feature ON public.quota_logs(user_id, feature);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.quota_logs
--   ADD CONSTRAINT quota_logs_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.quota_logs IS '配额日志表，记录用户配额（功能使用次数、天机币等）的变化日志';
COMMENT ON COLUMN public.quota_logs.id IS '日志ID';
COMMENT ON COLUMN public.quota_logs.user_id IS '用户ID';
COMMENT ON COLUMN public.quota_logs.feature IS '功能名称（如 yijing, ziwei, bazi, qimen, liuyao 等）';
COMMENT ON COLUMN public.quota_logs.action_type IS '操作类型：consume（消耗）、grant（授予）、refund（退款）';
COMMENT ON COLUMN public.quota_logs.amount IS '配额变化数量（正数表示增加，负数表示减少）';
COMMENT ON COLUMN public.quota_logs.balance_before IS '操作前余额';
COMMENT ON COLUMN public.quota_logs.balance_after IS '操作后余额';
COMMENT ON COLUMN public.quota_logs.description IS '操作描述（可选）';
COMMENT ON COLUMN public.quota_logs.metadata IS '元数据（可选，存储额外的操作信息）';
COMMENT ON COLUMN public.quota_logs.created_at IS '创建时间';

-- ============================================================================
-- 2. 创建退款日志表 (refund_logs)
-- ============================================================================
-- 用途：记录订单退款日志

-- 创建表（如果不存在）
CREATE TABLE IF NOT EXISTS public.refund_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,                            -- 关联的订单ID（订单退款场景，引用 transactions.id）
  original_request_id UUID,                 -- 原始请求ID（AI服务退款场景，引用扣费交易ID）
  refund_amount DECIMAL(10, 2),            -- 退款金额（人民币，单位：元，订单退款场景）
  refund_coins INTEGER NOT NULL DEFAULT 0,  -- 退款天机币数量
  refund_reason TEXT,                       -- 退款原因（可选）
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  processed_at TIMESTAMP WITH TIME ZONE,   -- 处理时间（退款完成时的时间）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 约束：order_id 和 original_request_id 至少有一个不为空
  CONSTRAINT refund_logs_refund_source_check CHECK (
    (order_id IS NOT NULL) OR (original_request_id IS NOT NULL)
  )
);

-- 检查并添加缺失的列（如果表已存在但缺少某些列）
DO $$
BEGIN
  -- 检查并添加 user_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN user_id UUID NOT NULL;
  END IF;

  -- 检查并添加 order_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN order_id UUID;
  END IF;

  -- 检查并添加 original_request_id 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'original_request_id'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN original_request_id UUID;
  END IF;

  -- 检查并添加 refund_amount 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN refund_amount DECIMAL(10, 2);
  END IF;

  -- 检查并添加 refund_coins 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'refund_coins'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN refund_coins INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- 检查并添加 refund_reason 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'refund_reason'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN refund_reason TEXT;
  END IF;

  -- 检查并添加 status 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;

  -- 检查并添加 processed_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'processed_at'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- 检查并添加 created_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- 检查并添加 updated_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'refund_logs' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.refund_logs 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_refund_logs_user_id ON public.refund_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_order_id ON public.refund_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_original_request_id ON public.refund_logs(original_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_logs_status ON public.refund_logs(status);
CREATE INDEX IF NOT EXISTS idx_refund_logs_created_at ON public.refund_logs(created_at DESC);

-- 添加外键约束（如果 transactions 表存在）
-- 注意：如果 order_id 引用的是 transactions.id，请取消下面的注释
-- ALTER TABLE public.refund_logs
--   ADD CONSTRAINT refund_logs_order_id_fkey
--   FOREIGN KEY (order_id) REFERENCES public.transactions(id) ON DELETE RESTRICT;

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.refund_logs
--   ADD CONSTRAINT refund_logs_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.refund_logs IS '退款日志表，记录订单退款信息';
COMMENT ON COLUMN public.refund_logs.id IS '退款日志ID';
COMMENT ON COLUMN public.refund_logs.user_id IS '用户ID';
COMMENT ON COLUMN public.refund_logs.order_id IS '关联的订单ID（订单退款场景，引用 transactions.id）';
COMMENT ON COLUMN public.refund_logs.original_request_id IS '原始请求ID（AI服务退款场景，引用扣费交易ID）';
COMMENT ON COLUMN public.refund_logs.refund_amount IS '退款金额（人民币，单位：元）';
COMMENT ON COLUMN public.refund_logs.refund_coins IS '退款天机币数量';
COMMENT ON COLUMN public.refund_logs.refund_reason IS '退款原因（可选）';
COMMENT ON COLUMN public.refund_logs.status IS '退款状态：pending（待处理）、processing（处理中）、completed（已完成）、failed（失败）、cancelled（已取消）';
COMMENT ON COLUMN public.refund_logs.processed_at IS '处理时间（退款完成时的时间）';
COMMENT ON COLUMN public.refund_logs.created_at IS '创建时间';
COMMENT ON COLUMN public.refund_logs.updated_at IS '更新时间';

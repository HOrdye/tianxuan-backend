-- ============================================================================
-- 任务系统数据库表创建脚本
-- 创建时间: 2026年1月11日
-- 说明: 创建 user_tasks 表用于存储用户任务状态
-- ============================================================================

-- 创建 user_tasks 表
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  task_status TEXT NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending', 'completed', 'claimed')),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  coins_rewarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_type)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS user_tasks_user_id_idx ON public.user_tasks(user_id);
CREATE INDEX IF NOT EXISTS user_tasks_status_idx ON public.user_tasks(task_status);
CREATE INDEX IF NOT EXISTS user_tasks_task_type_idx ON public.user_tasks(task_type);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.user_tasks
--   ADD CONSTRAINT user_tasks_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.user_tasks IS '用户任务表，存储用户的任务完成状态和奖励信息';
COMMENT ON COLUMN public.user_tasks.id IS '任务记录ID';
COMMENT ON COLUMN public.user_tasks.user_id IS '用户ID';
COMMENT ON COLUMN public.user_tasks.task_type IS '任务类型（如：complete_first_chart）';
COMMENT ON COLUMN public.user_tasks.task_status IS '任务状态：pending（待完成）、completed（已完成）、claimed（已领取）';
COMMENT ON COLUMN public.user_tasks.completed_at IS '任务完成时间';
COMMENT ON COLUMN public.user_tasks.claimed_at IS '奖励领取时间';
COMMENT ON COLUMN public.user_tasks.coins_rewarded IS '已领取的奖励天机币数量';
COMMENT ON COLUMN public.user_tasks.created_at IS '创建时间';
COMMENT ON COLUMN public.user_tasks.updated_at IS '更新时间';

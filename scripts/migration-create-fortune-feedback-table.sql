
-- ============================================================================
-- 运势反馈数据库表创建脚本
-- 创建时间: 2026年2月19日
-- 说明: 创建 fortune_feedback 表用于存储用户对运势的反馈
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fortune_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  profile_id VARCHAR(64) NOT NULL DEFAULT 'self',
  fortune_date DATE NOT NULL,
  dimension VARCHAR(16) NOT NULL CHECK (dimension IN ('daily', 'monthly', 'yearly')),
  accuracy VARCHAR(8) NOT NULL CHECK (accuracy IN ('high', 'medium', 'low')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 同一个用户、同一个档案、同一个维度、同一天只能有一条反馈
  UNIQUE(user_id, profile_id, fortune_date, dimension)
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS fortune_feedback_user_id_idx ON public.fortune_feedback(user_id);
CREATE INDEX IF NOT EXISTS fortune_feedback_fortune_date_idx ON public.fortune_feedback(fortune_date);
CREATE INDEX IF NOT EXISTS fortune_feedback_dimension_idx ON public.fortune_feedback(dimension);
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.fortune_feedback
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- ============================================================================
-- 时空导航决策看板 v2.0 — 数据库迁移脚本
-- 创建时间: 2026年2月24日
-- 说明: 创建 daily_checkins, yearly_comparisons, user_preferences 三张表
-- ============================================================================

-- ============================================
-- 0. 确保 updated_at 自动更新触发器函数存在
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. 今日复盘打卡表（聚合反馈 + 习惯培养）
-- 替代分散在 yearly/monthly/daily 三处的"准/不准"按钮
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  profile_id    TEXT NOT NULL,
  checkin_date  DATE NOT NULL,

  -- 时区基准，防止跨时区用户打卡日期错乱
  checkin_tz    VARCHAR(50) NOT NULL DEFAULT 'Asia/Shanghai',

  -- 复盘评分（1-5星，替代二元"准/不准"）
  accuracy_score SMALLINT CHECK (accuracy_score BETWEEN 1 AND 5),

  -- 情绪标签（多选，JSONB 数组）
  mood_tags     JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 白名单约束：防止前端乱传数据
  CONSTRAINT chk_mood_tags CHECK (
    jsonb_array_length(mood_tags) = 0
    OR (
      mood_tags <@ '["satisfied","anxious","surprised","calm","excited","frustrated"]'::jsonb
    )
  ),

  -- 用户自由备注（可选，≤500字）
  note          TEXT CHECK (char_length(note) <= 500),

  -- 命中维度反馈（哪些维度用户认为准确）
  accurate_dimensions TEXT[] DEFAULT '{}',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 每人每天每档案只能打卡一次
  CONSTRAINT uq_daily_checkin UNIQUE(user_id, profile_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON public.daily_checkins(user_id, profile_id, checkin_date DESC);

-- 更新时间触发器（复用已有函数）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_daily_checkins_updated_at'
  ) THEN
    CREATE TRIGGER trg_daily_checkins_updated_at
      BEFORE UPDATE ON public.daily_checkins
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

COMMENT ON TABLE public.daily_checkins IS '今日复盘打卡表：聚合反馈，替代散落的准/不准按钮';

-- ============================================
-- 2. 年度同比缓存表（流年 YOY 对比数据）
-- ============================================

-- 创建枚举类型（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decade_year_tag_enum') THEN
    CREATE TYPE decade_year_tag_enum AS ENUM (
      'key_sprint',   -- 关键冲刺年
      'defense',      -- 重点防守年
      'transition',   -- 过渡年
      'harvest',      -- 收获年
      'dormant'       -- 蛰伏年
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.yearly_comparisons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  profile_id    TEXT NOT NULL,
  current_year  SMALLINT NOT NULL,
  previous_year SMALLINT NOT NULL,

  -- 各维度 YOY 变化量 (-100 ~ +100)
  career_delta  SMALLINT CHECK (career_delta BETWEEN -100 AND 100),
  wealth_delta  SMALLINT CHECK (wealth_delta BETWEEN -100 AND 100),
  love_delta    SMALLINT CHECK (love_delta BETWEEN -100 AND 100),

  -- AI 生成的一句话同比结论
  summary       TEXT,

  -- 大限-流年化学反应标签
  decade_year_tag decade_year_tag_enum,

  -- 算法/Prompt 版本号，防止历史缓存与新算法口径冲突
  algo_version  VARCHAR(50) NOT NULL DEFAULT 'v2.0-202602',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_yearly_comparison UNIQUE(user_id, profile_id, current_year)
);

CREATE INDEX IF NOT EXISTS idx_yearly_comparisons_lookup
  ON public.yearly_comparisons(user_id, profile_id, current_year, algo_version);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_yearly_comparisons_updated_at'
  ) THEN
    CREATE TRIGGER trg_yearly_comparisons_updated_at
      BEFORE UPDATE ON public.yearly_comparisons
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

COMMENT ON TABLE public.yearly_comparisons IS '年度同比缓存：存储 YOY 对比数据和大限-流年化学反应标签';

-- ============================================
-- 3. 用户偏好设置表
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,

  -- 各功能开关（JSONB，便于扩展）
  preferences   JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_preferences UNIQUE(user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

COMMENT ON TABLE public.user_preferences IS '用户偏好设置：Geek Mode、Pro Mode、侧栏折叠等';

-- ============================================
-- 验证
-- ============================================
SELECT 'daily_checkins' AS table_name, COUNT(*) AS row_count FROM public.daily_checkins
UNION ALL
SELECT 'yearly_comparisons', COUNT(*) FROM public.yearly_comparisons
UNION ALL
SELECT 'user_preferences', COUNT(*) FROM public.user_preferences;

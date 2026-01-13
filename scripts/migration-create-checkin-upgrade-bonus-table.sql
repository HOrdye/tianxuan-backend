-- ============================================================================
-- 签到升级补差数据库表创建脚本
-- 创建时间: 2026年1月30日
-- 说明: 创建 checkin_upgrade_bonus_logs 表用于记录签到升级补差记录
-- ============================================================================

-- 创建 checkin_upgrade_bonus_logs 表
CREATE TABLE IF NOT EXISTS public.checkin_upgrade_bonus_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in_date DATE NOT NULL,                   -- 签到日期
  old_tier TEXT NOT NULL,                        -- 升级前的会员等级
  new_tier TEXT NOT NULL,                        -- 升级后的会员等级
  base_coins INTEGER NOT NULL,                   -- 基础签到奖励（已发放）
  bonus_coins INTEGER NOT NULL,                  -- 补差奖励（本次发放）
  total_coins INTEGER NOT NULL,                   -- 总奖励（base_coins + bonus_coins）
  upgrade_date DATE NOT NULL,                    -- 升级日期
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 补差发放时间
  metadata JSONB,                                 -- 元数据（可选，存储额外的补差信息）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS checkin_upgrade_bonus_user_id_idx ON public.checkin_upgrade_bonus_logs(user_id);
CREATE INDEX IF NOT EXISTS checkin_upgrade_bonus_check_in_date_idx ON public.checkin_upgrade_bonus_logs(check_in_date DESC);
CREATE INDEX IF NOT EXISTS checkin_upgrade_bonus_upgrade_date_idx ON public.checkin_upgrade_bonus_logs(upgrade_date DESC);
CREATE INDEX IF NOT EXISTS checkin_upgrade_bonus_created_at_idx ON public.checkin_upgrade_bonus_logs(created_at DESC);

-- 添加唯一约束：同一用户同一签到日期只能补差一次
CREATE UNIQUE INDEX IF NOT EXISTS checkin_upgrade_bonus_user_date_unique 
  ON public.checkin_upgrade_bonus_logs(user_id, check_in_date);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.checkin_upgrade_bonus_logs
--   ADD CONSTRAINT checkin_upgrade_bonus_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 添加注释
COMMENT ON TABLE public.checkin_upgrade_bonus_logs IS '签到升级补差日志表，记录用户升级会员等级后的签到奖励补差';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.id IS '补差记录ID';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.user_id IS '用户ID';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.check_in_date IS '签到日期';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.old_tier IS '升级前的会员等级';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.new_tier IS '升级后的会员等级';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.base_coins IS '基础签到奖励（已发放）';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.bonus_coins IS '补差奖励（本次发放）';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.total_coins IS '总奖励（base_coins + bonus_coins）';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.upgrade_date IS '升级日期';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.granted_at IS '补差发放时间';
COMMENT ON COLUMN public.checkin_upgrade_bonus_logs.metadata IS '元数据（JSONB格式，存储额外的补差信息）';

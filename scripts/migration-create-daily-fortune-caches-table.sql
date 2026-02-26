-- ============================================================================
-- 每日运势缓存数据库表创建脚本
-- 创建时间: 2025年1月11日
-- 说明: 创建 daily_fortune_caches 表用于存储每日运势缓存数据
-- ============================================================================

-- 创建 daily_fortune_caches 表
CREATE TABLE IF NOT EXISTS public.daily_fortune_caches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    profile_id TEXT NOT NULL, -- 针对哪个档案算的 (可能是 UUID 或 'self')
    fortune_date DATE NOT NULL, -- 哪一天的运势 (YYYY-MM-DD)
    data JSONB NOT NULL, -- 完整的运势 JSON 数据
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 复合唯一索引：同一个用户、同一个档案、同一天只能有一条缓存
    UNIQUE(user_id, profile_id, fortune_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS daily_fortune_caches_user_id_idx ON public.daily_fortune_caches(user_id);
CREATE INDEX IF NOT EXISTS daily_fortune_caches_profile_id_idx ON public.daily_fortune_caches(profile_id);
CREATE INDEX IF NOT EXISTS daily_fortune_caches_fortune_date_idx ON public.daily_fortune_caches(fortune_date);
CREATE INDEX IF NOT EXISTS daily_fortune_caches_user_profile_date_idx ON public.daily_fortune_caches(user_id, profile_id, fortune_date);

-- 添加外键约束（如果 profiles 表存在）
-- 注意：如果 user_id 引用的是 profiles.id，请取消下面的注释
-- ALTER TABLE public.daily_fortune_caches
--   ADD CONSTRAINT daily_fortune_caches_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 开启 RLS（如果使用 Supabase Auth）
-- ALTER TABLE public.daily_fortune_caches ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查改自己的运势缓存
-- CREATE POLICY "Users can manage their own fortune caches" 
-- ON public.daily_fortune_caches
-- FOR ALL
-- USING (auth.uid() = user_id);

-- 添加注释
COMMENT ON TABLE public.daily_fortune_caches IS '每日运势缓存表，存储用户每日运势的缓存数据';
COMMENT ON COLUMN public.daily_fortune_caches.id IS '缓存记录ID';
COMMENT ON COLUMN public.daily_fortune_caches.user_id IS '用户ID';
COMMENT ON COLUMN public.daily_fortune_caches.profile_id IS '档案ID（可能是 UUID 或特殊值如 self）';
COMMENT ON COLUMN public.daily_fortune_caches.fortune_date IS '运势日期（YYYY-MM-DD）';
COMMENT ON COLUMN public.daily_fortune_caches.data IS '完整的运势 JSON 数据';
COMMENT ON COLUMN public.daily_fortune_caches.created_at IS '创建时间';
COMMENT ON COLUMN public.daily_fortune_caches.updated_at IS '更新时间';

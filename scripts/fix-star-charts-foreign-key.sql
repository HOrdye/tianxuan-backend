-- ============================================
-- 修复 star_charts 表外键约束错误
-- ============================================
-- 问题：star_charts 表的外键错误地指向了 profiles_archives 表
-- 修复：将外键约束改为指向 profiles 表
-- 创建时间：2025-01-30
-- ============================================

-- 1. 检查当前外键约束定义（诊断）
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'star_charts_profile_id_fkey';

-- 2. 删除错误的外键约束
ALTER TABLE public.star_charts 
DROP CONSTRAINT IF EXISTS star_charts_profile_id_fkey;

-- 3. 添加正确的外键约束（指向 public.profiles）
ALTER TABLE public.star_charts 
ADD CONSTRAINT star_charts_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 4. 验证修改结果
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'star_charts_profile_id_fkey';

-- 预期结果：
-- constraint_name: star_charts_profile_id_fkey
-- table_name: star_charts
-- referenced_table: profiles (应该是 public.profiles，而不是 profiles_archives)
-- constraint_definition: FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE

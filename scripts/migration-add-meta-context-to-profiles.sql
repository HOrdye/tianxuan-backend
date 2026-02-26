-- ============================================================================
-- 添加 meta_context 字段到 profiles 表
-- 创建时间: 2026-02-01
-- 说明: 预留通用 JSONB 字段，用于存储未来可能增加的任意用户维度数据
--       作为 AI Context 的通用输入源，避免未来修改数据库 Schema
-- ============================================================================

-- ============================================================================
-- 1. 添加 meta_context 字段
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'meta_context'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN meta_context JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN public.profiles.meta_context IS '用户元数据上下文（JSONB格式），用于存储未来可能增加的任意用户维度数据（如血型、MBTI类型等），作为AI Context的通用输入源，避免未来修改数据库Schema';
    ELSE
        RAISE NOTICE 'meta_context 字段已存在，跳过创建';
    END IF;
END $$;

-- ============================================================================
-- 2. 创建 GIN 索引（优化 JSONB 查询）
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_meta_context_gin 
  ON public.profiles USING GIN (meta_context);

COMMENT ON INDEX idx_profiles_meta_context_gin IS 'meta_context 字段的 GIN 索引，用于优化 JSONB 查询性能';

-- ============================================================================
-- 3. 验证迁移结果
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'meta_context'
  ) THEN
    RAISE EXCEPTION 'meta_context 字段创建失败';
  END IF;
  
  RAISE NOTICE '✅ meta_context 字段已成功添加到 profiles 表';
  RAISE NOTICE '   - 字段类型: JSONB';
  RAISE NOTICE '   - 默认值: {}';
  RAISE NOTICE '   - GIN 索引已创建';
END $$;

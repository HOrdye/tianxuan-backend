-- ============================================
-- v5.1.9: 修复 refund_logs 表 order_id 字段约束
-- ============================================
-- 
-- 问题背景：
-- - AI服务退款场景不需要关联订单（order_id）
-- - 但数据库表中 order_id 字段是 NOT NULL，导致插入失败
-- - 错误：null value in column "order_id" of relation "refund_logs" violates not-null constraint
--
-- 解决方案：
-- - 将 order_id 字段改为可空（NULL）
-- - 订单退款场景：提供 order_id
-- - AI服务退款场景：order_id 为 NULL
-- ============================================

-- ============================================
-- 1. 检查 order_id 字段是否存在
-- ============================================

DO $$
BEGIN
  -- 检查 order_id 字段是否存在
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'refund_logs' 
    AND column_name = 'order_id'
  ) THEN
    -- 如果字段存在，修改为可空
    ALTER TABLE public.refund_logs 
    ALTER COLUMN order_id DROP NOT NULL;
    
    RAISE NOTICE '✅ 已修改 order_id 字段为可空';
  ELSE
    -- 如果字段不存在，说明使用的是新表结构（v5.1.7），不需要修改
    RAISE NOTICE 'ℹ️ order_id 字段不存在，使用新表结构（v5.1.7），无需修改';
  END IF;
END $$;

-- ============================================
-- 2. 添加注释说明
-- ============================================

COMMENT ON COLUMN public.refund_logs.order_id IS '关联的订单ID（UUID，引用 transactions.id）。订单退款场景必填，AI服务退款场景为NULL';

-- ============================================
-- 3. 验证修改结果
-- ============================================

DO $$
DECLARE
  nullable_status TEXT;
BEGIN
  SELECT c.is_nullable 
  INTO nullable_status
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
  AND c.table_name = 'refund_logs' 
  AND c.column_name = 'order_id';
  
  IF nullable_status IS NOT NULL THEN
    IF nullable_status = 'YES' THEN
      RAISE NOTICE '✅ 验证通过：order_id 字段已设置为可空';
    ELSE
      RAISE WARNING '⚠️ 验证失败：order_id 字段仍为 NOT NULL，请检查';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ order_id 字段不存在，使用新表结构';
  END IF;
END $$;

-- ============================================================================
-- 创建天感·今日气象（Celestial Resonance）相关数据库表
-- 创建时间: 2026-01-15
-- 说明: 创建 celestial_resonance_records 和 imagery_word_library 表
-- ============================================================================

-- ============================================================================
-- 1. 创建天感记录表 (celestial_resonance_records)
-- ============================================================================
-- 用途：记录用户每日的天感记录（定念、共振、显化数据）

CREATE TABLE IF NOT EXISTS public.celestial_resonance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  resonance_date DATE NOT NULL,
  
  -- 定念数据（用户输入）
  calibration_data JSONB NOT NULL, -- { duration: number, mouseTrajectory: number[], timestamp: string, hour: number }
  
  -- 共振数据（生成参数）
  resonance_params JSONB NOT NULL, -- { randomSeed: string, particleConfig: {...}, shaderParams: {...} }
  
  -- 显化结果（最终输出）
  manifestation_data JSONB NOT NULL, -- { keywords: string[], coreWord: string, imageUrl: string, videoUrl: string, layout: {...} }
  
  -- 紫微流日数据（用于生成）
  ziwei_liuday_data JSONB NOT NULL, -- { mainStar: string, transformations: string[], palaces: {...}, element: string, state: string }
  
  -- 解码数据（付费内容）
  decoding_data JSONB, -- { explanation: string, astrologicalReason: string, warnings: string[], suggestions: string[] }
  
  -- 元数据
  is_decoded BOOLEAN DEFAULT FALSE, -- 是否已付费解码
  decoded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束：同一用户、同一档案、同一天只能有一条记录
  CONSTRAINT unique_resonance_record UNIQUE(user_id, profile_id, resonance_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_celestial_resonance_user_profile_date 
  ON public.celestial_resonance_records(user_id, profile_id, resonance_date DESC);

CREATE INDEX IF NOT EXISTS idx_celestial_resonance_date 
  ON public.celestial_resonance_records(resonance_date DESC);

CREATE INDEX IF NOT EXISTS idx_celestial_resonance_user_id 
  ON public.celestial_resonance_records(user_id);

CREATE INDEX IF NOT EXISTS idx_celestial_resonance_profile_id 
  ON public.celestial_resonance_records(profile_id);

-- 添加注释
COMMENT ON TABLE public.celestial_resonance_records IS '天感记录表，记录用户每日的天感记录（定念、共振、显化数据）';
COMMENT ON COLUMN public.celestial_resonance_records.id IS '记录ID';
COMMENT ON COLUMN public.celestial_resonance_records.user_id IS '用户ID';
COMMENT ON COLUMN public.celestial_resonance_records.profile_id IS '档案ID';
COMMENT ON COLUMN public.celestial_resonance_records.resonance_date IS '共振日期（YYYY-MM-DD）';
COMMENT ON COLUMN public.celestial_resonance_records.calibration_data IS '定念数据（用户输入：时长、轨迹、时辰等）';
COMMENT ON COLUMN public.celestial_resonance_records.resonance_params IS '共振数据（生成参数：随机种子、粒子配置、着色器参数等）';
COMMENT ON COLUMN public.celestial_resonance_records.manifestation_data IS '显化结果（最终输出：关键词、核心字、海报URL等）';
COMMENT ON COLUMN public.celestial_resonance_records.ziwei_liuday_data IS '紫微流日数据（用于生成：主星、四化、三方四正等）';
COMMENT ON COLUMN public.celestial_resonance_records.decoding_data IS '解码数据（付费内容：解释、命理原因、警告、建议等）';
COMMENT ON COLUMN public.celestial_resonance_records.is_decoded IS '是否已付费解码';
COMMENT ON COLUMN public.celestial_resonance_records.decoded_at IS '解码时间';

-- ============================================================================
-- 2. 创建意象词库表 (imagery_word_library)
-- ============================================================================
-- 用途：存储意象词汇库，用于生成今日气象的关键词

CREATE TABLE IF NOT EXISTS public.imagery_word_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('变动', '停滞', '上升', '下降')),
  element TEXT NOT NULL CHECK (element IN ('火', '水', '木', '金', '土')),
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
  meaning TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_imagery_word_category_element 
  ON public.imagery_word_library(category, element);

CREATE INDEX IF NOT EXISTS idx_imagery_word_intensity 
  ON public.imagery_word_library(intensity DESC);

CREATE INDEX IF NOT EXISTS idx_imagery_word_word 
  ON public.imagery_word_library(word);

-- 添加注释
COMMENT ON TABLE public.imagery_word_library IS '意象词库表，存储用于生成今日气象的关键词';
COMMENT ON COLUMN public.imagery_word_library.id IS '词汇ID';
COMMENT ON COLUMN public.imagery_word_library.word IS '词汇本身';
COMMENT ON COLUMN public.imagery_word_library.category IS '分类：变动、停滞、上升、下降';
COMMENT ON COLUMN public.imagery_word_library.element IS '五行属性：火、水、木、金、土';
COMMENT ON COLUMN public.imagery_word_library.intensity IS '强度：1-5';
COMMENT ON COLUMN public.imagery_word_library.meaning IS '含义说明';
COMMENT ON COLUMN public.imagery_word_library.usage_count IS '使用次数';

-- ============================================================================
-- 3. 初始化意象词库数据（可选）
-- ============================================================================
-- 注意：如果词库已存在，可以使用 INSERT ... ON CONFLICT DO NOTHING 避免重复

INSERT INTO public.imagery_word_library (word, category, element, intensity, meaning)
VALUES
  -- 变动类
  ('破壁', '变动', '火', 5, '突破障碍'),
  ('微澜', '变动', '水', 2, '细微变化'),
  ('流转', '变动', '水', 3, '流动变化'),
  ('翻涌', '变动', '水', 4, '激烈变化'),
  ('腾跃', '变动', '火', 5, '快速上升'),
  ('转折', '变动', '金', 3, '关键转折'),
  ('蜕变', '变动', '火', 5, '根本改变'),
  ('激荡', '变动', '水', 4, '激烈波动'),
  
  -- 停滞类
  ('潜龙', '停滞', '水', 3, '蓄势待发'),
  ('归元', '停滞', '土', 4, '回归本心'),
  ('蓄力', '停滞', '土', 3, '积累能量'),
  ('静观', '停滞', '金', 2, '冷静观察'),
  ('深潜', '停滞', '水', 4, '深入思考'),
  ('沉淀', '停滞', '土', 3, '沉淀积累'),
  ('守静', '停滞', '金', 2, '保持安静'),
  ('内敛', '停滞', '土', 3, '收敛内聚'),
  
  -- 上升类
  ('升腾', '上升', '火', 4, '向上发展'),
  ('攀升', '上升', '木', 3, '逐步上升'),
  ('飞跃', '上升', '火', 5, '快速上升'),
  ('突破', '上升', '火', 5, '突破限制'),
  ('昂扬', '上升', '木', 4, '精神振奋'),
  ('勃发', '上升', '木', 4, '蓬勃发展'),
  ('崛起', '上升', '土', 4, '强势崛起'),
  ('高升', '上升', '金', 3, '地位提升'),
  
  -- 下降类
  ('回落', '下降', '水', 3, '向下回落'),
  ('收敛', '下降', '金', 2, '收敛收缩'),
  ('沉淀', '下降', '土', 3, '沉淀积累'),
  ('内省', '下降', '水', 3, '向内反省'),
  ('归隐', '下降', '土', 4, '回归本心'),
  ('静养', '下降', '水', 2, '静心修养'),
  ('收敛', '下降', '金', 2, '收敛收缩'),
  ('沉淀', '下降', '土', 3, '沉淀积累')
ON CONFLICT (word) DO NOTHING;

-- ============================================================================
-- 4. 验证表创建
-- ============================================================================
-- 检查表是否创建成功
SELECT 
  'celestial_resonance_records' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'celestial_resonance_records'
UNION ALL
SELECT 
  'imagery_word_library' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'imagery_word_library';

-- 检查词库数据
SELECT COUNT(*) as word_count FROM public.imagery_word_library;

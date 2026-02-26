ALTER TABLE compatibility_archives
ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}';

COMMENT ON COLUMN compatibility_archives.meta_data IS '存储关系类型、用户目标、置信度等结构化数据，供 CRM 使用';

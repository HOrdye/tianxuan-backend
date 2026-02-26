ALTER TABLE compatibility_archives
ADD COLUMN IF NOT EXISTS rectification_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS inferred_hour VARCHAR(20),
ADD COLUMN IF NOT EXISTS confidence INT,
ADD COLUMN IF NOT EXISTS inference_data JSONB;

CREATE INDEX IF NOT EXISTS idx_compatibility_rectification_method ON compatibility_archives(rectification_method);

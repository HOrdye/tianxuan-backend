CREATE TABLE IF NOT EXISTS compatibility_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_a JSONB NOT NULL,
  chart_b JSONB NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compatibility_archives_user_id ON compatibility_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_archives_created_at ON compatibility_archives(created_at DESC);

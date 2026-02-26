CREATE TABLE IF NOT EXISTS temporal_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  chart_snapshot JSONB NOT NULL,
  analysis_result JSONB NOT NULL,
  validity_period JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temporal_archives_user_id ON temporal_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_temporal_archives_created_at ON temporal_archives(created_at DESC);

CREATE TABLE IF NOT EXISTS strategy_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chart_id UUID,
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  custom_context TEXT,
  analysis_result JSONB,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategy_inquiries_user_id ON strategy_inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_inquiries_created_at ON strategy_inquiries(created_at DESC);

-- ============================================================
-- Migration 004: Recommendation Engine for EcoGuardian AI
-- ============================================================

-- Add new columns to recommendations table
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS impact_score NUMERIC(10,3) NOT NULL DEFAULT 0;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS adoption_probability NUMERIC(4,3) NOT NULL DEFAULT 0.5;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS cost_savings NUMERIC(10,3) NOT NULL DEFAULT 0;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS time_savings_min NUMERIC(10,3) NOT NULL DEFAULT 0;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'rule';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS reasoning JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS deduplication_hash TEXT;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.recommendations ADD COLUMN IF NOT EXISTS shown_at TIMESTAMPTZ;

-- Recommendation events table
CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('SHOWN', 'CLICKED', 'IGNORED', 'ADOPTED', 'COMPLETED', 'DISMISSED')),
  note TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_created ON public.recommendation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_recommendation ON public.recommendation_events (recommendation_id, event_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON public.recommendations (user_id, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON public.recommendations (user_id, expires_at DESC);

-- Enable RLS
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "recommendation_events_own_rows" ON public.recommendation_events;
CREATE POLICY "recommendation_events_own_rows" ON public.recommendation_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

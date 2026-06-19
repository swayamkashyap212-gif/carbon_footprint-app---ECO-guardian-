-- ============================================================
-- Migration 001: Initial Schema for EcoGuardian AI
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums (safe creation)
DO $$ BEGIN
  CREATE TYPE carbon_category AS ENUM ('electricity', 'transport', 'flight', 'food', 'food_waste', 'shopping', 'routine');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE carbon_source AS ENUM ('manual', 'ocr', 'email', 'gps', 'sms', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_difficulty AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  region TEXT DEFAULT 'india',
  sustainability_goal_kg NUMERIC(8,2) DEFAULT 9,
  privacy_settings JSONB NOT NULL DEFAULT '{"location":false,"email":false,"sms":false,"ocr":true,"ai":true}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carbon entries table
CREATE TABLE IF NOT EXISTS public.carbon_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category carbon_category NOT NULL,
  label TEXT NOT NULL,
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source carbon_source NOT NULL DEFAULT 'manual',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category carbon_category NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  impact_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  difficulty recommendation_difficulty NOT NULL DEFAULT 'easy',
  priority INTEGER DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carbon goals table
CREATE TABLE IF NOT EXISTS public.carbon_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category carbon_category,
  target_kg NUMERIC(10,3) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device tokens table
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gamification events table
CREATE TABLE IF NOT EXISTS public.gamification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily carbon summary view
CREATE OR REPLACE VIEW public.daily_carbon_summary AS
SELECT
  user_id,
  day,
  sum(category_total) AS total_kg,
  jsonb_object_agg(category, category_total) AS category_totals
FROM (
  SELECT user_id, date_trunc('day', occurred_at)::date AS day, category, sum(kg_co2e) AS category_total
  FROM public.carbon_entries
  GROUP BY user_id, date_trunc('day', occurred_at)::date, category
) grouped
GROUP BY user_id, day;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_carbon_entries_user_date ON public.carbon_entries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_entries_category ON public.carbon_entries (user_id, category);
CREATE INDEX IF NOT EXISTS idx_recommendations_user ON public.recommendations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_goals_user ON public.carbon_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_events_user ON public.gamification_events (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "profiles_own_rows" ON public.profiles;
CREATE POLICY "profiles_own_rows" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "carbon_entries_own_rows" ON public.carbon_entries;
CREATE POLICY "carbon_entries_own_rows" ON public.carbon_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recommendations_own_rows" ON public.recommendations;
CREATE POLICY "recommendations_own_rows" ON public.recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "carbon_goals_own_rows" ON public.carbon_goals;
CREATE POLICY "carbon_goals_own_rows" ON public.carbon_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_tokens_own_rows" ON public.device_tokens;
CREATE POLICY "device_tokens_own_rows" ON public.device_tokens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alerts_own_rows" ON public.alerts;
CREATE POLICY "alerts_own_rows" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_events_own_rows" ON public.gamification_events;
CREATE POLICY "gamification_events_own_rows" ON public.gamification_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger function for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'full_name', 'EcoGuardian User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

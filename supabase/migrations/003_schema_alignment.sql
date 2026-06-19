-- ============================================================
-- Migration 003: Schema Alignment for EcoGuardian AI
-- ============================================================

-- Tracking source enum (safe creation)
DO $$ BEGIN
  CREATE TYPE tracking_source AS ENUM ('manual', 'ocr', 'email', 'gps', 'sms', 'ai');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users table (separate from profiles for auth metadata)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  auth_provider TEXT DEFAULT 'supabase',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Carbon logs view (alias for carbon_entries)
CREATE OR REPLACE VIEW public.carbon_logs AS
SELECT
  id,
  user_id,
  category::text AS category,
  label AS title,
  kg_co2e,
  source::text AS source,
  occurred_at,
  metadata,
  created_at
FROM public.carbon_entries;

-- Electricity logs table
CREATE TABLE IF NOT EXISTS public.electricity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  provider TEXT,
  units_kwh NUMERIC(12,3) NOT NULL CHECK (units_kwh >= 0),
  bill_amount NUMERIC(12,2) DEFAULT 0,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  regional_factor NUMERIC(10,6) NOT NULL,
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source tracking_source NOT NULL DEFAULT 'manual',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  document_url TEXT,
  raw_reference_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Food logs table
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  meal_type TEXT NOT NULL DEFAULT 'meal',
  food_category TEXT NOT NULL CHECK (food_category IN ('vegetarian', 'non_vegetarian', 'processed', 'local')),
  servings NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (servings > 0),
  grams NUMERIC(10,2),
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source tracking_source NOT NULL DEFAULT 'manual',
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.8 CHECK (confidence >= 0 AND confidence <= 1),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Food waste logs table
CREATE TABLE IF NOT EXISTS public.food_waste_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  food_type TEXT NOT NULL,
  weight_kg NUMERIC(10,3) NOT NULL CHECK (weight_kg >= 0),
  disposal_method TEXT NOT NULL DEFAULT 'landfill',
  waste_score INTEGER NOT NULL DEFAULT 50 CHECK (waste_score >= 0 AND waste_score <= 100),
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source tracking_source NOT NULL DEFAULT 'manual',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Carbon scores table
CREATE TABLE IF NOT EXISTS public.carbon_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_kg_co2e NUMERIC(12,3) NOT NULL DEFAULT 0,
  saved_kg_co2e NUMERIC(12,3) NOT NULL DEFAULT 0,
  carbon_score INTEGER NOT NULL CHECK (carbon_score >= 0 AND carbon_score <= 100),
  sustainability_score INTEGER NOT NULL CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
  category_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period, period_start)
);

-- AI chat history table
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_refs JSONB NOT NULL DEFAULT '{}',
  safety_flags JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone);
CREATE INDEX IF NOT EXISTS idx_electricity_logs_user_period ON public.electricity_logs (user_id, billing_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_created ON public.food_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_waste_logs_user_created ON public.food_waste_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carbon_scores_user_period ON public.carbon_scores (user_id, period, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_session ON public.ai_chat_history (user_id, session_id, created_at);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.electricity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "users_own_rows" ON public.users;
CREATE POLICY "users_own_rows" ON public.users FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "electricity_logs_own_rows" ON public.electricity_logs;
CREATE POLICY "electricity_logs_own_rows" ON public.electricity_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_logs_own_rows" ON public.food_logs;
CREATE POLICY "food_logs_own_rows" ON public.food_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_waste_logs_own_rows" ON public.food_waste_logs;
CREATE POLICY "food_waste_logs_own_rows" ON public.food_waste_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "carbon_scores_own_rows" ON public.carbon_scores;
CREATE POLICY "carbon_scores_own_rows" ON public.carbon_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_chat_history_own_rows" ON public.ai_chat_history;
CREATE POLICY "ai_chat_history_own_rows" ON public.ai_chat_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated handle_new_user function (OR REPLACE avoids conflict with 001)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, phone, auth_provider)
  VALUES (NEW.id, NEW.email, NEW.phone, COALESCE(NEW.raw_app_meta_data->>'provider', 'supabase'))
  ON CONFLICT (id) DO NOTHING;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'full_name', 'EcoGuardian User'))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger with updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

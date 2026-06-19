-- ============================================================
-- Migration 002: Advanced Modules for EcoGuardian AI
-- ============================================================

-- Flight logs table
CREATE TABLE IF NOT EXISTS public.flight_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  flight_number TEXT NOT NULL,
  departure_airport TEXT NOT NULL,
  destination_airport TEXT NOT NULL,
  departure_date DATE NOT NULL,
  passenger_count INTEGER NOT NULL DEFAULT 1 CHECK (passenger_count > 0),
  distance_km NUMERIC(10,2) NOT NULL CHECK (distance_km >= 0),
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'email', 'gmail', 'gps', 'sms', 'notification', 'activity', 'ai')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  raw_reference_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopping logs table
CREATE TABLE IF NOT EXISTS public.shopping_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  vendor TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('electronics', 'fashion', 'grocery', 'food', 'home_appliances', 'personal_care')),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_type TEXT NOT NULL DEFAULT 'standard' CHECK (delivery_type IN ('standard', 'express', 'grouped', 'pickup')),
  order_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  manufacturing_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  packaging_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  delivery_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_kg_co2e NUMERIC(10,3) NOT NULL CHECK (total_kg_co2e >= 0),
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'email', 'gmail', 'gps', 'sms', 'notification', 'activity', 'ai')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  raw_reference_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transport logs table
CREATE TABLE IF NOT EXISTS public.transport_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  carbon_entry_id UUID REFERENCES public.carbon_entries(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'bike', 'bus', 'metro', 'train', 'flight', 'walking', 'cycling')),
  distance_km NUMERIC(10,3) NOT NULL CHECK (distance_km >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  kg_co2e NUMERIC(10,3) NOT NULL CHECK (kg_co2e >= 0),
  source TEXT NOT NULL CHECK (source IN ('manual', 'ocr', 'email', 'gmail', 'gps', 'sms', 'notification', 'activity', 'ai')),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.7 CHECK (confidence >= 0 AND confidence <= 1),
  origin_place_id TEXT,
  destination_place_id TEXT,
  route_summary JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prediction logs table
CREATE TABLE IF NOT EXISTS public.prediction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_version TEXT NOT NULL DEFAULT 'baseline-v1',
  forecast_7d_kg NUMERIC(10,3) NOT NULL,
  forecast_30d_kg NUMERIC(10,3) NOT NULL,
  forecast_90d_kg NUMERIC(10,3) NOT NULL,
  forecast_annual_kg NUMERIC(10,3) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  sustainability_score INTEGER NOT NULL CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
  drivers JSONB NOT NULL DEFAULT '[]',
  features_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('high_carbon', 'travel', 'shopping', 'electricity', 'food', 'report', 'recommendation')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  impact_kg NUMERIC(10,3),
  action_route TEXT,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sustainability scores table
CREATE TABLE IF NOT EXISTS public.sustainability_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  carbon_score INTEGER NOT NULL CHECK (carbon_score >= 0 AND carbon_score <= 100),
  sustainability_score INTEGER NOT NULL CHECK (sustainability_score >= 0 AND sustainability_score <= 100),
  category_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flight_logs_user_date ON public.flight_logs (user_id, departure_date DESC);
CREATE INDEX IF NOT EXISTS idx_flight_logs_route ON public.flight_logs (departure_airport, destination_airport);
CREATE INDEX IF NOT EXISTS idx_shopping_logs_user_created ON public.shopping_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_logs_category ON public.shopping_logs (user_id, category);
CREATE INDEX IF NOT EXISTS idx_transport_logs_user_created ON public.transport_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_logs_mode ON public.transport_logs (user_id, mode);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_user_created ON public.prediction_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sustainability_scores_user_period ON public.sustainability_scores (user_id, period, period_start DESC);

-- Enable RLS
ALTER TABLE public.flight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "flight_logs_own_rows" ON public.flight_logs;
CREATE POLICY "flight_logs_own_rows" ON public.flight_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shopping_logs_own_rows" ON public.shopping_logs;
CREATE POLICY "shopping_logs_own_rows" ON public.shopping_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transport_logs_own_rows" ON public.transport_logs;
CREATE POLICY "transport_logs_own_rows" ON public.transport_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prediction_logs_own_rows" ON public.prediction_logs;
CREATE POLICY "prediction_logs_own_rows" ON public.prediction_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_own_rows" ON public.notifications;
CREATE POLICY "notifications_own_rows" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sustainability_scores_own_rows" ON public.sustainability_scores;
CREATE POLICY "sustainability_scores_own_rows" ON public.sustainability_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Dashboard category summary view
CREATE OR REPLACE VIEW public.dashboard_category_summary AS
SELECT
  user_id,
  category,
  date_trunc('month', occurred_at)::date AS month,
  sum(kg_co2e) AS total_kg
FROM public.carbon_entries
GROUP BY user_id, category, date_trunc('month', occurred_at)::date;

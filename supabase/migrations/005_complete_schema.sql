-- ============================================================
-- Migration 005: Complete Schema for EcoGuardian AI
-- Adds: delivery tracking, gamification, streaks, challenges,
--        food/grocery delivery, ride bookings, points system
-- ============================================================

-- ==================== TABLES ====================

-- Delivery orders
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SWIGGY', 'ZOMATO', 'BLINKIT', 'ZEPTO', 'AMAZON', 'FLIPKART', 'BIGBASKET', 'OTHER')),
  platform_order_id TEXT,
  items TEXT[] DEFAULT '{}',
  total_cost NUMERIC(10,2),
  currency TEXT DEFAULT 'INR',
  vehicle_type TEXT DEFAULT 'TWO_WHEELER' CHECK (vehicle_type IN ('TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER', 'LARGE_VEHICLE', 'ELECTRIC_BIKE', 'PICKUP_VAN', 'VAN')),
  distance_km NUMERIC(6,2),
  carbon_saved_kg NUMERIC(8,4) DEFAULT 0,
  carbon_total_kg NUMERIC(8,4) DEFAULT 0,
  status TEXT DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'PARSED', 'TRACKED', 'FAILED')),
  notification_text TEXT,
  notification_package TEXT,
  notification_timestamp TIMESTAMPTZ,
  is_eco_friendly BOOLEAN DEFAULT FALSE,
  estimated_delivery_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Food delivery logs
CREATE TABLE IF NOT EXISTS food_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SWIGGY', 'ZOMATO', 'BLINKIT', 'ZEPTO', 'AMAZON', 'FLIPKART', 'BIGBASKET', 'OTHER')),
  platform_order_id TEXT,
  restaurant_name TEXT,
  items TEXT[] DEFAULT '{}',
  total_cost NUMERIC(10,2),
  currency TEXT DEFAULT 'INR',
  vehicle_type TEXT DEFAULT 'TWO_WHEELER' CHECK (vehicle_type IN ('TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER', 'LARGE_VEHICLE', 'ELECTRIC_BIKE', 'PICKUP_VAN', 'VAN')),
  distance_km NUMERIC(6,2),
  carbon_saved_kg NUMERIC(8,4) DEFAULT 0,
  carbon_total_kg NUMERIC(8,4) DEFAULT 0,
  is_eco_friendly BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grocery delivery logs
CREATE TABLE IF NOT EXISTS grocery_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('SWIGGY', 'ZOMATO', 'BLINKIT', 'ZEPTO', 'AMAZON', 'FLIPKART', 'BIGBASKET', 'OTHER')),
  platform_order_id TEXT,
  items TEXT[] DEFAULT '{}',
  total_cost NUMERIC(10,2),
  currency TEXT DEFAULT 'INR',
  vehicle_type TEXT DEFAULT 'ELECTRIC_BIKE' CHECK (vehicle_type IN ('TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER', 'LARGE_VEHICLE', 'ELECTRIC_BIKE', 'PICKUP_VAN', 'VAN')),
  distance_km NUMERIC(6,2),
  carbon_saved_kg NUMERIC(8,4) DEFAULT 0,
  carbon_total_kg NUMERIC(8,4) DEFAULT 0,
  is_eco_friendly BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ride bookings
CREATE TABLE IF NOT EXISTS ride_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('UBER', 'OLA', 'RAPIDO', 'PORTER', 'OTHER')),
  platform_ride_id TEXT,
  vehicle_type TEXT,
  distance_km NUMERIC(6,2),
  duration_minutes INTEGER,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  drop_lat DOUBLE PRECISION,
  drop_lng DOUBLE PRECISION,
  pickup_address TEXT,
  drop_address TEXT,
  total_cost NUMERIC(10,2),
  currency TEXT DEFAULT 'INR',
  carbon_saved_kg NUMERIC(8,4) DEFAULT 0,
  carbon_total_kg NUMERIC(8,4) DEFAULT 0,
  is_eco_friendly BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== GAMIFICATION TABLES ====================

-- User points system
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  points_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Points events
CREATE TABLE IF NOT EXISTS points_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Streaks
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  last_entry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC(10,2),
  current_value NUMERIC(10,2) DEFAULT 0,
  unit TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'FAILED', 'EXPIRED')),
  points_reward INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== ALERTS ====================

-- Smart alerts
CREATE TABLE IF NOT EXISTS smart_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_delivery_orders_user ON delivery_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_platform ON delivery_orders(platform);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created ON delivery_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_food_delivery_logs_user ON food_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_delivery_logs_user ON grocery_delivery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_user ON ride_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_platform ON ride_bookings(platform);
CREATE INDEX IF NOT EXISTS idx_points_events_user ON points_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_user ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_user ON smart_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_alerts_unread ON smart_alerts(user_id, is_read) WHERE is_read = FALSE;

-- ==================== RLS POLICIES ====================

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_orders_own_rows" ON delivery_orders;
CREATE POLICY "delivery_orders_own_rows" ON delivery_orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_delivery_logs_own_rows" ON food_delivery_logs;
CREATE POLICY "food_delivery_logs_own_rows" ON food_delivery_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "grocery_delivery_logs_own_rows" ON grocery_delivery_logs;
CREATE POLICY "grocery_delivery_logs_own_rows" ON grocery_delivery_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ride_bookings_own_rows" ON ride_bookings;
CREATE POLICY "ride_bookings_own_rows" ON ride_bookings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_points_own_rows" ON user_points;
CREATE POLICY "user_points_own_rows" ON user_points FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "points_events_own_rows" ON points_events;
CREATE POLICY "points_events_own_rows" ON points_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_own_rows" ON user_badges;
CREATE POLICY "user_badges_own_rows" ON user_badges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_own_rows" ON streaks;
CREATE POLICY "streaks_own_rows" ON streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenges_own_rows" ON challenges;
CREATE POLICY "challenges_own_rows" ON challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "smart_alerts_own_rows" ON smart_alerts;
CREATE POLICY "smart_alerts_own_rows" ON smart_alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==================== UPDATED_AT TRIGGERS ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_delivery_orders_updated_at ON delivery_orders;
CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_food_delivery_logs_updated_at ON food_delivery_logs;
CREATE TRIGGER update_food_delivery_logs_updated_at BEFORE UPDATE ON food_delivery_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grocery_delivery_logs_updated_at ON grocery_delivery_logs;
CREATE TRIGGER update_grocery_delivery_logs_updated_at BEFORE UPDATE ON grocery_delivery_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ride_bookings_updated_at ON ride_bookings;
CREATE TRIGGER update_ride_bookings_updated_at BEFORE UPDATE ON ride_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points;
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON user_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_streaks_updated_at ON streaks;
CREATE TRIGGER update_streaks_updated_at BEFORE UPDATE ON streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_challenges_updated_at ON challenges;
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== SEED DATA TRIGGERS ====================

CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_points (user_id, total_points, level, points_to_next_level)
  VALUES (NEW.id, 0, 1, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_points ON profiles;
CREATE TRIGGER on_profile_created_points AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

CREATE OR REPLACE FUNCTION handle_new_user_streaks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streaks (user_id, streak_type, current_count, best_count)
  VALUES
    (NEW.id, 'daily_log', 0, 0),
    (NEW.id, 'weekly_goal', 0, 0),
    (NEW.id, 'monthly_challenge', 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_streaks ON profiles;
CREATE TRIGGER on_profile_created_streaks AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION handle_new_user_streaks();

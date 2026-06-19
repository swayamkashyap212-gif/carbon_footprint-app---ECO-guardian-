-- ============================================================
-- COMPLETE AUTH FIX FOR ECOGUARDIAN AI
-- Run this ENTIRE script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dswkqwvvovhzfyminmfg/sql/new
-- ============================================================

-- STEP 0: Clean slate — drop ALL existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_points ON profiles;
DROP TRIGGER IF EXISTS on_profile_created_streaks ON profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_points() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_streaks() CASCADE;

-- ============================================================
-- STEP 1: Fix profiles table — ensure correct columns exist
-- ============================================================
-- Add phone_number column if it doesn't exist (some tables use phone, some phone_number)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
    ALTER TABLE profiles ADD COLUMN phone_number TEXT;
    -- Copy data from phone column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
      UPDATE profiles SET phone_number = phone WHERE phone_number IS NULL;
    END IF;
  END IF;
END $$;

-- Add phone column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone_number') THEN
      UPDATE profiles SET phone = phone_number WHERE phone IS NULL;
    END IF;
  END IF;
END $$;

-- Ensure other columns exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'region') THEN
    ALTER TABLE profiles ADD COLUMN region TEXT DEFAULT 'india';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ============================================================
-- STEP 2: Ensure users table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  auth_provider TEXT DEFAULT 'supabase',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- STEP 3: Ensure user_points table exists
-- ============================================================
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

-- ============================================================
-- STEP 4: Ensure streaks table exists
-- ============================================================
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  best_count INTEGER NOT NULL DEFAULT 0,
  last_entry_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 5: Enable RLS on all tables
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 6: Create RLS policies (safe — drop first)
-- ============================================================
DROP POLICY IF EXISTS "profiles_own_rows" ON profiles;
CREATE POLICY "profiles_own_rows" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_service" ON profiles;
CREATE POLICY "profiles_insert_service" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_own_rows" ON users;
CREATE POLICY "users_own_rows" ON users FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "user_points_own_rows" ON user_points;
CREATE POLICY "user_points_own_rows" ON user_points FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_points_insert_service" ON user_points;
CREATE POLICY "user_points_insert_service" ON user_points FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_own_rows" ON streaks;
CREATE POLICY "streaks_own_rows" ON streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "streaks_insert_service" ON streaks;
CREATE POLICY "streaks_insert_service" ON streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STEP 7: Create handle_new_user() — EXCEPTION-SAFE
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into users table (safe)
  BEGIN
    INSERT INTO public.users (id, email, phone, auth_provider)
    VALUES (NEW.id, NEW.email, NEW.phone, COALESCE(NEW.raw_app_meta_data->>'provider', 'supabase'))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'users insert skipped: %', SQLERRM;
  END;

  -- Insert into profiles table (safe) — handles both 'phone' and 'phone_number' columns
  BEGIN
    INSERT INTO public.profiles (id, phone, full_name)
    VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'full_name', 'EcoGuardian User'))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'profiles insert skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 8: Create handle_new_user_points() — EXCEPTION-SAFE
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_points (user_id, total_points, level, points_to_next_level)
  VALUES (NEW.id, 0, 1, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'user_points seed skipped: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 9: Create handle_new_user_streaks() — EXCEPTION-SAFE
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user_streaks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO streaks (user_id, streak_type, current_count, best_count)
  VALUES
    (NEW.id, 'daily_log', 0, 0),
    (NEW.id, 'weekly_goal', 0, 0),
    (NEW.id, 'monthly_challenge', 0, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'streaks seed skipped: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 10: Create all triggers
-- ============================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER on_profile_created_points
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

CREATE TRIGGER on_profile_created_streaks
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_streaks();

-- ============================================================
-- DONE! Now also configure Supabase Dashboard settings below.
-- ============================================================

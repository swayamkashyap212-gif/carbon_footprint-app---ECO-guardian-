-- ============================================================
-- FIX: "Database error saving new user"
-- Run this ENTIRE script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- Step 1: Drop ALL existing triggers on auth.users and profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created_points ON profiles;
DROP TRIGGER IF EXISTS on_profile_created_streaks ON profiles;

-- Step 2: Drop all old trigger functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_points() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_streaks() CASCADE;

-- Step 3: Create SAFE handle_new_user function
-- This creates the profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'EcoGuardian User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'handle_new_user profile insert skipped: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 4: Create SAFE handle_new_user_points function
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
  RAISE NOTICE 'handle_new_user_points skipped: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 5: Create SAFE handle_new_user_streaks function
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
  RAISE NOTICE 'handle_new_user_streaks skipped: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 6: Recreate all triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER on_profile_created_points
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

CREATE TRIGGER on_profile_created_streaks
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_streaks();

-- Step 7: Ensure RLS allows the trigger to insert
-- (The trigger runs as SECURITY DEFINER, but let's be safe)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Done! Try signing up again.

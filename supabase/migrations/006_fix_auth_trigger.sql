-- FIX: "Database error saving new user" 
-- The trigger chain auth.users → profiles → user_points/streaks fails and rolls back signup.
-- This migration makes all triggers safe by catching exceptions.

-- 1. Replace handle_new_user() with exception-safe version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try inserting into users table (may not exist)
  BEGIN
    INSERT INTO public.users (id, email, phone, auth_provider)
    VALUES (NEW.id, NEW.email, NEW.phone, COALESCE(NEW.raw_app_meta_data->>'provider', 'supabase'))
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'users insert skipped: %', SQLERRM;
  END;

  -- Try inserting into profiles table
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

-- 2. Replace handle_new_user_points() with exception-safe version
CREATE OR REPLACE FUNCTION handle_new_user_points()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_points (user_id, total_points, level, points_to_next_level)
  VALUES (NEW.id, 0, 1, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'user_points seed skipped: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace handle_new_user_streaks() with exception-safe version
CREATE OR REPLACE FUNCTION handle_new_user_streaks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO streaks (user_id, streak_type, current_count, best_count)
  VALUES
    (NEW.id, 'daily_log', 0, 0),
    (NEW.id, 'weekly_goal', 0, 0),
    (NEW.id, 'monthly_challenge', 0, 0)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'streaks seed skipped: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate triggers to ensure they reference the updated functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_profile_created_points ON profiles;
CREATE TRIGGER on_profile_created_points
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_points();

DROP TRIGGER IF EXISTS on_profile_created_streaks ON profiles;
CREATE TRIGGER on_profile_created_streaks
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_streaks();

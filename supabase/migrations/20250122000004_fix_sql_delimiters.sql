-- Fix function delimiters from $ to $$
-- This migration corrects syntax errors in function definitions

-- Drop and recreate find_nearby_helpers with correct delimiter
DROP FUNCTION IF EXISTS find_nearby_helpers(NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION find_nearby_helpers(
  lat NUMERIC,
  lng NUMERIC,
  radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  helper_id UUID,
  name TEXT,
  user_type VARCHAR(20),
  distance_km NUMERIC,
  phone TEXT,
  notification_preferences JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.user_type,
    ROUND(ST_Distance(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000, 2) as distance_km,
    p.phone,
    p.notification_preferences
  FROM profiles p
  WHERE 
    p.user_type IN ('volunteer', 'ngo')
    AND p.is_active = true
    AND p.verification->>'status' = 'approved'
    AND ST_DWithin(
      p.current_location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate calculate_distance with correct delimiter
DROP FUNCTION IF EXISTS calculate_distance(NUMERIC, NUMERIC, NUMERIC, NUMERIC);
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 NUMERIC,
  lng1 NUMERIC,
  lat2 NUMERIC,
  lng2 NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(ST_Distance(
    ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
  ) / 1000, 2);
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate update_updated_at_column with correct delimiter
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Drop and recreate handle_new_user with correct delimiter and conflict handling
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, phone, name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'reporter')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Drop and recreate update_case_last_status with correct delimiter
DROP FUNCTION IF EXISTS update_case_last_status() CASCADE;
CREATE OR REPLACE FUNCTION update_case_last_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cases
  SET 
    last_status_update = NEW.timestamp,
    next_reminder_due = NEW.timestamp + INTERVAL '24 hours',
    reminder_sent = false,
    status = NEW.new_status
  WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_status_update_created ON status_updates;
CREATE TRIGGER on_status_update_created
  AFTER INSERT ON status_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_case_last_status();

-- Add missing PostGIS location functions and service area management

-- Function to check if a point is within a helper's service area
CREATE OR REPLACE FUNCTION is_within_service_area(
  helper_id UUID,
  lat NUMERIC,
  lng NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  is_within BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM service_areas sa
    WHERE 
      sa.helper_id = is_within_service_area.helper_id
      AND sa.is_active = true
      AND ST_DWithin(
        sa.center_point,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        sa.radius_km * 1000
      )
  ) INTO is_within;
  
  RETURN is_within;
END;
$$ LANGUAGE plpgsql;

-- Function to find helpers within service areas for a location
CREATE OR REPLACE FUNCTION find_helpers_by_service_area(
  lat NUMERIC,
  lng NUMERIC
)
RETURNS TABLE (
  helper_id UUID,
  name TEXT,
  user_type VARCHAR(20),
  distance_km NUMERIC,
  phone TEXT,
  notification_preferences JSONB,
  service_area_id UUID,
  city TEXT,
  state TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.user_type,
    ROUND(ST_Distance(
      sa.center_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) / 1000, 2) as distance_km,
    p.phone,
    p.notification_preferences,
    sa.id as service_area_id,
    sa.city,
    sa.state
  FROM service_areas sa
  JOIN profiles p ON p.id = sa.helper_id
  WHERE 
    sa.is_active = true
    AND p.is_active = true
    AND p.user_type IN ('volunteer', 'ngo')
    AND p.verification->>'status' = 'approved'
    AND ST_DWithin(
      sa.center_point,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      sa.radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all service areas for a helper
CREATE OR REPLACE FUNCTION get_helper_service_areas(
  p_helper_id UUID
)
RETURNS TABLE (
  id UUID,
  center_lat NUMERIC,
  center_lng NUMERIC,
  radius_km NUMERIC,
  city TEXT,
  state TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    ST_Y(sa.center_point::geometry) as center_lat,
    ST_X(sa.center_point::geometry) as center_lng,
    sa.radius_km,
    sa.city,
    sa.state,
    sa.is_active,
    sa.created_at
  FROM service_areas sa
  WHERE sa.helper_id = p_helper_id
  ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to add or update a service area
CREATE OR REPLACE FUNCTION upsert_service_area(
  p_helper_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC,
  p_city TEXT,
  p_state TEXT
)
RETURNS UUID AS $$
DECLARE
  v_service_area_id UUID;
BEGIN
  INSERT INTO service_areas (
    helper_id,
    center_point,
    radius_km,
    city,
    state,
    is_active
  ) VALUES (
    p_helper_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radius_km,
    p_city,
    p_state,
    true
  )
  RETURNING id INTO v_service_area_id;
  
  RETURN v_service_area_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update helper's current location
CREATE OR REPLACE FUNCTION update_helper_location(
  p_helper_id UUID,
  p_lat NUMERIC,
  p_lng NUMERIC
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET 
    current_location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    location_updated_at = NOW()
  WHERE id = p_helper_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get distance from a case to a helper
CREATE OR REPLACE FUNCTION get_case_helper_distance(
  p_case_id UUID,
  p_helper_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_distance NUMERIC;
BEGIN
  SELECT ROUND(ST_Distance(
    c.location_point,
    p.current_location
  ) / 1000, 2)
  INTO v_distance
  FROM cases c
  CROSS JOIN profiles p
  WHERE c.id = p_case_id
    AND p.id = p_helper_id;
  
  RETURN v_distance;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest cases for a helper
CREATE OR REPLACE FUNCTION find_nearby_cases(
  p_helper_id UUID,
  p_radius_km NUMERIC DEFAULT 10,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  case_id UUID,
  animal_type VARCHAR(50),
  condition VARCHAR(100),
  status VARCHAR(20),
  urgency_level VARCHAR(20),
  distance_km NUMERIC,
  location_address TEXT,
  location_landmarks TEXT,
  created_at TIMESTAMPTZ,
  photos TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.animal_type,
    c.condition,
    c.status,
    c.urgency_level,
    ROUND(ST_Distance(
      c.location_point,
      p.current_location
    ) / 1000, 2) as distance_km,
    c.location_address,
    c.location_landmarks,
    c.created_at,
    c.photos
  FROM cases c
  CROSS JOIN profiles p
  WHERE p.id = p_helper_id
    AND c.status IN ('open', 'assigned')
    AND c.location_point IS NOT NULL
    AND p.current_location IS NOT NULL
    AND ST_DWithin(
      c.location_point,
      p.current_location,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate a service area
CREATE OR REPLACE FUNCTION deactivate_service_area(
  p_service_area_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE service_areas
  SET is_active = false
  WHERE id = p_service_area_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to activate a service area
CREATE OR REPLACE FUNCTION activate_service_area(
  p_service_area_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE service_areas
  SET is_active = true
  WHERE id = p_service_area_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get statistics about service coverage in an area
CREATE OR REPLACE FUNCTION get_area_coverage_stats(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 10
)
RETURNS TABLE (
  total_helpers INTEGER,
  volunteers INTEGER,
  ngos INTEGER,
  avg_distance_km NUMERIC,
  closest_helper_distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_helpers,
    COUNT(*) FILTER (WHERE p.user_type = 'volunteer')::INTEGER as volunteers,
    COUNT(*) FILTER (WHERE p.user_type = 'ngo')::INTEGER as ngos,
    ROUND(AVG(ST_Distance(
      p.current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000), 2) as avg_distance_km,
    ROUND(MIN(ST_Distance(
      p.current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000), 2) as closest_helper_distance_km
  FROM profiles p
  WHERE 
    p.user_type IN ('volunteer', 'ngo')
    AND p.is_active = true
    AND p.verification->>'status' = 'approved'
    AND p.current_location IS NOT NULL
    AND ST_DWithin(
      p.current_location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    );
END;
$$ LANGUAGE plpgsql;

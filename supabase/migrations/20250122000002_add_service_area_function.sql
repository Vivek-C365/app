-- Add is_within_service_area function for checking if a point is within a helper's service area
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

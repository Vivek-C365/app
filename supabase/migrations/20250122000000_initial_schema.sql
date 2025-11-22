-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('reporter', 'volunteer', 'ngo', 'admin')),
  
  -- Profile information
  organization TEXT,
  animal_types TEXT[] DEFAULT '{}',
  
  -- Verification stored as JSONB
  verification JSONB DEFAULT '{
    "status": "not_submitted",
    "documents": {},
    "submittedAt": null,
    "reviewedAt": null,
    "reviewNotes": null
  }'::jsonb,
  
  -- Notification preferences as JSONB
  notification_preferences JSONB DEFAULT '{
    "whatsapp": true,
    "email": true,
    "push": true,
    "radius": 10
  }'::jsonb,
  
  -- Current location using PostGIS
  current_location GEOGRAPHY(POINT, 4326),
  location_updated_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  CONSTRAINT valid_verification CHECK (verification->>'status' IN ('not_submitted', 'pending', 'approved', 'rejected'))
);

-- Cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  animal_type VARCHAR(50) NOT NULL,
  condition VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  
  -- Location using PostGIS geometry type
  location_point GEOGRAPHY(POINT, 4326),
  location_address TEXT,
  location_landmarks TEXT NOT NULL,
  location_description TEXT NOT NULL,
  location_is_approximate BOOLEAN DEFAULT false,
  location_nearest_place TEXT,
  location_directions TEXT,
  
  -- Contact info stored as JSONB
  contact_info JSONB NOT NULL,
  
  -- Photos stored as array of storage URLs
  photos TEXT[] DEFAULT '{}',
  
  -- Status and workflow
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  urgency_level VARCHAR(20) DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_status_update TIMESTAMPTZ DEFAULT NOW(),
  next_reminder_due TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  
  CONSTRAINT valid_contact_info CHECK (contact_info ? 'phone')
);

-- Service Areas table
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  helper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Location using PostGIS
  center_point GEOGRAPHY(POINT, 4326) NOT NULL,
  radius_km NUMERIC(5,2) NOT NULL,
  
  -- Geographic info
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_radius CHECK (radius_km > 0)
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'status_update', 'system')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read_by UUID[] DEFAULT '{}',
  
  CONSTRAINT non_empty_content CHECK (LENGTH(content) > 0)
);

-- Status Updates table
CREATE TABLE status_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES profiles(id),
  
  previous_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  condition VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  
  -- Photos (minimum 2 required)
  photos TEXT[] NOT NULL,
  
  -- Current location if animal moved
  current_location GEOGRAPHY(POINT, 4326),
  current_address TEXT,
  
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_scheduled BOOLEAN DEFAULT false,
  
  treatment_provided TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  
  CONSTRAINT minimum_photos CHECK (array_length(photos, 1) >= 2),
  CONSTRAINT non_empty_description CHECK (LENGTH(description) >= 50)
);

-- Case Assignments table (Junction Table)
CREATE TABLE case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  
  UNIQUE(case_id, helper_id)
);

-- Verification Documents table
CREATE TABLE verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'registration_certificate', 
    'location_proof', 
    'authorization_letter',
    'government_id',
    'photo',
    'address_proof'
  )),
  
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_profiles_location ON profiles USING GIST(current_location);
CREATE INDEX idx_profiles_verification_status ON profiles((verification->>'status'));

CREATE INDEX idx_cases_location ON cases USING GIST(location_point);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_cases_reporter ON cases(reporter_id);

CREATE INDEX idx_service_areas_helper ON service_areas(helper_id);
CREATE INDEX idx_service_areas_location ON service_areas USING GIST(center_point);
CREATE INDEX idx_service_areas_active ON service_areas(is_active) WHERE is_active = true;

CREATE INDEX idx_messages_case ON messages(case_id, timestamp DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);

CREATE INDEX idx_status_updates_case ON status_updates(case_id, timestamp DESC);
CREATE INDEX idx_status_updates_user ON status_updates(updated_by);

CREATE INDEX idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX idx_case_assignments_helper ON case_assignments(helper_id);

CREATE INDEX idx_verification_docs_user ON verification_documents(user_id);
CREATE INDEX idx_verification_docs_status ON verification_documents(verification_status);

-- PostGIS Functions for geospatial queries
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

-- Calculate distance between two points
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

-- Database Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Automatically create profile when user signs up
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update last_status_update when status update is added
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

CREATE TRIGGER on_status_update_created
  AFTER INSERT ON status_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_case_last_status();

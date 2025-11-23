-- Add AI assistance tracking fields to cases table
-- Migration: Add AI assistance fields

-- Add columns for AI assistance tracking
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS ai_assistance_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_assistance_activated_at TIMESTAMPTZ;

-- Add index for querying AI-assisted cases
CREATE INDEX IF NOT EXISTS idx_cases_ai_assistance 
ON cases(ai_assistance_activated) 
WHERE ai_assistance_activated = true;

-- Add comment for documentation
COMMENT ON COLUMN cases.ai_assistance_activated IS 'Indicates if AI emergency assistance was activated for this case';
COMMENT ON COLUMN cases.ai_assistance_activated_at IS 'Timestamp when AI assistance was activated';

-- Create function to automatically activate AI assistance after timeout
CREATE OR REPLACE FUNCTION check_and_activate_ai_assistance()
RETURNS void AS $$
DECLARE
  timeout_case RECORD;
  daytime_timeout INTERVAL := '15 minutes';
  nighttime_timeout INTERVAL := '30 minutes';
  current_hour INTEGER;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW());
  
  -- Find cases that need AI assistance
  FOR timeout_case IN
    SELECT c.id, c.created_at, c.animal_type, c.urgency_level
    FROM cases c
    LEFT JOIN case_assignments ca ON ca.case_id = c.id AND ca.status = 'accepted'
    WHERE c.status = 'open'
    AND c.ai_assistance_activated = false
    AND ca.id IS NULL  -- No accepted assignments
    AND (
      -- Daytime timeout (6 AM - 10 PM)
      (current_hour >= 6 AND current_hour < 22 AND c.created_at < NOW() - daytime_timeout)
      OR
      -- Nighttime timeout (10 PM - 6 AM)
      ((current_hour >= 22 OR current_hour < 6) AND c.created_at < NOW() - nighttime_timeout)
      OR
      -- Critical cases get immediate AI assistance after 5 minutes
      (c.urgency_level = 'critical' AND c.created_at < NOW() - INTERVAL '5 minutes')
    )
  LOOP
    -- Activate AI assistance
    UPDATE cases
    SET 
      ai_assistance_activated = true,
      ai_assistance_activated_at = NOW()
    WHERE id = timeout_case.id;
    
    -- Log activation
    RAISE NOTICE 'AI assistance activated for case %', timeout_case.id;
    
    -- TODO: Trigger notification to reporter about AI assistance
    -- This will be handled by the notification system
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to check for cases needing AI assistance
-- This runs every 5 minutes
SELECT cron.schedule(
  'check-ai-assistance-activation',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT check_and_activate_ai_assistance();
  $$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_and_activate_ai_assistance() TO postgres;
GRANT EXECUTE ON FUNCTION check_and_activate_ai_assistance() TO service_role;

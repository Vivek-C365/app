-- Status Reminder System with pg_cron
-- This migration sets up automated status update reminders and escalation

-- Function to check and send status reminders
CREATE OR REPLACE FUNCTION check_and_send_status_reminders()
RETURNS void AS $
DECLARE
  overdue_case RECORD;
  hours_overdue NUMERIC;
BEGIN
  -- Loop through all cases that need reminders
  FOR overdue_case IN
    SELECT 
      c.id as case_id,
      c.reporter_id,
      c.animal_type,
      c.condition,
      c.last_status_update,
      c.next_reminder_due,
      c.reminder_sent,
      ca.helper_id,
      p.name as helper_name,
      p.phone as helper_phone,
      p.email as helper_email,
      p.notification_preferences,
      EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 as hours_since_update
    FROM cases c
    JOIN case_assignments ca ON ca.case_id = c.id AND ca.status = 'accepted'
    JOIN profiles p ON p.id = ca.helper_id
    WHERE c.status IN ('assigned', 'in_progress')
    AND c.next_reminder_due <= NOW()
    AND c.reminder_sent = false
  LOOP
    hours_overdue := overdue_case.hours_since_update;
    
    -- Determine escalation level based on hours overdue
    IF hours_overdue >= 48 THEN
      -- 48+ hours: Critical escalation - reassign case
      PERFORM escalate_overdue_case(
        overdue_case.case_id,
        overdue_case.helper_id,
        'critical'
      );
    ELSIF hours_overdue >= 36 THEN
      -- 36+ hours: High escalation - notify admin and reporter
      PERFORM send_escalation_notification(
        overdue_case.case_id,
        overdue_case.helper_id,
        overdue_case.reporter_id,
        'high'
      );
    ELSIF hours_overdue >= 28 THEN
      -- 28+ hours: Medium escalation - notify reporter
      PERFORM send_escalation_notification(
        overdue_case.case_id,
        overdue_case.helper_id,
        overdue_case.reporter_id,
        'medium'
      );
    ELSIF hours_overdue >= 24 THEN
      -- 24+ hours: Normal reminder
      PERFORM send_status_reminder(
        overdue_case.case_id,
        overdue_case.helper_id,
        overdue_case.helper_phone,
        overdue_case.helper_email,
        overdue_case.notification_preferences
      );
    END IF;
    
    -- Mark reminder as sent
    UPDATE cases 
    SET reminder_sent = true 
    WHERE id = overdue_case.case_id;
  END LOOP;
END;
$ LANGUAGE plpgsql;

-- Function to send status reminder via Edge Function
CREATE OR REPLACE FUNCTION send_status_reminder(
  p_case_id UUID,
  p_helper_id UUID,
  p_phone TEXT,
  p_email TEXT,
  p_preferences JSONB
)
RETURNS void AS $
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get Supabase configuration from environment
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  -- Call Edge Function to send reminder notification
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'caseId', p_case_id,
      'helperId', p_helper_id,
      'phone', p_phone,
      'email', p_email,
      'preferences', p_preferences,
      'escalationLevel', 'normal'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the entire process
    RAISE WARNING 'Failed to send reminder for case %: %', p_case_id, SQLERRM;
END;
$ LANGUAGE plpgsql;

-- Function to send escalation notifications
CREATE OR REPLACE FUNCTION send_escalation_notification(
  p_case_id UUID,
  p_helper_id UUID,
  p_reporter_id UUID,
  p_escalation_level TEXT
)
RETURNS void AS $
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  -- Call Edge Function for escalation
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'caseId', p_case_id,
      'helperId', p_helper_id,
      'reporterId', p_reporter_id,
      'escalationLevel', p_escalation_level
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send escalation for case %: %', p_case_id, SQLERRM;
END;
$ LANGUAGE plpgsql;

-- Function to escalate and reassign overdue cases
CREATE OR REPLACE FUNCTION escalate_overdue_case(
  p_case_id UUID,
  p_current_helper_id UUID,
  p_escalation_level TEXT
)
RETURNS void AS $
DECLARE
  v_case_location GEOGRAPHY;
  v_new_helper_id UUID;
BEGIN
  -- Get case location
  SELECT location_point INTO v_case_location
  FROM cases
  WHERE id = p_case_id;
  
  -- Find alternative helper nearby (excluding current helper)
  SELECT helper_id INTO v_new_helper_id
  FROM (
    SELECT 
      p.id as helper_id,
      ST_Distance(p.current_location, v_case_location) as distance
    FROM profiles p
    WHERE p.user_type IN ('volunteer', 'ngo')
    AND p.is_active = true
    AND p.verification->>'status' = 'approved'
    AND p.id != p_current_helper_id
    AND ST_DWithin(p.current_location, v_case_location, 20000) -- 20km radius
    ORDER BY distance ASC
    LIMIT 1
  ) nearby_helpers;
  
  IF v_new_helper_id IS NOT NULL THEN
    -- Mark current assignment as declined
    UPDATE case_assignments
    SET status = 'declined'
    WHERE case_id = p_case_id AND helper_id = p_current_helper_id;
    
    -- Create new assignment
    INSERT INTO case_assignments (case_id, helper_id, status)
    VALUES (p_case_id, v_new_helper_id, 'pending');
    
    -- Reset reminder tracking
    UPDATE cases
    SET 
      reminder_sent = false,
      next_reminder_due = NOW() + INTERVAL '24 hours'
    WHERE id = p_case_id;
    
    -- Send notification to new helper
    PERFORM send_case_reassignment_notification(
      p_case_id,
      v_new_helper_id,
      p_current_helper_id
    );
  ELSE
    -- No alternative helper found, notify admin
    PERFORM send_admin_alert(p_case_id, 'no_helpers_available');
  END IF;
END;
$ LANGUAGE plpgsql;

-- Function to send case reassignment notification
CREATE OR REPLACE FUNCTION send_case_reassignment_notification(
  p_case_id UUID,
  p_new_helper_id UUID,
  p_old_helper_id UUID
)
RETURNS void AS $
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'type', 'case_reassignment',
      'caseId', p_case_id,
      'newHelperId', p_new_helper_id,
      'oldHelperId', p_old_helper_id
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send reassignment notification: %', SQLERRM;
END;
$ LANGUAGE plpgsql;

-- Function to send admin alerts
CREATE OR REPLACE FUNCTION send_admin_alert(
  p_case_id UUID,
  p_alert_type TEXT
)
RETURNS void AS $
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_role_key := current_setting('app.service_role_key', true);
  
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'type', 'admin_alert',
      'caseId', p_case_id,
      'alertType', p_alert_type
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send admin alert: %', SQLERRM;
END;
$ LANGUAGE plpgsql;

-- Schedule pg_cron job to check for overdue status updates every hour
-- Note: This requires pg_cron extension and proper permissions
-- The job will run at the start of every hour
SELECT cron.schedule(
  'check-status-reminders',
  '0 * * * *', -- Every hour at minute 0
  $
  SELECT check_and_send_status_reminders();
  $
);

-- Create a view for monitoring overdue cases
CREATE OR REPLACE VIEW overdue_cases_monitor AS
SELECT 
  c.id as case_id,
  c.animal_type,
  c.status,
  c.last_status_update,
  c.next_reminder_due,
  c.reminder_sent,
  EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 as hours_since_update,
  ca.helper_id,
  p.name as helper_name,
  p.phone as helper_phone,
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 >= 48 THEN 'critical'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 >= 36 THEN 'high'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 >= 28 THEN 'medium'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 >= 24 THEN 'normal'
    ELSE 'on_time'
  END as escalation_level
FROM cases c
LEFT JOIN case_assignments ca ON ca.case_id = c.id AND ca.status = 'accepted'
LEFT JOIN profiles p ON p.id = ca.helper_id
WHERE c.status IN ('assigned', 'in_progress')
ORDER BY c.last_status_update ASC;

-- Grant necessary permissions
GRANT SELECT ON overdue_cases_monitor TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION check_and_send_status_reminders() IS 
'Checks for overdue status updates and sends reminders or escalations based on time elapsed. 
Runs hourly via pg_cron. Escalation levels: 24h=normal, 28h=medium, 36h=high, 48h=critical (reassignment)';

COMMENT ON VIEW overdue_cases_monitor IS 
'Monitoring view for tracking overdue status updates with escalation levels';

-- Management script for pg_cron jobs
-- Use this script to view, manage, and troubleshoot scheduled jobs

-- ============================================
-- VIEW SCHEDULED JOBS
-- ============================================

-- List all active cron jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
ORDER BY jobname;

-- ============================================
-- VIEW JOB EXECUTION HISTORY
-- ============================================

-- View recent job runs (last 24 hours)
SELECT 
  j.jobname,
  jrd.runid,
  jrd.job_pid,
  jrd.database,
  jrd.username,
  jrd.command,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.end_time,
  EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time)) as duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.start_time > NOW() - INTERVAL '24 hours'
ORDER BY jrd.start_time DESC;

-- View failed job runs
SELECT 
  j.jobname,
  jrd.status,
  jrd.return_message,
  jrd.start_time,
  jrd.command
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.status = 'failed'
ORDER BY jrd.start_time DESC
LIMIT 20;

-- ============================================
-- MANAGE JOBS
-- ============================================

-- Manually trigger status reminder check (for testing)
-- SELECT check_and_send_status_reminders();

-- Manually trigger notification cleanup (for testing)
-- SELECT cleanup_expired_notifications();

-- Unschedule a job (uncomment to use)
-- SELECT cron.unschedule('check-status-reminders');
-- SELECT cron.unschedule('cleanup-expired-notifications');

-- Reschedule status reminder check (if needed)
-- First unschedule, then reschedule
/*
SELECT cron.unschedule('check-status-reminders');
SELECT cron.schedule(
  'check-status-reminders',
  '0 * * * *',
  $$SELECT check_and_send_status_reminders();$$
);
*/

-- Reschedule notification cleanup (if needed)
/*
SELECT cron.unschedule('cleanup-expired-notifications');
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 2 * * *',
  $$SELECT cleanup_expired_notifications();$$
);
*/

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check cases that will trigger reminders in next hour
SELECT 
  c.id,
  c.animal_type,
  c.status,
  c.last_status_update,
  c.next_reminder_due,
  c.reminder_sent,
  EXTRACT(EPOCH FROM (NOW() - c.last_status_update)) / 3600 as hours_since_update,
  EXTRACT(EPOCH FROM (c.next_reminder_due - NOW())) / 60 as minutes_until_reminder
FROM cases c
WHERE c.status IN ('assigned', 'in_progress')
AND c.next_reminder_due BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
AND c.reminder_sent = false
ORDER BY c.next_reminder_due ASC;

-- Check overdue cases by escalation level
SELECT 
  escalation_level,
  COUNT(*) as case_count,
  AVG(hours_since_update) as avg_hours_overdue
FROM overdue_cases_monitor
GROUP BY escalation_level
ORDER BY 
  CASE escalation_level
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'normal' THEN 4
    WHEN 'on_time' THEN 5
  END;

-- Check notification delivery stats (last 24 hours)
SELECT 
  type,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE push_sent = true) as push_sent,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  AVG(EXTRACT(EPOCH FROM (read_at - sent_at)) / 60) FILTER (WHERE read_at IS NOT NULL) as avg_read_time_minutes
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY total_notifications DESC;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check database configuration for pg_cron
SHOW cron.database_name;

-- Check if functions exist
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition_preview
FROM pg_proc
WHERE proname IN (
  'check_and_send_status_reminders',
  'send_status_reminder',
  'send_escalation_notification',
  'escalate_overdue_case',
  'cleanup_expired_notifications'
)
ORDER BY proname;

-- Check if net extension is available (for http_post)
SELECT * FROM pg_extension WHERE extname = 'http';

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- Average execution time for reminder checks
SELECT 
  j.jobname,
  COUNT(*) as total_runs,
  AVG(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as max_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))) as min_duration_seconds
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname = 'check-status-reminders'
AND jrd.start_time > NOW() - INTERVAL '7 days'
GROUP BY j.jobname;

-- Cases processed per hour
SELECT 
  DATE_TRUNC('hour', jrd.start_time) as hour,
  COUNT(*) as job_runs,
  j.jobname
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE jrd.start_time > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', jrd.start_time), j.jobname
ORDER BY hour DESC;

-- ============================================
-- CLEANUP OPERATIONS
-- ============================================

-- Clean up old job run details (older than 30 days)
-- Uncomment to execute
/*
DELETE FROM cron.job_run_details
WHERE start_time < NOW() - INTERVAL '30 days';
*/

-- Clean up old notifications (older than 30 days)
-- Uncomment to execute
/*
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '30 days';
*/

-- ============================================
-- TESTING HELPERS
-- ============================================

-- Create a test case with overdue status update
/*
INSERT INTO cases (
  reporter_id,
  animal_type,
  condition,
  description,
  location_landmarks,
  location_description,
  contact_info,
  status,
  last_status_update,
  next_reminder_due,
  reminder_sent
) VALUES (
  (SELECT id FROM profiles WHERE user_type = 'reporter' LIMIT 1),
  'Dog',
  'Injured',
  'Test case for reminder system',
  'Near test location',
  'Test description',
  '{"phone": "+919999999999"}'::jsonb,
  'assigned',
  NOW() - INTERVAL '25 hours',
  NOW() - INTERVAL '1 hour',
  false
);
*/

-- Reset reminder status for testing
/*
UPDATE cases
SET 
  reminder_sent = false,
  next_reminder_due = NOW() - INTERVAL '1 hour'
WHERE id = 'your-test-case-id';
*/

-- ============================================
-- DOCUMENTATION
-- ============================================

-- Cron schedule format reference:
-- ┌───────────── minute (0 - 59)
-- │ ┌───────────── hour (0 - 23)
-- │ │ ┌───────────── day of month (1 - 31)
-- │ │ │ ┌───────────── month (1 - 12)
-- │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
-- │ │ │ │ │
-- * * * * *

-- Examples:
-- '0 * * * *'     - Every hour at minute 0
-- '*/15 * * * *'  - Every 15 minutes
-- '0 2 * * *'     - Every day at 2:00 AM
-- '0 0 * * 0'     - Every Sunday at midnight
-- '0 9-17 * * 1-5' - Every hour from 9 AM to 5 PM, Monday to Friday

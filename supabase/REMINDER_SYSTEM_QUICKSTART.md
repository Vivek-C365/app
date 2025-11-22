# Status Reminder System - Quick Start Guide

## Overview
Automated status update reminder system with escalation and case reassignment.

## Quick Setup

### 1. Apply Database Migrations

```bash
# Apply all migrations
supabase db push

# Or apply specific migrations
supabase migration up
```

### 2. Deploy Edge Function

```bash
# Deploy the send-reminder function
supabase functions deploy send-reminder

# Set environment variables (optional for external services)
supabase secrets set WHATSAPP_API_URL=your-whatsapp-url
supabase secrets set WHATSAPP_API_TOKEN=your-whatsapp-token
supabase secrets set BREVO_API_KEY=your-brevo-key
```

### 3. Configure Supabase Settings

In your Supabase project settings, add these database settings:

```sql
-- Set Supabase URL for Edge Function calls
ALTER DATABASE postgres SET app.supabase_url = 'https://your-project.supabase.co';

-- Set service role key (get from Supabase dashboard)
ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key';
```

### 4. Verify Setup

```sql
-- Check if pg_cron jobs are scheduled
SELECT * FROM cron.job;

-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE '%reminder%' OR proname LIKE '%escalate%';

-- View overdue cases
SELECT * FROM overdue_cases_monitor;
```

## How It Works

### Automatic Process (Every Hour)

```
1. pg_cron runs check_and_send_status_reminders()
2. Function finds cases with next_reminder_due <= NOW()
3. Calculates hours since last update
4. Determines escalation level:
   - 24h: Normal reminder to helper
   - 28h: Reminder to helper + notify reporter
   - 36h: Reminder to helper + notify reporter + alert admin
   - 48h: Reassign case to new helper
5. Calls Edge Function to send notifications
6. Marks reminder as sent
```

### Manual Testing

```sql
-- Create a test case with overdue update
UPDATE cases 
SET 
  last_status_update = NOW() - INTERVAL '25 hours',
  next_reminder_due = NOW() - INTERVAL '1 hour',
  reminder_sent = false
WHERE id = 'your-case-id';

-- Manually trigger the check
SELECT check_and_send_status_reminders();

-- View results
SELECT * FROM notifications 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

## Monitoring

### Check System Health

```sql
-- View overdue cases
SELECT * FROM overdue_cases_monitor;

-- Check recent job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- Check notification delivery
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_read = true) as read
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type;
```

### View Logs

```bash
# View Edge Function logs
supabase functions logs send-reminder

# View recent logs
supabase functions logs send-reminder --tail
```

## Escalation Levels

| Level | Hours | Actions | Recipients |
|-------|-------|---------|------------|
| Normal | 24h | Friendly reminder | Helper only |
| Medium | 28h | Urgent reminder + reporter update | Helper + Reporter |
| High | 36h | Urgent reminder + escalation | Helper + Reporter + Admin |
| Critical | 48h | Case reassignment | Helper + Reporter + Admin + New Helper |

## Troubleshooting

### Jobs Not Running

```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check job status
SELECT * FROM cron.job WHERE jobname = 'check-status-reminders';

-- Check for errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC;
```

### Notifications Not Sending

```sql
-- Check notification records
SELECT * FROM notifications 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check user preferences
SELECT notification_preferences 
FROM profiles 
WHERE id = 'user-id';
```

### Edge Function Errors

```bash
# View function logs
supabase functions logs send-reminder

# Test function locally
supabase functions serve send-reminder

# Test with curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/send-reminder' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"caseId":"test","helperId":"test","escalationLevel":"normal"}'
```

## Configuration

### Change Reminder Schedule

```sql
-- Unschedule existing job
SELECT cron.unschedule('check-status-reminders');

-- Reschedule with new timing (e.g., every 30 minutes)
SELECT cron.schedule(
  'check-status-reminders',
  '*/30 * * * *',
  $$SELECT check_and_send_status_reminders();$$
);
```

### Adjust Escalation Thresholds

Edit the `check_and_send_status_reminders()` function in the migration file:

```sql
-- Change from 24h to 20h for normal reminder
IF hours_overdue >= 20 THEN  -- Changed from 24
  PERFORM send_status_reminder(...);
END IF;
```

### Customize Notification Messages

Edit the Edge Function `supabase/functions/send-reminder/index.ts`:

```typescript
const message = `Your custom message here...`;
```

## Key Files

- `supabase/migrations/20250123000001_status_reminder_system.sql` - Main system
- `supabase/migrations/20250123000002_notifications_table.sql` - Notifications table
- `supabase/functions/send-reminder/index.ts` - Edge Function
- `supabase/scripts/manage-cron-jobs.sql` - Management queries
- `STATUS_REMINDER_SYSTEM.md` - Full documentation

## Support

For detailed documentation, see `STATUS_REMINDER_SYSTEM.md`

For management queries, see `supabase/scripts/manage-cron-jobs.sql`

## Common Commands

```bash
# Deploy everything
supabase db push
supabase functions deploy send-reminder

# View logs
supabase functions logs send-reminder

# Test locally
supabase functions serve send-reminder

# Check database
supabase db execute "SELECT * FROM overdue_cases_monitor;"

# View cron jobs
supabase db execute "SELECT * FROM cron.job;"
```

## Next Steps

1. ✅ Apply migrations
2. ✅ Deploy Edge Function
3. ✅ Configure environment variables
4. ✅ Test with sample case
5. ✅ Monitor first few runs
6. ✅ Adjust thresholds if needed
7. ✅ Set up alerting for failed jobs

## Production Checklist

- [ ] Migrations applied successfully
- [ ] Edge Function deployed
- [ ] Environment variables configured
- [ ] pg_cron jobs scheduled
- [ ] Test case processed successfully
- [ ] Notifications delivered
- [ ] Monitoring dashboard set up
- [ ] Alert system configured
- [ ] Documentation reviewed by team
- [ ] Backup and recovery plan in place

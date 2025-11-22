# Send Reminder Edge Function

## Overview
This Edge Function handles automated status update reminders and escalations for the Animal Rescue Platform. It's called by the PostgreSQL `check_and_send_status_reminders()` function via pg_cron.

## Features
- **Multi-channel notifications**: WhatsApp, Email, Push notifications
- **Escalation levels**: Normal (24h), Medium (28h), High (36h), Critical (48h)
- **Smart routing**: Sends notifications based on user preferences
- **Comprehensive logging**: Tracks success/failure of each notification

## Escalation Workflow

### Normal (24 hours)
- Sends reminder to assigned helper only
- Channels: WhatsApp, Email, Push (based on preferences)
- Message: Friendly reminder to provide update

### Medium (28 hours)
- Sends reminder to helper
- Notifies reporter of delay
- Escalates urgency in messaging

### High (36 hours)
- Sends reminder to helper
- Notifies reporter
- Alerts admin team
- Flags case for review

### Critical (48 hours)
- Notifies helper of reassignment
- Notifies reporter of reassignment
- Case is automatically reassigned to backup helper
- Admin receives critical alert

## Environment Variables

Required:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

Optional (for external services):
- `WHATSAPP_API_URL` - WhatsApp Business API endpoint
- `WHATSAPP_API_TOKEN` - WhatsApp API authentication token
- `BREVO_API_KEY` - Brevo email service API key

## Request Format

```json
{
  "caseId": "uuid",
  "helperId": "uuid",
  "reporterId": "uuid",
  "phone": "+919876543210",
  "email": "helper@example.com",
  "preferences": {
    "whatsapp": true,
    "email": true,
    "push": true
  },
  "escalationLevel": "normal" | "medium" | "high" | "critical"
}
```

## Response Format

```json
{
  "success": true,
  "caseId": "uuid",
  "escalationLevel": "normal",
  "notificationsSent": 3,
  "notificationsFailed": 0
}
```

## Deployment

Deploy using Supabase CLI:

```bash
supabase functions deploy send-reminder
```

## Testing

Test locally:

```bash
supabase functions serve send-reminder
```

Test with curl:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-reminder' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"caseId":"test-uuid","helperId":"test-uuid","escalationLevel":"normal"}'
```

## Integration

This function is automatically called by:
1. PostgreSQL pg_cron job (hourly)
2. `check_and_send_status_reminders()` function
3. Manual admin triggers (future feature)

## Error Handling

- Graceful degradation: If one notification channel fails, others still attempt
- Logging: All errors logged to console for monitoring
- Retry logic: Failed notifications don't block the process
- Fallback: If external services unavailable, creates database notification record

## Monitoring

Monitor function execution:
- Supabase Dashboard → Edge Functions → send-reminder
- Check logs for errors and success rates
- Monitor notification delivery rates
- Track escalation patterns

## Future Enhancements

1. **SMS Integration**: Add Twilio for SMS reminders
2. **Voice Calls**: Automated voice reminders for critical cases
3. **Retry Logic**: Exponential backoff for failed notifications
4. **Rate Limiting**: Prevent notification spam
5. **Analytics**: Track notification effectiveness
6. **A/B Testing**: Optimize message content
7. **Localization**: Multi-language support
8. **Template Management**: Dynamic message templates

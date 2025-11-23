# AI Functions Deployment Guide

## Quick Start

### 1. Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- Google Gemini API key

### 2. Deploy Functions

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy ai-emergency function
supabase functions deploy ai-emergency

# Deploy ai-chat function
supabase functions deploy ai-chat
```

### 3. Set Secrets

```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your-google-gemini-api-key

# Verify secrets
supabase secrets list
```

### 4. Apply Database Migration

```bash
# Push migration to database
supabase db push

# Or apply specific migration
supabase migration up --db-url your-database-url
```

## Testing

### Test AI Emergency Function

#### Activate Emergency
```bash
supabase functions invoke ai-emergency \
  --data '{"caseId":"test-123","action":"activate"}'
```

Expected response:
```json
{
  "success": true,
  "message": "AI emergency assistance activated",
  "activated_at": "2024-01-24T10:00:00.000Z"
}
```

#### Find Facilities
```bash
supabase functions invoke ai-emergency \
  --data '{
    "caseId":"test-123",
    "action":"find_facilities",
    "location":{"latitude":28.6139,"longitude":77.2090},
    "animalType":"dog"
  }'
```

Expected response:
```json
{
  "success": true,
  "facilities": [
    {
      "name": "City Animal Hospital",
      "type": "hospital",
      "specialization": "Emergency Care & Surgery",
      "address": "Near your location",
      "distance": "2.5 km away",
      "hours": "Open 24/7",
      "phone": "1234567890",
      "location": {"latitude": 28.6339, "longitude": 77.2290}
    }
  ],
  "count": 3
}
```

#### Get Emergency Instructions
```bash
supabase functions invoke ai-emergency \
  --data '{
    "caseId":"test-123",
    "action":"emergency_instructions",
    "animalType":"dog",
    "condition":"injured leg, bleeding",
    "photos":[]
  }'
```

Expected response:
```json
{
  "success": true,
  "instructions": [
    {
      "title": "Ensure Safety First",
      "description": "Approach the animal carefully...",
      "warning": "Do not attempt to handle aggressive animals",
      "priority": 1
    }
  ],
  "safetyWarnings": ["Always prioritize your own safety"],
  "urgencyLevel": "medium"
}
```

#### Analyze Photos
```bash
supabase functions invoke ai-emergency \
  --data '{
    "action":"analyze_photos",
    "photos":["https://example.com/photo1.jpg"],
    "animalType":"dog"
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": "Based on the photos provided...",
  "injuryAssessment": {
    "severity": "medium",
    "details": "Professional veterinary examination required..."
  },
  "recommendedActions": [
    "Transport to nearest veterinary hospital immediately"
  ]
}
```

### Test AI Chat Function

```bash
supabase functions invoke ai-chat \
  --data '{
    "caseId":"test-123",
    "message":"How should I help this injured dog?",
    "chatHistory":[]
  }'
```

Expected response:
```json
{
  "success": true,
  "response": "I'm here to help with your dog rescue...",
  "suggestions": [
    "Show me nearby facilities",
    "What immediate care can I provide?",
    "How should I transport the animal?"
  ]
}
```

## Verify Deployment

### Check Function Status
```bash
# List all functions
supabase functions list

# Check function logs
supabase functions logs ai-emergency
supabase functions logs ai-chat
```

### Test from Mobile App

1. Create a test case in the app
2. Wait for AI activation timeout (or manually activate)
3. Navigate to AI Emergency screen
4. Test all tabs:
   - Facilities tab should show nearby facilities
   - Chat tab should respond to messages
   - Instructions tab should show emergency guidance
   - Analysis tab should analyze photos (if available)

## Monitoring

### View Function Logs
```bash
# Real-time logs
supabase functions logs ai-emergency --follow
supabase functions logs ai-chat --follow

# Recent logs
supabase functions logs ai-emergency --limit 50
```

### Check Database
```sql
-- Check AI activation status
SELECT 
  id,
  animal_type,
  ai_assistance_activated,
  ai_assistance_activated_at,
  created_at
FROM cases
WHERE ai_assistance_activated = true
ORDER BY ai_assistance_activated_at DESC
LIMIT 10;

-- Check cron job status
SELECT * FROM cron.job 
WHERE jobname = 'check-ai-assistance-activation';

-- View recent cron runs
SELECT * FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'check-ai-assistance-activation'
)
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Function Not Deploying

1. **Check Supabase CLI version**:
```bash
supabase --version
# Should be v1.0.0 or higher
```

2. **Verify project link**:
```bash
supabase projects list
supabase link --project-ref your-project-ref
```

3. **Check function syntax**:
```bash
# Serve locally to test
supabase functions serve ai-emergency
supabase functions serve ai-chat
```

### Secrets Not Working

1. **List secrets**:
```bash
supabase secrets list
```

2. **Re-set secret**:
```bash
supabase secrets unset GEMINI_API_KEY
supabase secrets set GEMINI_API_KEY=your-new-key
```

3. **Redeploy functions** after setting secrets:
```bash
supabase functions deploy ai-emergency
supabase functions deploy ai-chat
```

### Function Errors

1. **Check logs for errors**:
```bash
supabase functions logs ai-emergency --limit 100
```

2. **Test with curl**:
```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/ai-emergency' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"caseId":"test","action":"activate"}'
```

3. **Verify database migration**:
```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cases' 
AND column_name IN ('ai_assistance_activated', 'ai_assistance_activated_at');
```

### Gemini API Issues

1. **Test API key directly**:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

2. **Check API quota**: Visit [Google AI Studio](https://makersuite.google.com/)

3. **Verify key format**: Should start with `AIza...`

## Production Checklist

- [ ] Functions deployed successfully
- [ ] Secrets configured (GEMINI_API_KEY)
- [ ] Database migration applied
- [ ] Cron job scheduled and running
- [ ] Test all AI actions (activate, facilities, instructions, photos, chat)
- [ ] Verify fallback behavior (without API key)
- [ ] Check function logs for errors
- [ ] Test from mobile app
- [ ] Monitor AI activation timing
- [ ] Set up alerts for function failures

## Performance Optimization

### Function Cold Starts
- First invocation may be slow (cold start)
- Subsequent calls are faster (warm)
- Consider keeping functions warm with periodic pings

### API Rate Limits
- Gemini API has rate limits
- Implement caching for repeated queries
- Use fallback responses when rate limited

### Cost Management
- Monitor Gemini API usage
- Set up billing alerts
- Use fallback responses to reduce API calls
- Cache facility recommendations

## Next Steps

After deployment:

1. **Test thoroughly** with real cases
2. **Monitor logs** for errors
3. **Gather user feedback** on AI responses
4. **Optimize prompts** for better results
5. **Add more fallback data** for common scenarios
6. **Implement caching** for frequently requested data
7. **Set up monitoring** and alerts

## Support Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Google Gemini API Docs](https://ai.google.dev/docs)
- [Deno Documentation](https://deno.land/manual)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)

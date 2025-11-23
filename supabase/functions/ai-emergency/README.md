# AI Emergency Assistance Edge Function

Provides AI-powered emergency assistance using Google Gemini for animal rescue cases.

## Features

- **Emergency Activation**: Marks cases as AI-assisted when no volunteers respond
- **Facility Recommendations**: Finds nearby animal hospitals, clinics, NGOs, and shelters
- **Emergency Instructions**: Provides step-by-step first aid guidance
- **Photo Analysis**: Analyzes animal photos for injury assessment (Gemini Vision)
- **Transportation Options**: Suggests transport methods to facilities

## API Endpoints

### Activate Emergency Assistance
```typescript
POST /functions/v1/ai-emergency
{
  "caseId": "uuid",
  "action": "activate"
}
```

### Find Facilities
```typescript
POST /functions/v1/ai-emergency
{
  "caseId": "uuid",
  "action": "find_facilities",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "animalType": "dog"
}
```

### Get Emergency Instructions
```typescript
POST /functions/v1/ai-emergency
{
  "caseId": "uuid",
  "action": "emergency_instructions",
  "animalType": "dog",
  "condition": "injured leg, bleeding",
  "photos": ["url1", "url2"]
}
```

### Analyze Photos
```typescript
POST /functions/v1/ai-emergency
{
  "action": "analyze_photos",
  "photos": ["url1", "url2"],
  "animalType": "dog"
}
```

### Get Transportation Options
```typescript
POST /functions/v1/ai-emergency
{
  "action": "transportation_options",
  "origin": { "latitude": 28.6139, "longitude": 77.2090 },
  "destination": { "latitude": 28.6200, "longitude": 77.2150 }
}
```

## Environment Variables

Required in Supabase Edge Function secrets:

```bash
GEMINI_API_KEY=your-google-gemini-api-key
```

Set using:
```bash
supabase secrets set GEMINI_API_KEY=your-key
```

## Fallback Behavior

When `GEMINI_API_KEY` is not configured, the function provides:
- Mock facility data based on location
- Generic emergency instructions
- Standard photo analysis responses
- Basic transportation options

This ensures the app remains functional even without AI integration.

## Deployment

```bash
# Deploy the function
supabase functions deploy ai-emergency

# Set the API key
supabase secrets set GEMINI_API_KEY=your-key

# Test the function
supabase functions invoke ai-emergency --data '{"caseId":"test-id","action":"activate"}'
```

## Integration

The mobile app calls this function through `src/services/aiService.js`:

```javascript
import { supabase } from '../config/supabase';

const response = await supabase.functions.invoke('ai-emergency', {
  body: { caseId, action: 'find_facilities', location, animalType }
});
```

## Response Format

All endpoints return:
```typescript
{
  "success": boolean,
  "data": any,
  "error"?: string
}
```

## Error Handling

- Returns 400 for missing required parameters
- Returns 500 for internal errors
- Logs errors to Supabase Edge Function logs
- Provides fallback responses when AI API fails

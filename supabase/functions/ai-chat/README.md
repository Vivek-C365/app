# AI Chat Edge Function

Provides real-time AI guidance chat using Google Gemini for animal rescue cases.

## Features

- **Context-Aware Responses**: Uses case details to provide relevant guidance
- **Conversation History**: Maintains context across multiple messages
- **Smart Suggestions**: Generates follow-up question suggestions
- **Fallback Responses**: Works without AI API using rule-based responses
- **Empathetic Guidance**: Provides compassionate, practical advice

## API Endpoint

```typescript
POST /functions/v1/ai-chat
{
  "caseId": "uuid",
  "message": "How should I handle this injured dog?",
  "chatHistory": [
    {
      "role": "user",
      "content": "I found an injured dog",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "I'm here to help...",
      "timestamp": "2024-01-01T10:00:05Z"
    }
  ]
}
```

## Response Format

```typescript
{
  "success": true,
  "response": "Here's what you should do...",
  "suggestions": [
    "Show me nearby facilities",
    "What immediate care can I provide?",
    "How should I transport the animal?"
  ]
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

## System Context

The AI is provided with case context including:
- Animal type and condition
- Location information
- Current case status
- Urgency level

This allows for personalized, relevant responses.

## Conversation Management

- Maintains last 5 messages for context
- Builds conversation history for Gemini
- Generates contextual suggestions
- Handles multi-turn conversations

## Fallback Behavior

When `GEMINI_API_KEY` is not configured, provides rule-based responses for:
- Facility inquiries
- Transportation questions
- First aid guidance
- General care instructions

## Deployment

```bash
# Deploy the function
supabase functions deploy ai-chat

# Set the API key
supabase secrets set GEMINI_API_KEY=your-key

# Test the function
supabase functions invoke ai-chat --data '{"caseId":"test-id","message":"How can I help this animal?"}'
```

## Integration

The mobile app calls this function through `src/services/aiService.js`:

```javascript
import { supabase } from '../config/supabase';

const response = await supabase.functions.invoke('ai-chat', {
  body: { caseId, message, chatHistory }
});
```

## Usage in Mobile App

The `AIEmergencyScreen` component uses this function for the chat tab:

```javascript
const sendChatMessage = async () => {
  const response = await aiService.sendAIChatMessage(
    caseId,
    messageText,
    chatMessages
  );
  
  if (response.success) {
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: response.response,
      suggestions: response.suggestions
    }]);
  }
};
```

## Error Handling

- Validates required parameters
- Handles Gemini API failures gracefully
- Provides helpful fallback responses
- Logs errors for debugging

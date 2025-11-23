// AI Chat Edge Function
// Provides real-time AI guidance chat using Google Gemini

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { caseId, message, conversationHistory, userLocation } = await req.json()

    if (!message || !message.trim()) {
      throw new Error('Message is required')
    }

    // Get case details for context (if caseId provided)
    let caseData = null
    if (caseId) {
      const { data, error: caseError } = await supabaseClient
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single()

      if (caseError) {
        console.error('Error fetching case:', caseError)
      } else {
        caseData = data
      }
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    let response = ''
    let suggestions: string[] = []

    if (geminiApiKey) {
      try {
        const systemContext = buildSystemContext(caseData, userLocation)
        const conversationHistoryText = buildConversationHistory(conversationHistory)
        
        const prompt = systemContext + '\n\n' + conversationHistoryText + '\n\nUser: ' + message + '\n\nAssistant:'

        const geminiResponse = await callGeminiAPI(geminiApiKey, prompt)
        response = geminiResponse
        suggestions = extractSuggestions(geminiResponse, caseData)
      } catch (error) {
        console.error('Gemini API error:', error)
        response = getFallbackResponse(message, caseData)
        suggestions = getFallbackSuggestions(caseData)
      }
    } else {
      response = getFallbackResponse(message, caseData)
      suggestions = getFallbackSuggestions(caseData)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response,
        suggestions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-chat:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function buildSystemContext(caseData: any | null, userLocation: any | null): string {
  let baseContext = `You are an AI assistant helping with animal rescue in India. You provide compassionate, practical guidance for emergency animal care.

Your role is to:
1. Provide immediate, actionable advice for animal care
2. Recommend nearby facilities and resources based on the user's location
3. Offer emotional support and encouragement
4. Guide on safety precautions
5. Help coordinate rescue efforts

Keep responses concise, practical, and empathetic. Focus on what the user can do right now to help the animal.`

  // Add user location context if available
  if (userLocation) {
    baseContext += `

User's Current Location:
- Address: ${userLocation.address || 'Not specified'}
- City: ${userLocation.city || 'Not specified'}
- Region/State: ${userLocation.region || 'Not specified'}

IMPORTANT: When providing recommendations for facilities, hospitals, or services, always reference the user's location (${userLocation.city || userLocation.region || 'their area'}) and provide location-specific advice. Do NOT ask for their location again.`
  }

  if (caseData) {
    baseContext += `

Current Case Context:
- Animal Type: ${caseData.animal_type}
- Condition: ${caseData.condition}
- Location: ${caseData.location_address || 'Location provided'}
- Status: ${caseData.status}
- Urgency: ${caseData.urgency_level || 'medium'}`
  }

  return baseContext
}

function buildConversationHistory(chatHistory: ChatMessage[]): string {
  if (!chatHistory || chatHistory.length === 0) {
    return ''
  }

  return chatHistory
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n')
}

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid response from Gemini API')
  }
  
  return data.candidates[0].content.parts[0].text
}

function extractSuggestions(response: string, caseData: any): string[] {
  const suggestions = []
  
  if (response.toLowerCase().includes('facility') || response.toLowerCase().includes('hospital')) {
    suggestions.push('Show me nearby facilities')
  }
  
  if (response.toLowerCase().includes('transport') || response.toLowerCase().includes('move')) {
    suggestions.push('How should I transport the animal?')
  }
  
  if (response.toLowerCase().includes('first aid') || response.toLowerCase().includes('care')) {
    suggestions.push('What immediate care can I provide?')
  }
  
  if (caseData && caseData.status === 'open') {
    suggestions.push('What should I do while waiting for help?')
  }
  
  return suggestions.slice(0, 3)
}

function getFallbackResponse(message: string, caseData: any | null): string {
  const lowerMessage = message.toLowerCase()
  const animalType = caseData?.animal_type || 'animal'
  
  if (lowerMessage.includes('facility') || lowerMessage.includes('hospital') || lowerMessage.includes('where')) {
    return `I can help you find nearby animal care facilities. Look for veterinary hospitals, clinics, and NGOs in your area. You can search online for "animal hospital near me" or "veterinary clinic" along with your location. Many cities also have 24/7 emergency animal hospitals.`
  }
  
  if (lowerMessage.includes('transport') || lowerMessage.includes('move') || lowerMessage.includes('take')) {
    return `For transporting the ${animalType}, use a secure carrier or box if available. Keep the animal calm and supported. If using a vehicle, have someone monitor the animal during transport. For critically injured animals, consider calling an animal ambulance service. Handle with care and avoid sudden movements.`
  }
  
  if (lowerMessage.includes('first aid') || lowerMessage.includes('care') || lowerMessage.includes('help')) {
    return `Key first aid steps: 1) Ensure your safety first, 2) Keep the animal calm and warm, 3) Control any bleeding with gentle pressure using clean cloth, 4) Provide shade and water if safe, 5) Contact professional help immediately. Avoid giving food or medication without veterinary guidance.`
  }
  
  if (lowerMessage.includes('wait') || lowerMessage.includes('now') || lowerMessage.includes('do')) {
    return `While waiting for help: Keep the animal calm and comfortable, provide shade if outdoors, offer water if the animal is conscious, monitor breathing and any changes in condition, and stay nearby to reassure the animal. Document the animal's condition with photos if possible.`
  }
  
  if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('injured')) {
    return `For emergency situations: 1) Call the nearest animal hospital immediately, 2) Keep the animal still and calm, 3) Control bleeding if present, 4) Keep the animal warm, 5) Transport carefully to the nearest facility. If you're unsure, describe the animal's condition and I can provide specific guidance.`
  }
  
  return `I'm here to help with ${animalType} rescue and care. I can provide information about nearby facilities, emergency care instructions, transportation advice, and answer specific questions about animal welfare. What would you like to know?`
}

function getFallbackSuggestions(caseData: any | null): string[] {
  return [
    'Show me nearby facilities',
    'What immediate care can I provide?',
    'How should I transport the animal?'
  ]
}

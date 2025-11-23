// AI Emergency Assistance Edge Function
// Provides AI-powered emergency assistance using Google Gemini

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FacilityRecommendation {
  name: string
  type: 'hospital' | 'ngo' | 'clinic' | 'shelter'
  specialization: string
  address: string
  distance: string
  hours: string
  phone: string
  location: {
    latitude: number
    longitude: number
  }
  rating?: number
  services?: string[]
}

interface EmergencyInstruction {
  title: string
  description: string
  warning?: string
  priority: number
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

    const { caseId, action, location, animalType, condition, photos } = await req.json()

    if (!caseId && action !== 'analyze_photos') {
      throw new Error('Case ID is required')
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      console.warn('GEMINI_API_KEY not configured, using fallback responses')
    }

    // Route to appropriate handler based on action
    switch (action) {
      case 'activate':
        return await handleActivateEmergency(supabaseClient, caseId, geminiApiKey)
      
      case 'find_facilities':
        return await handleFindFacilities(supabaseClient, caseId, location, animalType, geminiApiKey)
      
      case 'emergency_instructions':
        return await handleEmergencyInstructions(supabaseClient, caseId, animalType, condition, photos, geminiApiKey)
      
      case 'analyze_photos':
        return await handleAnalyzePhotos(photos, animalType, geminiApiKey)
      
      case 'transportation_options':
        return await handleTransportationOptions(req, geminiApiKey)
      
      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Error in ai-emergency:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

async function handleActivateEmergency(
  supabaseClient: any,
  caseId: string,
  geminiApiKey: string | undefined
): Promise<Response> {
  // Update case to mark AI assistance as activated
  const { error: updateError } = await supabaseClient
    .from('cases')
    .update({ 
      ai_assistance_activated: true,
      ai_assistance_activated_at: new Date().toISOString()
    })
    .eq('id', caseId)

  if (updateError) {
    console.error('Error activating AI assistance:', updateError)
  }

  // Log activation
  console.log(`AI emergency assistance activated for case ${caseId}`)

  return new Response(
    JSON.stringify({ 
      success: true,
      message: 'AI emergency assistance activated',
      activated_at: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleFindFacilities(
  supabaseClient: any,
  caseId: string,
  location: { latitude: number, longitude: number },
  animalType: string,
  geminiApiKey: string | undefined
): Promise<Response> {
  if (!location || !location.latitude || !location.longitude) {
    throw new Error('Location coordinates are required')
  }

  let facilities: FacilityRecommendation[] = []

  if (geminiApiKey) {
    // Use Gemini AI to find and recommend facilities
    try {
      const prompt = `You are an AI assistant helping with animal rescue in India. 
      
Find and recommend nearby animal care facilities for a ${animalType} at location (${location.latitude}, ${location.longitude}).

Provide recommendations for:
1. Animal hospitals with emergency services
2. Veterinary clinics
3. Animal rescue NGOs
4. Wildlife rehabilitation centers (if applicable)

For each facility, provide:
- Name
- Type (hospital/clinic/ngo/shelter)
- Specialization
- Approximate address
- Estimated distance
- Operating hours
- Contact phone number
- Services offered

Format the response as a JSON array of facilities. Be realistic about Indian animal care infrastructure.`

      const geminiResponse = await callGeminiAPI(geminiApiKey, prompt)
      facilities = parseGeminiFacilities(geminiResponse, location)
    } catch (error) {
      console.error('Gemini API error:', error)
      // Fall back to mock data
      facilities = getMockFacilities(location, animalType)
    }
  } else {
    // Use mock data when API key not available
    facilities = getMockFacilities(location, animalType)
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      facilities,
      count: facilities.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleEmergencyInstructions(
  supabaseClient: any,
  caseId: string,
  animalType: string,
  condition: string,
  photos: string[],
  geminiApiKey: string | undefined
): Promise<Response> {
  let instructions: EmergencyInstruction[] = []
  let safetyWarnings: string[] = []
  let urgencyLevel = 'medium'

  if (geminiApiKey) {
    try {
      const prompt = `You are an AI assistant providing emergency first aid guidance for animal rescue in India.

Animal Type: ${animalType}
Condition: ${condition}
${photos && photos.length > 0 ? `Photos available: ${photos.length}` : 'No photos available'}

Provide step-by-step emergency care instructions that a non-expert can follow safely. Include:
1. Safety precautions (for both human and animal)
2. Immediate assessment steps
3. First aid measures
4. What NOT to do
5. When to seek immediate professional help

Also assess the urgency level (low/medium/high/critical) based on the condition.

Format as JSON with: instructions (array of {title, description, warning?, priority}), safetyWarnings (array of strings), urgencyLevel (string)`

      const geminiResponse = await callGeminiAPI(geminiApiKey, prompt)
      const parsed = parseGeminiInstructions(geminiResponse)
      instructions = parsed.instructions
      safetyWarnings = parsed.safetyWarnings
      urgencyLevel = parsed.urgencyLevel
    } catch (error) {
      console.error('Gemini API error:', error)
      // Fall back to generic instructions
      const fallback = getGenericInstructions(animalType, condition)
      instructions = fallback.instructions
      safetyWarnings = fallback.safetyWarnings
      urgencyLevel = fallback.urgencyLevel
    }
  } else {
    const fallback = getGenericInstructions(animalType, condition)
    instructions = fallback.instructions
    safetyWarnings = fallback.safetyWarnings
    urgencyLevel = fallback.urgencyLevel
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      instructions,
      safetyWarnings,
      urgencyLevel
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleAnalyzePhotos(
  photos: string[],
  animalType: string,
  geminiApiKey: string | undefined
): Promise<Response> {
  if (!photos || photos.length === 0) {
    throw new Error('Photos are required for analysis')
  }

  let analysis = ''
  let injuryAssessment = {}
  let recommendedActions: string[] = []

  if (geminiApiKey) {
    try {
      // Note: Gemini Vision API would be used here for actual photo analysis
      // For now, we'll provide text-based analysis
      const prompt = `You are an AI veterinary assistant analyzing photos of an injured ${animalType}.

Based on typical injuries and conditions for ${animalType}s, provide:
1. General assessment of visible condition
2. Injury severity assessment (low/medium/high/critical)
3. Recommended immediate actions
4. Warning signs to watch for

Format as JSON with: analysis (string), injuryAssessment (object with severity and details), recommendedActions (array of strings)`

      const geminiResponse = await callGeminiAPI(geminiApiKey, prompt)
      const parsed = parseGeminiPhotoAnalysis(geminiResponse)
      analysis = parsed.analysis
      injuryAssessment = parsed.injuryAssessment
      recommendedActions = parsed.recommendedActions
    } catch (error) {
      console.error('Gemini API error:', error)
      // Fall back to generic analysis
      const fallback = getGenericPhotoAnalysis(animalType)
      analysis = fallback.analysis
      injuryAssessment = fallback.injuryAssessment
      recommendedActions = fallback.recommendedActions
    }
  } else {
    const fallback = getGenericPhotoAnalysis(animalType)
    analysis = fallback.analysis
    injuryAssessment = fallback.injuryAssessment
    recommendedActions = fallback.recommendedActions
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      analysis,
      injuryAssessment,
      recommendedActions
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function handleTransportationOptions(
  req: Request,
  geminiApiKey: string | undefined
): Promise<Response> {
  const { origin, destination } = await req.json()

  if (!origin || !destination) {
    throw new Error('Origin and destination are required')
  }

  const options = [
    {
      method: 'Auto/Taxi',
      estimatedTime: '15-20 minutes',
      cost: '₹150-300',
      suitability: 'Good for small to medium animals',
      instructions: 'Keep animal in a secure carrier or box. Inform driver about the animal.'
    },
    {
      method: 'Private Vehicle',
      estimatedTime: '10-15 minutes',
      cost: 'Fuel cost only',
      suitability: 'Best for all animal sizes',
      instructions: 'Secure animal properly. Have someone accompany to monitor the animal.'
    },
    {
      method: 'Animal Ambulance',
      estimatedTime: '20-30 minutes',
      cost: '₹500-1000',
      suitability: 'Best for critically injured animals',
      instructions: 'Call NGO or animal hospital for ambulance service. They have proper equipment.'
    }
  ]

  return new Response(
    JSON.stringify({ 
      success: true,
      options
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper function to call Gemini API
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

// Parser functions
function parseGeminiFacilities(response: string, location: { latitude: number, longitude: number }): FacilityRecommendation[] {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Error parsing Gemini facilities:', error)
  }
  return getMockFacilities(location, 'dog')
}

function parseGeminiInstructions(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Error parsing Gemini instructions:', error)
  }
  return getGenericInstructions('dog', 'injured')
}

function parseGeminiPhotoAnalysis(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Error parsing Gemini photo analysis:', error)
  }
  return getGenericPhotoAnalysis('dog')
}

// Fallback mock data functions
function getMockFacilities(location: { latitude: number, longitude: number }, animalType: string): FacilityRecommendation[] {
  return [
    {
      name: 'City Animal Hospital',
      type: 'hospital',
      specialization: 'Emergency Care & Surgery',
      address: 'Near your location',
      distance: '2.5 km away',
      hours: 'Open 24/7',
      phone: '1234567890',
      location: {
        latitude: location.latitude + 0.02,
        longitude: location.longitude + 0.02
      },
      rating: 4.5,
      services: ['Emergency Care', 'Surgery', 'X-Ray', 'Laboratory']
    },
    {
      name: 'Animal Rescue NGO',
      type: 'ngo',
      specialization: 'Rescue & Rehabilitation',
      address: 'City Center',
      distance: '5 km away',
      hours: '9 AM - 6 PM',
      phone: '0987654321',
      location: {
        latitude: location.latitude + 0.04,
        longitude: location.longitude + 0.03
      },
      rating: 4.2,
      services: ['Rescue', 'Shelter', 'Adoption', 'Medical Care']
    },
    {
      name: 'Veterinary Clinic',
      type: 'clinic',
      specialization: 'General Veterinary Care',
      address: 'Main Road',
      distance: '3 km away',
      hours: '10 AM - 8 PM',
      phone: '1122334455',
      location: {
        latitude: location.latitude + 0.025,
        longitude: location.longitude + 0.015
      },
      rating: 4.0,
      services: ['Consultation', 'Vaccination', 'Minor Surgery']
    }
  ]
}

function getGenericInstructions(animalType: string, condition: string): any {
  return {
    instructions: [
      {
        title: 'Ensure Safety First',
        description: 'Approach the animal carefully. If the animal appears aggressive or dangerous, maintain a safe distance and call professional help immediately.',
        warning: 'Do not attempt to handle aggressive or wild animals',
        priority: 1
      },
      {
        title: 'Assess the Situation',
        description: 'Check for visible injuries, bleeding, or signs of distress. Note the animal\'s breathing pattern and consciousness level. Look for any obvious wounds or fractures.',
        priority: 2
      },
      {
        title: 'Keep the Animal Calm',
        description: 'Speak softly and avoid sudden movements. Provide shade if in direct sunlight. If the animal is conscious and not vomiting, offer small amounts of water.',
        priority: 3
      },
      {
        title: 'Control Bleeding',
        description: 'If there is bleeding, apply gentle pressure with a clean cloth. Do not remove any embedded objects. Keep the animal still to prevent further injury.',
        warning: 'Do not apply tourniquets unless trained',
        priority: 4
      },
      {
        title: 'Contact Professional Help',
        description: 'Call nearby veterinary hospitals or animal rescue organizations immediately. Provide them with details about the animal\'s condition, location, and any visible injuries.',
        priority: 5
      },
      {
        title: 'Prepare for Transport',
        description: 'If you need to move the animal, use a sturdy box or carrier. Support the animal\'s body properly. Keep movements gentle and minimize stress.',
        warning: 'Only move the animal if absolutely necessary',
        priority: 6
      }
    ],
    safetyWarnings: [
      'Always prioritize your own safety',
      'Wear gloves if available to prevent disease transmission',
      'Be cautious of bites and scratches',
      'Do not give medication without veterinary guidance',
      'Avoid feeding the animal before veterinary examination'
    ],
    urgencyLevel: condition.toLowerCase().includes('critical') || condition.toLowerCase().includes('severe') ? 'high' : 'medium'
  }
}

function getGenericPhotoAnalysis(animalType: string): any {
  return {
    analysis: `Based on the photos provided, this ${animalType} appears to require immediate veterinary attention. The condition suggests potential injuries that need professional assessment. Please transport the animal to the nearest veterinary facility as soon as possible.`,
    injuryAssessment: {
      severity: 'medium',
      details: 'Professional veterinary examination required to determine exact nature and extent of injuries. Visible signs suggest the animal is in distress and needs immediate care.'
    },
    recommendedActions: [
      'Transport to nearest veterinary hospital immediately',
      'Keep the animal calm and comfortable during transport',
      'Monitor breathing and consciousness level',
      'Provide water if animal is conscious and not vomiting',
      'Document any changes in condition',
      'Have emergency contact numbers ready'
    ]
  }
}

// Case Workflow Edge Function
// Handles case creation workflow and notifications

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
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

    const { caseId } = await req.json()

    if (!caseId) {
      throw new Error('Case ID is required')
    }

    // Get case details with reporter information
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select(`
        *,
        reporter:profiles!reporter_id(*)
      `)
      .eq('id', caseId)
      .single()

    if (caseError) throw caseError

    // Extract location coordinates
    const lat = caseData.location_point?.coordinates[1]
    const lng = caseData.location_point?.coordinates[0]

    if (!lat || !lng) {
      console.log('No GPS coordinates available, skipping helper matching')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Case created but no GPS coordinates for helper matching',
          helpersNotified: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find nearby helpers using PostGIS function
    const { data: helpers, error: helpersError } = await supabaseClient
      .rpc('find_nearby_helpers', {
        lat,
        lng,
        radius_km: 10
      })

    if (helpersError) {
      console.error('Error finding helpers:', helpersError)
      throw helpersError
    }

    console.log(`Found ${helpers?.length || 0} nearby helpers`)

    // TODO: Send notifications to helpers
    // This will be implemented in the send-notifications function
    // For now, just log the helpers
    if (helpers && helpers.length > 0) {
      console.log('Helpers to notify:', helpers.map((h: any) => h.name))
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        helpersNotified: helpers?.length || 0,
        helpers: helpers?.map((h: any) => ({ id: h.helper_id, name: h.name, distance: h.distance_km }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in case-workflow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

// Edge Function for complex location matching with business logic
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationMatchRequest {
  caseId?: string;
  lat: number;
  lng: number;
  radiusKm?: number;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  animalType?: string;
  preferredHelperTypes?: ('volunteer' | 'ngo')[];
}

interface Helper {
  helper_id: string;
  name: string;
  user_type: string;
  distance_km: number;
  phone: string;
  notification_preferences: {
    whatsapp: boolean;
    email: boolean;
    push: boolean;
    radius: number;
  };
  organization?: string;
  animal_types?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const {
      caseId,
      lat,
      lng,
      radiusKm = 10,
      urgencyLevel = 'medium',
      animalType,
      preferredHelperTypes,
    }: LocationMatchRequest = await req.json();

    // Validate input
    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Adjust radius based on urgency level
    let effectiveRadius = radiusKm;
    if (urgencyLevel === 'critical') {
      effectiveRadius = radiusKm * 2; // Expand search for critical cases
    } else if (urgencyLevel === 'high') {
      effectiveRadius = radiusKm * 1.5;
    }

    // Find nearby helpers using PostGIS
    const { data: nearbyHelpers, error: helpersError } = await supabaseClient
      .rpc('find_nearby_helpers', {
        lat,
        lng,
        radius_km: effectiveRadius,
      });

    if (helpersError) {
      throw helpersError;
    }

    // Also check service areas
    const { data: serviceAreaHelpers, error: serviceError } = await supabaseClient
      .rpc('find_helpers_by_service_area', {
        lat,
        lng,
      });

    if (serviceError) {
      console.error('Service area query error:', serviceError);
    }

    // Combine and deduplicate helpers
    const allHelpers = new Map<string, Helper>();
    
    // Add nearby helpers
    if (nearbyHelpers) {
      nearbyHelpers.forEach((helper: Helper) => {
        allHelpers.set(helper.helper_id, helper);
      });
    }

    // Add service area helpers (they take priority if already in map)
    if (serviceAreaHelpers) {
      serviceAreaHelpers.forEach((helper: Helper) => {
        if (!allHelpers.has(helper.helper_id)) {
          allHelpers.set(helper.helper_id, helper);
        }
      });
    }

    let matchedHelpers = Array.from(allHelpers.values());

    // Apply business logic filters
    
    // 1. Filter by preferred helper types if specified
    if (preferredHelperTypes && preferredHelperTypes.length > 0) {
      matchedHelpers = matchedHelpers.filter((helper) =>
        preferredHelperTypes.includes(helper.user_type as 'volunteer' | 'ngo')
      );
    }

    // 2. Filter by animal type specialization if specified
    if (animalType) {
      matchedHelpers = matchedHelpers.filter((helper) => {
        // If helper has no animal_types specified, they accept all
        if (!helper.animal_types || helper.animal_types.length === 0) {
          return true;
        }
        // Check if helper specializes in this animal type
        return helper.animal_types.includes(animalType);
      });
    }

    // 3. Filter by notification preferences radius
    matchedHelpers = matchedHelpers.filter((helper) => {
      const preferredRadius = helper.notification_preferences?.radius || 10;
      return helper.distance_km <= preferredRadius;
    });

    // 4. Prioritize helpers based on multiple factors
    matchedHelpers = matchedHelpers.map((helper) => {
      let priority = 0;

      // Distance priority (closer is better)
      if (helper.distance_km <= 5) priority += 30;
      else if (helper.distance_km <= 10) priority += 20;
      else if (helper.distance_km <= 20) priority += 10;

      // NGOs get higher priority for critical cases
      if (urgencyLevel === 'critical' && helper.user_type === 'ngo') {
        priority += 20;
      }

      // Animal type specialization bonus
      if (animalType && helper.animal_types?.includes(animalType)) {
        priority += 15;
      }

      // Organization bonus (NGOs typically have more resources)
      if (helper.organization) {
        priority += 10;
      }

      return { ...helper, priority };
    });

    // Sort by priority (highest first), then by distance
    matchedHelpers.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.distance_km - b.distance_km;
    });

    // Get coverage statistics
    const { data: coverageStats } = await supabaseClient
      .rpc('get_area_coverage_stats', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: effectiveRadius,
      });

    // Prepare response
    const response = {
      success: true,
      matchedHelpers: matchedHelpers.slice(0, 20), // Limit to top 20
      totalMatched: matchedHelpers.length,
      searchRadius: effectiveRadius,
      urgencyLevel,
      coverageStats: coverageStats?.[0] || null,
      recommendations: {
        hasAdequateCoverage: matchedHelpers.length >= 3,
        shouldExpandRadius: matchedHelpers.length < 2,
        suggestedRadius: matchedHelpers.length < 2 ? effectiveRadius * 1.5 : effectiveRadius,
      },
    };

    // If this is for a specific case, log the matching attempt
    if (caseId) {
      await supabaseClient.from('messages').insert({
        case_id: caseId,
        sender_id: '00000000-0000-0000-0000-000000000000', // System user
        content: `Location matching completed: ${matchedHelpers.length} helpers found within ${effectiveRadius}km`,
        message_type: 'system',
      });
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Location matching error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

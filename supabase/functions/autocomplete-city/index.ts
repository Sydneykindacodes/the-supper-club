const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!input || input.length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ['locality', 'postal_code', 'sublocality', 'administrative_area_level_3'],
        includedRegionCodes: ['us'],
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error('Autocomplete error:', data.error);
      return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const suggestions = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        description: s.placePrediction.text?.text || s.placePrediction.structuredFormat?.mainText?.text || '',
        placeId: s.placePrediction.placeId || '',
      }))
      .slice(0, 6);

    return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Autocomplete error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

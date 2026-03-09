const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, city, radius = 10 } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 1: Geocode the city to get lat/lng
    // Try the city as-is first, then with ", USA" appended for better results
    let geoData: Record<string, unknown> | null = null;
    for (const suffix of ['', ', USA', ', United States']) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + suffix)}&key=${apiKey}`;
      const geoRes = await fetch(geocodeUrl);
      geoData = await geoRes.json() as Record<string, unknown>;
      if ((geoData.results as unknown[])?.length) break;
    }
    
    if (!(geoData?.results as unknown[])?.length) {
      return new Response(JSON.stringify({ restaurants: [], error: 'City not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = geoData!.results as { geometry: { location: { lat: number; lng: number } } }[];
    const { lat, lng } = results[0].geometry.location;
    const radiusMeters = Math.round(radius * 1609.34); // miles to meters

    // Step 2: Search for restaurants using Places API (New) Text Search
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const searchBody: Record<string, unknown> = {
      textQuery: query ? `${query} restaurant` : 'restaurant',
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50000),
        },
      },
      includedType: 'restaurant',
      maxResultCount: 15,
    };

    const placesRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.id,places.primaryType,places.primaryTypeDisplayName',
      },
      body: JSON.stringify(searchBody),
    });

    const placesData = await placesRes.json();

    if (!placesData.places) {
      return new Response(JSON.stringify({ restaurants: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const priceLevelMap: Record<string, number> = {
      'PRICE_LEVEL_FREE': 1,
      'PRICE_LEVEL_INEXPENSIVE': 1,
      'PRICE_LEVEL_MODERATE': 2,
      'PRICE_LEVEL_EXPENSIVE': 3,
      'PRICE_LEVEL_VERY_EXPENSIVE': 4,
    };

    const restaurants = placesData.places.map((place: Record<string, unknown>, i: number) => {
      const displayName = place.displayName as { text: string } | undefined;
      const primaryTypeDisplay = place.primaryTypeDisplayName as { text: string } | undefined;
      return {
        id: `gp-${i}-${(place.id as string || '').slice(0, 8)}`,
        name: displayName?.text || 'Unknown',
        cuisine: primaryTypeDisplay?.text || 'Restaurant',
        city: (place.formattedAddress as string || '').split(',').slice(-3, -1).join(',').trim() || city,
        address: place.formattedAddress || '',
        price: priceLevelMap[place.priceLevel as string] || 2,
        googleRating: (place.rating as number) || null,
        googleReviewCount: (place.userRatingCount as number) || 0,
        googlePlaceId: place.id,
      };
    });

    return new Response(JSON.stringify({ restaurants }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

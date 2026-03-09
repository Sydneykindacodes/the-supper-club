const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BookingLinks {
  google: string;
  opentable?: string;
  resy?: string;
  yelp?: string;
  phone?: string;
  website?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      restaurant_name, 
      google_place_id, 
      city, 
      dinner_date, 
      dinner_time,
      party_size 
    } = await req.json();

    const date = new Date(dinner_date);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = dinner_time || '19:00';

    const encodedName = encodeURIComponent(restaurant_name);
    const encodedCity = encodeURIComponent(city);

    const links: BookingLinks = {
      google: google_place_id 
        ? `https://www.google.com/maps/reserve/v/dine/${google_place_id}?hl=en`
        : `https://www.google.com/maps/search/${encodedName}+${encodedCity}`,
    };

    links.opentable = `https://www.opentable.com/s?dateTime=${dateStr}T${timeStr}&covers=${party_size}&term=${encodedName}`;
    links.resy = `https://resy.com/cities/${encodedCity.toLowerCase().replace(/[^a-z]/g, '-')}?date=${dateStr}&seats=${party_size}&query=${encodedName}`;
    links.yelp = `https://www.yelp.com/reservations/${encodedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${encodedCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}?date=${dateStr}&time=${timeStr.replace(':', '')}&covers=${party_size}`;

    // Fetch phone number and website from Google Places API
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (apiKey && google_place_id) {
      try {
        const detailsUrl = `https://places.googleapis.com/v1/places/${google_place_id}`;
        const detailsRes = await fetch(detailsUrl, {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'nationalPhoneNumber,internationalPhoneNumber,websiteUri',
          },
        });
        const details = await detailsRes.json();
        if (details.nationalPhoneNumber || details.internationalPhoneNumber) {
          links.phone = details.nationalPhoneNumber || details.internationalPhoneNumber;
        }
        if (details.websiteUri) {
          links.website = details.websiteUri;
        }
      } catch (e) {
        console.error('Failed to fetch place details:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      links,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

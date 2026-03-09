const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BookingLinks {
  google: string;
  opentable?: string;
  resy?: string;
  yelp?: string;
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

    // Format date for URL params
    const date = new Date(dinner_date);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = dinner_time || '19:00';

    // Encode restaurant name for search
    const encodedName = encodeURIComponent(restaurant_name);
    const encodedCity = encodeURIComponent(city);

    const links: BookingLinks = {
      // Google Maps with reservation intent
      google: google_place_id 
        ? `https://www.google.com/maps/reserve/v/dine/${google_place_id}?hl=en`
        : `https://www.google.com/maps/search/${encodedName}+${encodedCity}`,
    };

    // OpenTable search URL
    links.opentable = `https://www.opentable.com/s?dateTime=${dateStr}T${timeStr}&covers=${party_size}&term=${encodedName}`;

    // Resy search URL  
    links.resy = `https://resy.com/cities/${encodedCity.toLowerCase().replace(/[^a-z]/g, '-')}?date=${dateStr}&seats=${party_size}&query=${encodedName}`;

    // Yelp reservation search
    links.yelp = `https://www.yelp.com/reservations/${encodedName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${encodedCity.toLowerCase().replace(/[^a-z0-9]/g, '-')}?date=${dateStr}&time=${timeStr.replace(':', '')}&covers=${party_size}`;

    return new Response(JSON.stringify({
      success: true,
      links,
      instructions: {
        title: "🔗 Secure the Reservation",
        subtitle: "The venue awaits. Click any link to check availability.",
        tips: [
          "Google Maps often has direct booking for popular spots",
          "OpenTable and Resy show real-time availability",
          "If you can't find it, try calling — old school works too"
        ]
      }
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

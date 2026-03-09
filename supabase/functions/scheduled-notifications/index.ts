import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const results: { type: string; group_id: string; sent: number }[] = [];

    // ── 1. Morning-of reveal reminder (8:00 AM on dinner day) ──
    // Find confirmed/revealed reservations where dinner_date is today and it's past 8 AM
    const todayStr = now.toISOString().split('T')[0];
    const hour = now.getUTCHours(); // Note: adjust for timezone if needed

    if (hour >= 8) {
      const { data: todayDinners } = await supabase
        .from('reservations')
        .select('id, group_id, dinner_date')
        .in('status', ['confirmed', 'revealed'])
        .eq('dinner_date', todayStr);

      for (const res of todayDinners || []) {
        // Check if we already sent this notification
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('reservation_id', res.id)
          .eq('type', 'morning_reveal_reminder')
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Get all members in the group
        const { data: members } = await supabase
          .from('members')
          .select('id')
          .eq('group_id', res.group_id);

        if (!members || members.length === 0) continue;

        const notifications = members.map(m => ({
          member_id: m.id,
          reservation_id: res.id,
          type: 'morning_reveal_reminder',
          channel: 'push',
          delivered: false,
        }));

        await supabase.from('notifications').insert(notifications);
        results.push({ type: 'morning_reveal_reminder', group_id: res.group_id, sent: notifications.length });
      }
    }

    // ── 2. Post-dinner review reminder (1h 45m after dinner time) ──
    // Find confirmed/revealed reservations where dinner has passed by 1h45m
    const { data: pastDinners } = await supabase
      .from('reservations')
      .select('id, group_id, dinner_date, dinner_time')
      .in('status', ['confirmed', 'revealed']);

    for (const res of pastDinners || []) {
      const dinnerTime = res.dinner_time || '19:00';
      const dinnerDateTime = new Date(`${res.dinner_date}T${dinnerTime}:00`);
      const reminderTime = new Date(dinnerDateTime.getTime() + (1 * 60 + 45) * 60 * 1000);

      if (now < reminderTime) continue;

      // Check if we already sent this notification
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('reservation_id', res.id)
        .eq('type', 'post_dinner_review')
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Get all members in the group
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('group_id', res.group_id);

      if (!members || members.length === 0) continue;

      const notifications = members.map(m => ({
        member_id: m.id,
        reservation_id: res.id,
        type: 'post_dinner_review',
        channel: 'push',
        delivered: false,
      }));

      await supabase.from('notifications').insert(notifications);
      results.push({ type: 'post_dinner_review', group_id: res.group_id, sent: notifications.length });
    }

    // ── 3. Dissolve temporary groups at midnight after dinner ──
    try {
      const dissolveUrl = Deno.env.get('SUPABASE_URL')! + '/functions/v1/dissolve-temp-groups';
      const dissolveRes = await fetch(dissolveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
      });
      const dissolveData = await dissolveRes.json();
      if (dissolveData.results?.length > 0) {
        results.push(...dissolveData.results.map((r: any) => ({ type: 'dissolve_temp_group', group_id: r.group_id, sent: r.members_removed })));
      }
    } catch (e) {
      console.error('Temp group dissolution failed:', e);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in scheduled notifications:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

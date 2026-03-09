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
    const { group_id, reservation_id } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all members in the group
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, host_count, last_hosted_at, is_host')
      .eq('group_id', group_id);

    if (membersError || !members?.length) {
      return new Response(JSON.stringify({ error: 'No members found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the current host (most recent)
    const currentHost = members.find(m => m.is_host);
    
    // Get rotation history to determine cycle
    const { data: history } = await supabase
      .from('host_rotation_history')
      .select('member_id, cycle_number')
      .eq('group_id', group_id)
      .order('hosted_at', { ascending: false });

    // Determine current cycle number
    const currentCycle = history?.[0]?.cycle_number || 1;
    const membersHostedThisCycle = new Set(
      history?.filter(h => h.cycle_number === currentCycle).map(h => h.member_id) || []
    );

    // Find eligible members: exclude current host, prefer those who haven't hosted this cycle
    let eligibleMembers = members.filter(m => m.id !== currentHost?.id);
    
    // If everyone except current host has hosted this cycle, start new cycle
    const unhostedThisCycle = eligibleMembers.filter(m => !membersHostedThisCycle.has(m.id));
    
    let nextCycleNumber = currentCycle;
    if (unhostedThisCycle.length === 0) {
      nextCycleNumber = currentCycle + 1;
    } else {
      eligibleMembers = unhostedThisCycle;
    }

    // Randomly select from eligible members
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const nextHost = eligibleMembers[randomIndex];

    // Update member records - set new host immediately in DB
    if (currentHost) {
      await supabase
        .from('members')
        .update({ is_host: false })
        .eq('id', currentHost.id);
    }

    await supabase
      .from('members')
      .update({ 
        is_host: true, 
        host_count: (nextHost.host_count || 0) + 1,
        last_hosted_at: new Date().toISOString()
      })
      .eq('id', nextHost.id);

    // Record in rotation history
    await supabase
      .from('host_rotation_history')
      .insert({
        group_id,
        member_id: nextHost.id,
        reservation_id,
        cycle_number: nextCycleNumber,
      });

    // Calculate 8 AM next day for host reveal
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    // Update reservation with next host and reveal time
    if (reservation_id) {
      await supabase
        .from('reservations')
        .update({ 
          next_host_id: nextHost.id,
          next_host_notified_at: tomorrow.toISOString(),
        })
        .eq('id', reservation_id);
    }

    return new Response(JSON.stringify({
      success: true,
      next_host: {
        id: nextHost.id,
        name: nextHost.name,
      },
      cycle_number: nextCycleNumber,
      reveal_at: tomorrow.toISOString(),
      message: `🤫 ${nextHost.name} has been secretly selected as the next host!`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error selecting next host:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

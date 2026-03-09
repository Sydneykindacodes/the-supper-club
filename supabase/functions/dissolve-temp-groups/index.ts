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
    const todayStr = now.toISOString().split('T')[0];
    const results: { group_id: string; members_removed: number }[] = [];

    // Find temporary groups with completed reservations where dinner_date has passed (midnight)
    const { data: tempGroups } = await supabase
      .from('groups')
      .select('id, name')
      .eq('is_temporary', true);

    if (!tempGroups || tempGroups.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No temporary groups found', results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const group of tempGroups) {
      // Check if group has a completed reservation with a dinner_date before today
      const { data: completedRes } = await supabase
        .from('reservations')
        .select('id, dinner_date')
        .eq('group_id', group.id)
        .eq('status', 'completed')
        .lt('dinner_date', todayStr)
        .limit(1);

      if (!completedRes || completedRes.length === 0) continue;

      // Award temp group badges to members before dissolving
      const { data: members } = await supabase
        .from('members')
        .select('id, user_id')
        .eq('group_id', group.id);

      if (members) {
        for (const member of members) {
          if (!member.user_id) continue;

          // Count how many completed temporary groups this user has been in
          const { data: userTempGroups } = await supabase
            .from('members')
            .select('group_id, groups!inner(is_temporary)')
            .eq('user_id', member.user_id);

          // Count completed temp groups (including this one)
          let tempCount = 0;
          if (userTempGroups) {
            for (const utg of userTempGroups) {
              const g = utg as any;
              if (g.groups?.is_temporary) {
                const { data: completedInGroup } = await supabase
                  .from('reservations')
                  .select('id')
                  .eq('group_id', g.group_id)
                  .eq('status', 'completed')
                  .limit(1);
                if (completedInGroup && completedInGroup.length > 0) tempCount++;
              }
            }
          }

          // Award badges
          const badgesToCheck = [
            { count: 1, key: 'temp_group_1' },
            { count: 5, key: 'temp_group_5' },
            { count: 10, key: 'temp_group_10' },
          ];

          for (const badge of badgesToCheck) {
            if (tempCount >= badge.count) {
              // Check if already earned
              const { data: existing } = await supabase
                .from('user_badges')
                .select('id')
                .eq('user_id', member.user_id)
                .eq('badge_key', badge.key)
                .limit(1);

              if (!existing || existing.length === 0) {
                await supabase.from('user_badges').insert({
                  user_id: member.user_id,
                  badge_key: badge.key,
                  badge_type: 'individual',
                });
              }
            }
          }
        }

        // Delete all members from the group (dissolve)
        await supabase
          .from('members')
          .delete()
          .eq('group_id', group.id);

        results.push({ group_id: group.id, members_removed: members.length });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error dissolving temp groups:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

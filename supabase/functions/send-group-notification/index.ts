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
    const { group_id, type, reservation_id, exclude_member_id } = await req.json();

    if (!group_id || !type) {
      return new Response(JSON.stringify({ error: 'group_id and type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get all members in the group
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, push_enabled')
      .eq('group_id', group_id);

    if (membersError) throw membersError;
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter: exclude the triggering member, only include push-enabled (or all for in-app)
    const recipients = members.filter(m => m.id !== exclude_member_id);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notifications = recipients.map(m => ({
      member_id: m.id,
      reservation_id: reservation_id || null,
      type,
      channel: 'push',
      delivered: false,
    }));

    const { error: insertError } = await supabase.from('notifications').insert(notifications);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true, sent: notifications.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error sending group notification:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

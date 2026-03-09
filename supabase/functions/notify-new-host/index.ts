import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Fun secretive messages for new host notification
const SECRET_MESSAGES = [
  "🤫 You've been chosen. The torch has been passed in secret.",
  "🕵️ Psst... you're the new keeper of the reservation secrets.",
  "🔮 The Supper Club has spoken. You are the chosen one.",
  "🎭 A new host emerges from the shadows. It's you.",
  "✨ Congratulations, secret agent. Your mission: plan the next feast.",
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find reservations that have a next_host but haven't been notified yet
    // and it's past 8 AM the day after the dinner
    const now = new Date();
    
    const { data: reservations, error: resError } = await supabase
      .from('reservations')
      .select(`
        id, 
        group_id,
        dinner_date,
        next_host_id,
        groups!inner(name),
        members!reservations_next_host_id_fkey(id, name, email, phone, push_enabled, email_enabled, sms_enabled)
      `)
      .not('next_host_id', 'is', null)
      .is('next_host_notified_at', null)
      .eq('status', 'completed');

    if (resError) throw resError;

    const notificationsSent = [];

    for (const res of reservations || []) {
      const dinnerDate = new Date(res.dinner_date);
      const notifyAt = new Date(dinnerDate);
      notifyAt.setDate(notifyAt.getDate() + 1);
      notifyAt.setHours(8, 0, 0, 0);

      // Only notify if it's past 8 AM the day after dinner
      if (now < notifyAt) continue;

      const nextHost = res.members;
      if (!nextHost) continue;

      const secretMessage = SECRET_MESSAGES[Math.floor(Math.random() * SECRET_MESSAGES.length)];
      const groupName = res.groups?.name || 'your Supper Club';

      // Create notifications for each enabled channel
      const notifications = [];

      // In-app notification (always)
      notifications.push({
        member_id: nextHost.id,
        reservation_id: res.id,
        type: 'new_host_reveal',
        channel: 'push',
        delivered: true, // In-app is instant
      });

      // Push notification
      if (nextHost.push_enabled) {
        notifications.push({
          member_id: nextHost.id,
          reservation_id: res.id,
          type: 'new_host_reveal',
          channel: 'push',
          delivered: false, // Would integrate with push service
        });
        // TODO: Integrate with Firebase/OneSignal for actual push
        console.log(`[PUSH] ${nextHost.name}: ${secretMessage}`);
      }

      // Email notification
      if (nextHost.email_enabled && nextHost.email) {
        notifications.push({
          member_id: nextHost.id,
          reservation_id: res.id,
          type: 'new_host_reveal',
          channel: 'email',
          delivered: false, // Would integrate with email service
        });
        // TODO: Integrate with Resend/SendGrid for email
        console.log(`[EMAIL] ${nextHost.email}: ${secretMessage}`);
      }

      // SMS notification
      if (nextHost.sms_enabled && nextHost.phone) {
        notifications.push({
          member_id: nextHost.id,
          reservation_id: res.id,
          type: 'new_host_reveal',
          channel: 'sms',
          delivered: false, // Would integrate with Twilio
        });
        // TODO: Integrate with Twilio for SMS
        console.log(`[SMS] ${nextHost.phone}: ${secretMessage}`);
      }

      // Insert notifications
      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

      // Mark reservation as notified
      await supabase
        .from('reservations')
        .update({ next_host_notified_at: now.toISOString() })
        .eq('id', res.id);

      notificationsSent.push({
        host_name: nextHost.name,
        group: groupName,
        channels: notifications.map(n => n.channel),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      notifications_sent: notificationsSent.length,
      details: notificationsSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error notifying new host:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

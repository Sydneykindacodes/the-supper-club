import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface AppNotification {
  id: string;
  type: string;
  channel: string;
  delivered: boolean;
  sent_at: string;
  reservation_id: string | null;
  member_id: string;
}

export function useNotifications(user: User, memberIds: string[]) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (memberIds.length === 0) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .in("member_id", memberIds)
      .order("sent_at", { ascending: false })
      .limit(50);
    if (data) {
      const mapped = data.map((n: any) => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        delivered: n.delivered,
        sent_at: n.sent_at,
        reservation_id: n.reservation_id,
        member_id: n.member_id,
      }));
      setNotifications(mapped);
      setUnreadCount(mapped.filter(n => !n.delivered).length);
    }
  }, [memberIds.join(",")]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (memberIds.length === 0) return;

    const channel = supabase
      .channel(`notifs-${memberIds.join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as any;
          if (memberIds.includes(n.member_id)) {
            fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberIds.join(","), fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (memberIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ delivered: true })
      .in("member_id", memberIds)
      .eq("delivered", false);
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, delivered: true })));
  }, [memberIds.join(",")]);

  const getNotificationMessage = (n: AppNotification): string => {
    switch (n.type) {
      case "new_host_reveal": return "🤫 You've been chosen as the next host!";
      case "new_host_selected": return "🎲 A new host has been selected for the next dinner!";
      case "dinner_confirmed": return "🍽️ The reservation has been booked!";
      case "restaurant_revealed": return "🎭 The restaurant has been revealed!";
      case "review_reminder": return "✍️ Don't forget to write your review!";
      case "availability_reminder": return "📅 The host is nudging you — submit your availability!";
      case "date_proposed": return "📆 The host has locked in a date for dinner!";
      case "restaurant_selected": return "🎲 A restaurant has been randomly selected from the pool!";
      case "restaurant_auto_selected": return "🎲 A restaurant has been drawn — time to book the reservation!";
      case "morning_reveal_reminder": return "🌅 Tonight's the night! Check the app to see where you're going.";
      case "post_dinner_review": return "✨ How was dinner? Submit your review & availability for next time!";
      case "all_availability_in": return "📋 Everyone has submitted their availability! Time to pick a date.";
      case "all_votes_in": return "✅ Everyone has responded to the proposed date!";
      case "member_joined": return "👋 A new member has joined the club!";
      case "availability_submitted": return "📅 A member has submitted their availability.";
      case "dinner_cancelled": return "❌ The dinner has been cancelled.";
      case "restaurant_added": return "🍴 A new restaurant has been added to the pool!";
      case "low_pool": return "⚠️ Your restaurant pool is running low — add more options!";
      default: return "📬 You have a new notification";
    }
  };

  return { notifications, unreadCount, markAllRead, fetchNotifications, getNotificationMessage };
}

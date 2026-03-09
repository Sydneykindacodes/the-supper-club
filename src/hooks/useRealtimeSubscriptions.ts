import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on reservations, member_availability, and reviews
 * for a given group. Calls `onUpdate` whenever a change is detected.
 */
export function useRealtimeSubscriptions(
  activeGroupId: string | null,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!activeGroupId) return;

    const channel = supabase
      .channel(`group-${activeGroupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `group_id=eq.${activeGroupId}` },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_availability" },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroupId, onUpdate]);
}
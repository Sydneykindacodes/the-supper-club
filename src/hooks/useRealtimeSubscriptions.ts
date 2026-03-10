import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on reservations, member_availability, and reviews
 * for a given group. Calls `onUpdate` whenever a change is detected.
 */
export function useRealtimeSubscriptions(
  activeGroupId: string | null,
  onUpdate: () => void,
  activeReservationId?: string | null
) {
  useEffect(() => {
    if (!activeGroupId) return;

    let availabilityListener = supabase
      .channel(`group-${activeGroupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `group_id=eq.${activeGroupId}` },
        () => onUpdate()
      );

    if (activeReservationId) {
      availabilityListener = availabilityListener.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_availability", filter: `reservation_id=eq.${activeReservationId}` },
        () => onUpdate()
      );
    } else {
      availabilityListener = availabilityListener.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_availability" },
        () => onUpdate()
      );
    }

    const channel = availabilityListener
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members", filter: `group_id=eq.${activeGroupId}` },
        () => onUpdate()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => onUpdate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroupId, onUpdate, activeReservationId]);
}
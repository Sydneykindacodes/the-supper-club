import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Member, Restaurant, MemberAvailability } from "@/data/supper-club-data";

export interface DBMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  is_host: boolean;
  user_id: string | null;
}

export interface ActiveReservation {
  id: string;
  status: string;
  dinner_date: string;
  dinner_time: string | null;
  restaurant_id: string | null;
  party_size: number;
  confirmed_at: string | null;
  revealed_at: string | null;
  reveal_at: string | null;
  booking_url: string | null;
}

export type DinnerStatus = "scheduled" | "pending_confirm" | "no_date" | "awaiting_host";

export function useSupperClubData(user: User, activeGroupId: string | null) {
  const [members, setMembers] = useState<DBMember[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedRestaurants, setVisitedRestaurants] = useState<Restaurant[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [memberAvailability, setMemberAvailability] = useState<MemberAvailability>({});
  const [userSelectedDates, setUserSelectedDates] = useState<string[]>([]);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = useCallback(() => setRefreshCounter(c => c + 1), []);

  // Load members for active group
  useEffect(() => {
    if (!activeGroupId) { setMembers([]); return; }
    setLoadingMembers(true);
    supabase
      .from("members")
      .select("*")
      .eq("group_id", activeGroupId)
      .then(({ data }) => {
        if (data) {
          setMembers(data.map(m => ({
            id: m.id,
            name: m.name,
            avatar: m.name.charAt(0).toUpperCase(),
            color: m.avatar_color || "#c9956a",
            is_host: m.is_host || false,
            user_id: m.user_id,
          })));
        }
        setLoadingMembers(false);
      });
  }, [activeGroupId, refreshCounter]);

  // Load restaurants for active group
  useEffect(() => {
    if (!activeGroupId) { setRestaurants([]); setVisitedRestaurants([]); return; }
    setLoadingRestaurants(true);
    supabase
      .from("restaurants")
      .select("*")
      .eq("group_id", activeGroupId)
      .then(({ data }) => {
        if (data) {
          const pool: Restaurant[] = [];
          const visited: Restaurant[] = [];
          data.forEach(r => {
            const rest: Restaurant = {
              id: parseInt(r.id.replace(/\D/g, '').slice(0, 8)) || Math.random() * 10000,
              name: r.name,
              cuisine: r.cuisine || "Restaurant",
              city: r.city,
              price: r.price || 2,
              visited: r.visited || false,
              visitedDate: r.visited_date,
              visitedRating: null,
              googleRating: r.google_rating ? Number(r.google_rating) : null,
              googleReviewCount: r.google_review_count || 0,
              scRating: r.sc_rating ? Number(r.sc_rating) : null,
              scReviewCount: r.sc_review_count || 0,
              suggested_by: r.suggested_by || undefined,
            };
            if (r.visited) visited.push(rest);
            else pool.push(rest);
          });
          setRestaurants(pool);
          setVisitedRestaurants(visited);
        }
        setLoadingRestaurants(false);
      });
  }, [activeGroupId, refreshCounter]);

  // Load active reservation for group
  useEffect(() => {
    if (!activeGroupId) { setActiveReservation(null); return; }
    supabase
      .from("reservations")
      .select("*")
      .eq("group_id", activeGroupId)
      .not("status", "in", '("completed","cancelled")')
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const r = data[0];
          setActiveReservation({
            id: r.id,
            status: r.status || "pending_selection",
            dinner_date: r.dinner_date,
            dinner_time: r.dinner_time,
            restaurant_id: r.restaurant_id,
            party_size: r.party_size,
            confirmed_at: r.confirmed_at,
            revealed_at: r.revealed_at,
            reveal_at: r.reveal_at,
            booking_url: r.booking_url,
          });
        } else {
          setActiveReservation(null);
        }
      });
  }, [activeGroupId, refreshCounter]);

  // Load availability for active reservation
  useEffect(() => {
    if (!activeReservation || members.length === 0) {
      setMemberAvailability({});
      setUserSelectedDates([]);
      return;
    }

    supabase
      .from("member_availability")
      .select("member_id, available_dates")
      .eq("reservation_id", activeReservation.id)
      .then(({ data: avails }) => {
        if (!avails || avails.length === 0) {
          setMemberAvailability({});
          setUserSelectedDates([]);
          return;
        }
        const avMap: MemberAvailability = {};
        avails.forEach(a => {
          const member = members.find(m => m.id === a.member_id);
          if (member) {
            if (member.user_id === user.id) {
              setUserSelectedDates(a.available_dates);
            } else {
              avMap[member.name] = a.available_dates;
            }
          }
        });
        setMemberAvailability(avMap);
      });
  }, [activeReservation?.id, members, user.id]);

  // Compute dinner status from reservation
  const dinnerStatus: DinnerStatus = (() => {
    if (!activeReservation) return "no_date";
    switch (activeReservation.status) {
      case "pending_selection": return "awaiting_host";
      case "pending_host_booking": return "pending_confirm";
      case "card_required_skipped": return "pending_confirm";
      case "confirmed":
      case "revealed":
        return "scheduled";
      default: return "no_date";
    }
  })();

  const nextDinner: string | null = (() => {
    if (!activeReservation || dinnerStatus === "no_date") return null;
    if (dinnerStatus === "scheduled" || dinnerStatus === "pending_confirm") {
      const d = new Date(activeReservation.dinner_date + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    return null;
  })();

  const pendingDate: string | null = (() => {
    if (dinnerStatus === "pending_confirm" && activeReservation) {
      const d = new Date(activeReservation.dinner_date + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    return null;
  })();

  // Save availability for current user
  const saveAvailability = useCallback(async (dates: string[]) => {
    if (!activeGroupId) return false;
    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return false;

    let reservationId = activeReservation?.id;

    if (!reservationId) {
      const { data: newRes, error } = await supabase
        .from("reservations")
        .insert({
          group_id: activeGroupId,
          dinner_date: new Date(Math.max(...dates.map(d => new Date(d).getTime()))).toISOString().split("T")[0],
          party_size: members.length,
          status: "pending_selection",
        })
        .select()
        .single();
      if (error || !newRes) return false;
      reservationId = newRes.id;
    }

    const { data: existing } = await supabase
      .from("member_availability")
      .select("id")
      .eq("reservation_id", reservationId)
      .eq("member_id", currentMember.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("member_availability")
        .update({ available_dates: dates, submitted_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("member_availability")
        .insert({ reservation_id: reservationId, member_id: currentMember.id, available_dates: dates });
    }

    setUserSelectedDates(dates);
    refresh();
    return true;
  }, [activeGroupId, activeReservation?.id, members, user.id, refresh]);

  // Host proposes a date → update reservation
  const proposeDate = useCallback(async (date: string) => {
    if (!activeGroupId) return false;
    let reservationId = activeReservation?.id;

    if (reservationId) {
      const { error } = await supabase
        .from("reservations")
        .update({ dinner_date: date, status: "pending_host_booking" })
        .eq("id", reservationId);
      if (error) return false;
    } else {
      const { error } = await supabase
        .from("reservations")
        .insert({
          group_id: activeGroupId,
          dinner_date: date,
          party_size: members.length,
          status: "pending_host_booking",
        });
      if (error) return false;
    }
    refresh();
    return true;
  }, [activeGroupId, activeReservation?.id, members.length, refresh]);

  // Host confirms booking
  const confirmBooking = useCallback(async (bookingUrl?: string) => {
    if (!activeReservation?.id) return false;
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        booking_url: bookingUrl || null,
      })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Reveal restaurant to group
  const revealRestaurant = useCallback(async () => {
    if (!activeReservation?.id) return false;
    const { error } = await supabase
      .from("reservations")
      .update({ status: "revealed", revealed_at: new Date().toISOString() })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Complete dinner (post-dinner)
  const completeDinner = useCallback(async () => {
    if (!activeReservation?.id) return false;
    const { error } = await supabase
      .from("reservations")
      .update({ status: "completed" })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Make a member the host
  const makeHost = useCallback(async (memberId: string) => {
    if (!activeGroupId) return false;
    // Remove host from all members in group
    await supabase.from("members").update({ is_host: false }).eq("group_id", activeGroupId);
    // Set new host
    const { error } = await supabase.from("members").update({ is_host: true }).eq("id", memberId);
    if (error) return false;
    refresh();
    return true;
  }, [activeGroupId, refresh]);

  // Leave group
  const leaveGroup = useCallback(async () => {
    if (!activeGroupId) return false;
    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return false;
    const { error } = await supabase.from("members").delete().eq("id", currentMember.id);
    if (error) return false;
    return true;
  }, [activeGroupId, members, user.id]);

  // Add restaurant to group pool in DB
  const addRestaurantToPool = useCallback(async (restaurant: {
    name: string;
    cuisine: string;
    city: string;
    price: number;
    googleRating?: number | null;
    googleReviewCount?: number;
    googlePlaceId?: string;
    address?: string;
  }, groupId: string) => {
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        group_id: groupId,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        city: restaurant.city,
        price: restaurant.price,
        google_rating: restaurant.googleRating,
        google_review_count: restaurant.googleReviewCount || 0,
        google_place_id: restaurant.googlePlaceId || null,
        address: restaurant.address || null,
      })
      .select()
      .single();
    
    if (!error && data) {
      const newRest: Restaurant = {
        id: Math.floor(Math.random() * 100000),
        name: data.name,
        cuisine: data.cuisine || "Restaurant",
        city: data.city,
        price: data.price || 2,
        visited: false,
        visitedDate: null,
        visitedRating: null,
        googleRating: data.google_rating ? Number(data.google_rating) : null,
        googleReviewCount: data.google_review_count || 0,
        scRating: null,
        scReviewCount: 0,
      };
      setRestaurants(prev => [...prev, newRest]);
      return true;
    }
    return false;
  }, []);

  // Remove restaurant from pool
  const removeRestaurantFromPool = useCallback(async (restaurantName: string) => {
    if (!activeGroupId) return false;
    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("group_id", activeGroupId)
      .eq("name", restaurantName);
    if (error) return false;
    setRestaurants(prev => prev.filter(r => r.name !== restaurantName));
    return true;
  }, [activeGroupId]);

  // Get current user's member record
  const currentMember = members.find(m => m.user_id === user.id);
  const isHost = currentMember?.is_host || false;
  const hostMember = members.find(m => m.is_host);
  const hostName = hostMember ? (hostMember.user_id === user.id ? "You" : hostMember.name) : "Unknown";

  // Convert to the Member format used by UI
  const uiMembers: Member[] = members.map(m => ({
    name: m.user_id === user.id ? "You" : m.name,
    avatar: m.user_id === user.id ? "Y" : m.avatar,
    color: m.color,
  }));

  return {
    members,
    uiMembers,
    restaurants,
    visitedRestaurants,
    currentMember,
    isHost,
    hostName,
    loadingMembers,
    loadingRestaurants,
    addRestaurantToPool,
    removeRestaurantFromPool,
    setRestaurants,
    setVisitedRestaurants,
    memberAvailability,
    userSelectedDates,
    saveAvailability,
    activeReservation,
    dinnerStatus,
    nextDinner,
    pendingDate,
    proposeDate,
    confirmBooking,
    revealRestaurant,
    completeDinner,
    makeHost,
    leaveGroup,
    refresh,
  };
}

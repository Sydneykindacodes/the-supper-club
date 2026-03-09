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
  host_count: number;
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
  next_host_id: string | null;
  next_host_notified_at: string | null;
}

export interface DBReview {
  id: string;
  user_id: string;
  restaurant_name: string;
  rating: number;
  review_text: string | null;
  meal_type: string | null;
  best_dish_member: string | null;
  return_choice: string | null;
  photo_url: string | null;
  cuisine: string | null;
  city: string | null;
  group_id: string | null;
  reservation_id: string | null;
  created_at: string;
  // joined fields
  group_name?: string;
  member_name?: string;
}

export interface DBBadge {
  badge_key: string;
  badge_type: string;
  group_id: string | null;
  earned_at: string;
}

export interface GroupSettings {
  auto_submit: boolean;
  no_repeats: boolean;
  repeat_months: number;
  cutoff_days: number;
  allowed_meal_types: string[];
  res_time_start: string;
  res_time_end: string;
  search_radius: number;
}

export type DinnerStatus = "scheduled" | "pending_confirm" | "no_date" | "awaiting_host" | "pending_restaurant" | "post_dinner" | "awaiting_next_host";

export function useSupperClubData(user: User, activeGroupId: string | null) {
  const [members, setMembers] = useState<DBMember[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedRestaurants, setVisitedRestaurants] = useState<Restaurant[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [memberAvailability, setMemberAvailability] = useState<MemberAvailability>({});
  const [userSelectedDates, setUserSelectedDates] = useState<string[]>([]);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [selectedRestaurantData, setSelectedRestaurantData] = useState<{ id: string; name: string; cuisine: string; city: string; address: string | null; google_place_id: string | null; price: number } | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [communityReviews, setCommunityReviews] = useState<DBReview[]>([]);
  const [userBadges, setUserBadges] = useState<DBBadge[]>([]);
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null);

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
            host_count: m.host_count || 0,
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

  // Load active reservation for group (include "completed" for post-dinner flow)
  useEffect(() => {
    if (!activeGroupId) { setActiveReservation(null); return; }
    supabase
      .from("reservations")
      .select("*")
      .eq("group_id", activeGroupId)
      .not("status", "in", '("cancelled")')
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
            next_host_id: r.next_host_id,
            next_host_notified_at: r.next_host_notified_at,
          });
        } else {
          setActiveReservation(null);
        }
      });
  }, [activeGroupId, refreshCounter]);

  // Load selected restaurant data when reservation has a restaurant_id
  useEffect(() => {
    if (!activeReservation?.restaurant_id) { setSelectedRestaurantData(null); return; }
    supabase
      .from("restaurants")
      .select("id, name, cuisine, city, address, google_place_id, price")
      .eq("id", activeReservation.restaurant_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSelectedRestaurantData({
            id: data.id,
            name: data.name,
            cuisine: data.cuisine || "Restaurant",
            city: data.city,
            address: data.address,
            google_place_id: data.google_place_id,
            price: data.price || 2,
          });
        } else {
          setSelectedRestaurantData(null);
        }
      });
  }, [activeReservation?.restaurant_id, refreshCounter]);


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

  // Load community reviews (all reviews visible to authenticated users)
  useEffect(() => {
    supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setCommunityReviews(data.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            restaurant_name: r.restaurant_name,
            rating: Number(r.rating),
            review_text: r.review_text,
            meal_type: r.meal_type,
            best_dish_member: r.best_dish_member,
            return_choice: r.return_choice,
            photo_url: r.photo_url,
            cuisine: r.cuisine,
            city: r.city,
            group_id: r.group_id,
            reservation_id: r.reservation_id,
            created_at: r.created_at,
          })));
        }
      });
  }, [refreshCounter]);

  // Load user badges
  useEffect(() => {
    supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setUserBadges(data.map((b: any) => ({
            badge_key: b.badge_key,
            badge_type: b.badge_type,
            group_id: b.group_id,
            earned_at: b.earned_at,
          })));
        }
      });
  }, [user.id, refreshCounter]);

  // Load group settings
  useEffect(() => {
    if (!activeGroupId) { setGroupSettings(null); return; }
    supabase
      .from("groups")
      .select("auto_submit, no_repeats, repeat_months, cutoff_days, allowed_meal_types, res_time_start, res_time_end, search_radius")
      .eq("id", activeGroupId)
      .single()
      .then(({ data }) => {
        if (data) {
          setGroupSettings({
            auto_submit: (data as any).auto_submit ?? false,
            no_repeats: (data as any).no_repeats ?? true,
            repeat_months: (data as any).repeat_months ?? 6,
            cutoff_days: (data as any).cutoff_days ?? 7,
            allowed_meal_types: (data as any).allowed_meal_types ?? ["Dinner"],
            res_time_start: (data as any).res_time_start ?? "6:00 PM",
            res_time_end: (data as any).res_time_end ?? "9:00 PM",
            search_radius: (data as any).search_radius ?? 10,
          });
        }
      });
  }, [activeGroupId, refreshCounter]);

  // Compute dinner status from reservation
  const isSoloGroup = members.length <= 1;
  const dinnerStatus: DinnerStatus = (() => {
    if (!activeReservation) return "no_date";
    switch (activeReservation.status) {
      case "pending_selection": return "awaiting_host";
      case "pending_host_booking":
        // If no restaurant selected yet, host needs to pick one
        if (!activeReservation.restaurant_id) return "pending_restaurant";
        // For solo groups, skip confirmation and go straight to scheduled
        if (isSoloGroup) return "scheduled";
        return "pending_confirm";
      case "card_required_skipped":
        if (isSoloGroup) return "scheduled";
        return "pending_confirm";
      case "confirmed":
      case "revealed":
        return "scheduled";
      default: return "no_date";
    }
  })();

  const nextDinner: string | null = (() => {
    if (!activeReservation || dinnerStatus === "no_date") return null;
    if (dinnerStatus === "scheduled" || dinnerStatus === "pending_confirm" || dinnerStatus === "pending_restaurant") {
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
          status: "pending_selection" as const,
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

  // Host proposes a date
  const proposeDate = useCallback(async (date: string) => {
    if (!activeGroupId) return false;
    let reservationId = activeReservation?.id;

    if (reservationId) {
      const { error } = await supabase
        .from("reservations")
        .update({ dinner_date: date, status: "pending_host_booking" as const })
        .eq("id", reservationId);
      if (error) return false;
    } else {
      const { error } = await supabase
        .from("reservations")
        .insert({
          group_id: activeGroupId,
          dinner_date: date,
          party_size: members.length,
          status: "pending_host_booking" as const,
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
        status: "confirmed" as const,
        confirmed_at: new Date().toISOString(),
        booking_url: bookingUrl || null,
      })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Select restaurant for reservation — update party_size to confirmed members only
  const selectRestaurantForReservation = useCallback(async (restaurantId: string) => {
    if (!activeReservation?.id) return false;

    // Count members who submitted availability that includes the dinner date
    const { data: avails } = await supabase
      .from("member_availability")
      .select("member_id, available_dates")
      .eq("reservation_id", activeReservation.id);

    let confirmedCount = members.length; // fallback to full group
    if (avails && avails.length > 0) {
      const dinnerDate = activeReservation.dinner_date;
      confirmedCount = avails.filter(a =>
        (a.available_dates as string[]).includes(dinnerDate)
      ).length;
      // At minimum 1 (the host)
      if (confirmedCount < 1) confirmedCount = 1;
    }

    const { error } = await supabase
      .from("reservations")
      .update({ restaurant_id: restaurantId, party_size: confirmedCount })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, activeReservation?.dinner_date, members.length, refresh]);



  const generateBookingLinks = useCallback(async (restaurantName: string, city: string, googlePlaceId?: string) => {
    if (!activeReservation) return null;
    try {
      const { data, error } = await supabase.functions.invoke('generate-booking-url', {
        body: {
          restaurant_name: restaurantName,
          google_place_id: googlePlaceId || null,
          city,
          dinner_date: activeReservation.dinner_date,
          dinner_time: activeReservation.dinner_time || '19:00',
          party_size: activeReservation.party_size,
        },
      });
      if (error) return null;
      return data?.links || null;
    } catch {
      return null;
    }
  }, [activeReservation]);

  // Reveal restaurant to group
  const revealRestaurant = useCallback(async () => {
    if (!activeReservation?.id) return false;
    const { error } = await supabase
      .from("reservations")
      .update({ status: "revealed" as const, revealed_at: new Date().toISOString() })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Cancel dinner — keeps availability but resets reservation
  const cancelDinner = useCallback(async () => {
    if (!activeReservation?.id) return false;
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" as const })
      .eq("id", activeReservation.id);
    if (error) return false;
    refresh();
    return true;
  }, [activeReservation?.id, refresh]);

  // Complete dinner (post-dinner) and trigger host rotation
  const completeDinner = useCallback(async () => {
    if (!activeReservation?.id || !activeGroupId) return false;
    const { error } = await supabase
      .from("reservations")
      .update({ status: "completed" as const })
      .eq("id", activeReservation.id);
    if (error) return false;

    // Trigger host rotation via edge function
    try {
      await supabase.functions.invoke('select-next-host', {
        body: { group_id: activeGroupId, reservation_id: activeReservation.id },
      });
    } catch (e) {
      console.error('Host rotation failed:', e);
    }

    refresh();
    return true;
  }, [activeReservation?.id, activeGroupId, refresh]);

  // Make a member the host
  const makeHost = useCallback(async (memberId: string) => {
    if (!activeGroupId) return false;
    await supabase.from("members").update({ is_host: false }).eq("group_id", activeGroupId);
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

  // ── REVIEWS ──
  const submitReview = useCallback(async (review: {
    restaurant_name: string;
    rating: number;
    review_text?: string;
    meal_type?: string;
    best_dish_member?: string;
    return_choice?: string;
    photo_url?: string;
    cuisine?: string;
    city?: string;
    reservation_id?: string;
  }) => {
    const currentMember = members.find(m => m.user_id === user.id);
    const { error } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        member_id: currentMember?.id || null,
        group_id: activeGroupId || null,
        restaurant_name: review.restaurant_name,
        rating: review.rating,
        review_text: review.review_text || null,
        meal_type: review.meal_type || "Dinner",
        best_dish_member: review.best_dish_member || null,
        return_choice: review.return_choice || null,
        photo_url: review.photo_url || null,
        cuisine: review.cuisine || null,
        city: review.city || null,
        reservation_id: review.reservation_id || null,
      });
    if (error) return false;
    refresh();
    return true;
  }, [user.id, activeGroupId, members, refresh]);

  // Upload review photo
  const uploadReviewPhoto = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from("review-photos").getPublicUrl(path);
    return urlData?.publicUrl || null;
  }, [user.id]);

  // ── BADGES ──
  const earnBadge = useCallback(async (badgeKey: string, badgeType: string = "individual") => {
    // Check if already earned
    if (userBadges.some(b => b.badge_key === badgeKey && (b.group_id === activeGroupId || !activeGroupId))) return;
    
    await supabase.from("user_badges").insert({
      user_id: user.id,
      badge_key: badgeKey,
      badge_type: badgeType,
      group_id: badgeType === "group" ? activeGroupId : null,
    });
    refresh();
  }, [user.id, activeGroupId, userBadges, refresh]);

  // ── GROUP SETTINGS ──
  const saveGroupSettings = useCallback(async (settings: Partial<GroupSettings>) => {
    if (!activeGroupId) return false;
    const { error } = await supabase
      .from("groups")
      .update(settings as any)
      .eq("id", activeGroupId);
    if (error) return false;
    setGroupSettings(prev => prev ? { ...prev, ...settings } : null);
    return true;
  }, [activeGroupId]);

  // Get current user's member record
  const currentMember = members.find(m => m.user_id === user.id);
  const isHost = currentMember?.is_host || false;
  const hostCount = currentMember?.host_count || 0;
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
    hostCount,
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
    generateBookingLinks,
    revealRestaurant,
    cancelDinner,
    completeDinner,
    makeHost,
    leaveGroup,
    refresh,
    // New
    communityReviews,
    submitReview,
    uploadReviewPhoto,
    userBadges,
    earnBadge,
    groupSettings,
    saveGroupSettings,
    selectRestaurantForReservation,
    selectedRestaurantData,
    isSoloGroup,
  };
}

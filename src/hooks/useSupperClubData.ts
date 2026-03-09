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

export interface DBGroup {
  id: string;
  name: string;
  code: string;
  city: string;
  members: number;
  dinnerStatus: "scheduled" | "pending_confirm" | "no_date" | "awaiting_host";
  nextDinner: string | null;
  pendingDate: string | null;
}

export function useSupperClubData(user: User, activeGroupId: string | null) {
  const [members, setMembers] = useState<DBMember[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [visitedRestaurants, setVisitedRestaurants] = useState<Restaurant[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [memberAvailability, setMemberAvailability] = useState<MemberAvailability>({});
  const [userSelectedDates, setUserSelectedDates] = useState<string[]>([]);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);

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
  }, [activeGroupId]);

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
  }, [activeGroupId]);

  // Load availability for active group (active reservation)
  useEffect(() => {
    if (!activeGroupId) { setMemberAvailability({}); setUserSelectedDates([]); setActiveReservationId(null); return; }
    
    const loadAvailability = async () => {
      // Find active (non-completed, non-cancelled) reservation for group
      const { data: reservations } = await supabase
        .from("reservations")
        .select("id, status")
        .eq("group_id", activeGroupId)
        .not("status", "in", '("completed","cancelled")')
        .order("created_at", { ascending: false })
        .limit(1);

      if (!reservations || reservations.length === 0) {
        setActiveReservationId(null);
        setMemberAvailability({});
        setUserSelectedDates([]);
        return;
      }

      const resId = reservations[0].id;
      setActiveReservationId(resId);

      // Load all member availability for this reservation
      const { data: avails } = await supabase
        .from("member_availability")
        .select("member_id, available_dates")
        .eq("reservation_id", resId);

      if (avails && avails.length > 0) {
        const avMap: MemberAvailability = {};
        const currentMember = members.find(m => m.user_id === user.id);
        
        avails.forEach(a => {
          const member = members.find(m => m.id === a.member_id);
          if (member) {
            const isYou = member.user_id === user.id;
            if (isYou) {
              setUserSelectedDates(a.available_dates);
            } else {
              avMap[member.name] = a.available_dates;
            }
          }
        });
        setMemberAvailability(avMap);
      }
    };

    if (members.length > 0) loadAvailability();
  }, [activeGroupId, members, user.id]);

  // Save availability for current user
  const saveAvailability = useCallback(async (dates: string[]) => {
    if (!activeGroupId) return false;
    
    const currentMember = members.find(m => m.user_id === user.id);
    if (!currentMember) return false;

    let reservationId = activeReservationId;

    // Create reservation if none exists
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
      setActiveReservationId(reservationId);
    }

    // Upsert availability
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
        .insert({
          reservation_id: reservationId,
          member_id: currentMember.id,
          available_dates: dates,
        });
    }

    setUserSelectedDates(dates);
    return true;
  }, [activeGroupId, activeReservationId, members, user.id]);

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

  // Get current user's member record
  const currentMember = members.find(m => m.user_id === user.id);
  const isHost = currentMember?.is_host || false;

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
    loadingMembers,
    loadingRestaurants,
    addRestaurantToPool,
    setRestaurants,
    setVisitedRestaurants,
    memberAvailability,
    userSelectedDates,
    saveAvailability,
    activeReservationId,
  };
}

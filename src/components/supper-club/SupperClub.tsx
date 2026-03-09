import { useState, useCallback, useEffect } from "react";
import {
  INDIVIDUAL_BADGES, GROUP_BADGES, MEMBERS, INITIAL_GROUPS,
  RESTAURANT_POOL, PREVIOUSLY_VISITED, PUBLIC_REVIEWS,
  WITTY_NO_DATE, MEAL_TYPES, PRICE_LABELS, WITTY_HOST_WAITING,
  SECRET_HOST_MESSAGES, HOST_PRIVILEGE_MESSAGES, WITTY_INITIATION_MESSAGES,
  WITTY_SKIP_MESSAGES,
  MAX_GROUP_MEMBERS,
  Group, Restaurant, MemberAvailability,
} from "@/data/supper-club-data";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useSupperClubData } from "@/hooks/useSupperClubData";
import { useRealtimeSubscriptions } from "@/hooks/useRealtimeSubscriptions";
import { useBadgeTriggers } from "@/hooks/useBadgeTriggers";
import { useNotifications } from "@/hooks/useNotifications";
import Onboarding from "./Onboarding";
import ReviewForm from "./ReviewForm";
import BadgesScreen from "./BadgesScreen";
import ProfileScreen from "./ProfileScreen";

interface SupperClubProps {
  user: User;
  signOut: () => Promise<void>;
}

interface GooglePlace {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  address: string;
  price: number;
  googleRating: number | null;
  googleReviewCount: number;
  googlePlaceId: string;
}
import { S, tabPill, chip } from "./styles";
import {
  StarRating, Toggle, PriceTag, RatingBadge,
  NavBar, CalendarGrid, MealTypeSelector, ShareRow, GlobalGroupSwitcher,
} from "./shared";

// ── Skeleton Loader ──
const SkeletonPulse = ({ width = "100%", height = "16px", borderRadius = "8px", style }: { width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties }) => (
  <div style={{
    width, height, borderRadius,
    background: "linear-gradient(90deg, rgba(201,149,106,0.06) 25%, rgba(201,149,106,0.12) 50%, rgba(201,149,106,0.06) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s ease-in-out infinite",
    ...style,
  }} />
);

const LoadingScreen = () => (
  <div style={S.app}><div style={S.phone}>
    <div style={S.screen}>
      <div style={{ padding: "54px 24px 20px" }}>
        <SkeletonPulse width="120px" height="12px" style={{ marginBottom: "12px" }} />
        <SkeletonPulse width="200px" height="32px" style={{ marginBottom: "24px" }} />
      </div>
      <div style={{ padding: "0 16px" }}>
        <SkeletonPulse height="120px" borderRadius="18px" style={{ marginBottom: "12px" }} />
        <SkeletonPulse height="80px" borderRadius="18px" style={{ marginBottom: "12px" }} />
        <SkeletonPulse height="60px" borderRadius="18px" style={{ marginBottom: "12px" }} />
      </div>
    </div>
  </div></div>
);

export default function SupperClub({ user, signOut }: SupperClubProps) {
  const MAX_GROUPS = 15;
  const userName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || "You";
  const [screen, setScreen] = useState<string>("loading");
  const [groups, setGroups] = useState<Group[]>([]);
  const EMPTY_GROUP: Group = { id: 0 as any, name: "", code: "", members: 0, city: "", dinnerStatus: "no_date", nextDinner: null, pendingDate: null };
  const [activeGroup, setActiveGroup] = useState<Group>(EMPTY_GROUP);
  const [activeTab, setActiveTab] = useState("home");

  // Load user's groups from DB on mount (and handle invite links)
  useEffect(() => {
    const loadGroups = async () => {
      // Check for invite link in URL
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get("invite");

      // Check if user has any groups via members table
      const { data: memberRows } = await supabase
        .from("members")
        .select("group_id, groups(id, name, code, city)")
        .eq("user_id", user.id);
      
      if (memberRows && memberRows.length > 0) {
        const loadedGroups: Group[] = memberRows
          .filter((m: any) => m.groups)
          .map((m: any) => ({
            id: m.groups.id,
            name: m.groups.name,
            code: m.groups.code,
            members: 0,
            city: m.groups.city,
            dinnerStatus: "no_date" as const,
            nextDinner: null,
            pendingDate: null,
          }));
        if (loadedGroups.length > 0) {
          setGroups(loadedGroups);
          setActiveGroup(loadedGroups[0]);
          setScreen("club_home");
          setActiveTab("home");
          // Clear invite param from URL
          if (inviteCode) {
            window.history.replaceState({}, "", window.location.pathname);
          }
          return;
        }
      }
      // New user — check for invite link
      if (inviteCode) {
        setJoinMode("join");
        setJoinCode(inviteCode);
        setScreen("join_create");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      // New user — show onboarding if not yet completed
      const onboarded = localStorage.getItem("sc_onboarded");
      setScreen(onboarded ? "welcome" : "onboarding");
    };
    loadGroups();
  }, [user.id]);

  // Data hook for DB-backed members, restaurants
  const activeGroupId = typeof activeGroup.id === 'string' ? activeGroup.id : null;
  const dbData = useSupperClubData(user, activeGroupId);

  // Realtime subscriptions for live updates
  useRealtimeSubscriptions(activeGroupId, dbData.refresh);

  // Auto-earn badges based on activity
  useBadgeTriggers(
    dbData.communityReviews,
    dbData.userBadges,
    user.id,
    dbData.isHost,
    dbData.earnBadge,
    activeGroupId
  );

  // Notifications
  const memberIdsForNotif = dbData.currentMember ? [dbData.currentMember.id] : [];
  const notifs = useNotifications(user, memberIdsForNotif);

  // Review form and profile state
  const [showReviewForm, setShowReviewForm] = useState<{ restaurant: string; cuisine?: string; city?: string; reservationId?: string } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bookingLinks, setBookingLinks] = useState<{ google: string; opentable?: string; resy?: string; yelp?: string } | null>(null);
  const [postDinnerReviewPrompt, setPostDinnerReviewPrompt] = useState(false);

  // Sync DB-loaded availability into local state
  useEffect(() => {
    if (dbData.userSelectedDates.length > 0) {
      setSelectedDates(dbData.userSelectedDates);
    }
  }, [dbData.userSelectedDates]);

  useEffect(() => {
    if (Object.keys(dbData.memberAvailability).length > 0) {
      setMemberAvailability(dbData.memberAvailability);
    }
  }, [dbData.memberAvailability]);

  const [joinMode, setJoinMode] = useState<"create" | "join" | null>(null);
  const [badgeTab, setBadgeTab] = useState("individual");
  const [toast, setToast] = useState<string | null>(null);
  const [wittyIdx] = useState(Math.floor(Math.random() * WITTY_NO_DATE.length));
  const [wittyHostIdx] = useState(Math.floor(Math.random() * WITTY_HOST_WAITING.length));
  const [wittyInitiationIdx] = useState(Math.floor(Math.random() * WITTY_INITIATION_MESSAGES.length));
  const [awaitingInitiation, setAwaitingInitiation] = useState(false);
  const [availabilityModifying, setAvailabilityModifying] = useState(false);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCity, setNewGroupCity] = useState("");
  const [groupAdmin, setGroupAdmin] = useState(userName);
  const [groupCreator] = useState(userName);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  // Member availability tracking
  const [memberAvailability, setMemberAvailability] = useState<MemberAvailability>({});
  const [hostSelectedDate, setHostSelectedDate] = useState<string | null>(null);

  // Use DB-backed restaurants when available, else local pool
  const [groupPools, setGroupPools] = useState<Record<string | number, Restaurant[]>>({});
  const poolRestaurants = dbData.restaurants.length > 0 ? dbData.restaurants : (groupPools[activeGroup.id] || []);
  const setPoolRestaurants = (fn: (p: Restaurant[]) => Restaurant[]) => {
    setGroupPools(prev => ({ ...prev, [activeGroup.id]: fn(prev[activeGroup.id] || []) }));
  };
  const visitedRestaurants = dbData.visitedRestaurants;

  // Use DB members when available, else fallback to static MEMBERS
  const currentMembers = dbData.uiMembers.length > 0 ? dbData.uiMembers : MEMBERS;

  // Add restaurant to group pool(s) - DB-backed
  const addToGroupPool = (restaurant: Restaurant, groupIds: (number | string)[]) => {
    groupIds.forEach(gid => {
      const gidStr = String(gid);
      dbData.addRestaurantToPool({
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        city: restaurant.city,
        price: restaurant.price,
        googleRating: restaurant.googleRating,
        googleReviewCount: restaurant.googleReviewCount,
      }, gidStr);
    });
  };

  const [exploreView, setExploreView] = useState("search");
  const [visitedSort, setVisitedSort] = useState("date");
  const [visitedFilter, setVisitedFilter] = useState("all");
  const [exploreCuisineFilter, setExploreCuisineFilter] = useState("all");
  const [explorePriceFilter, setExplorePriceFilter] = useState("all");
  const [selectedPublicR, setSelectedPublicR] = useState<string | null>(null);
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState<Restaurant | GooglePlace | null>(null);
  const [addToGroupPicker, setAddToGroupPicker] = useState<{ restaurant: Restaurant; visible: boolean }>({ restaurant: RESTAURANT_POOL[0], visible: false });
  const [addToGroupSelected, setAddToGroupSelected] = useState<number[]>([]);
  const [rName, setRName] = useState("");
  const [rCuisine, setRCuisine] = useState("");
  const [rCity, setRCity] = useState("");
  const [rPrice, setRPrice] = useState(3);

  const [freeReviewRestaurant, setFreeReviewRestaurant] = useState("");
  const [freeReviewRating, setFreeReviewRating] = useState(0);
  const [freeReviewText, setFreeReviewText] = useState("");
  const [freeReviewMealType, setFreeReviewMealType] = useState("Dinner");
  const [freeReviewPhoto, setFreeReviewPhoto] = useState(false);
  const [freeReviewCity, setFreeReviewCity] = useState("");
  const [freeReviewCuisine, setFreeReviewCuisine] = useState("");
  const [freeReviewShowSuggestions, setFreeReviewShowSuggestions] = useState(false);

  const allKnownRestaurants = [...RESTAURANT_POOL, ...PREVIOUSLY_VISITED];
  const restaurantSuggestions = freeReviewRestaurant.length >= 2
    ? allKnownRestaurants.filter(r => r.name.toLowerCase().includes(freeReviewRestaurant.toLowerCase()))
    : [];

  const [searchRadius, setSearchRadius] = useState(10);

  // Google Places search state
  const [gpResults, setGpResults] = useState<GooglePlace[]>([]);
  const [gpLoading, setGpLoading] = useState(false);
  const [gpFreeResults, setGpFreeResults] = useState<GooglePlace[]>([]);
  const [gpFreeLoading, setGpFreeLoading] = useState(false);

  // Mock restaurant detail data
  const mockRestaurantPhotos = ["I", "II", "III", "IV", "V", "VI"];
  const mockRestaurantReviews = [
    { group: "The Velvet Fork", member: "Marisol", rating: 4.8, text: "An extraordinary dining experience. The attention to detail in every dish was remarkable.", date: "Feb 2026", hasPhoto: true },
    { group: "Tuesday Table", member: "Derek", rating: 4.6, text: "Perfectly charming. The sommelier remembered us from last time. Unsettling. Wonderful.", date: "Jan 2026", hasPhoto: true },
    { group: "The Midnight Fork", member: "Priya", rating: 5.0, text: "Flawless execution. We gave it a perfect score and immediately questioned our life choices.", date: "Mar 2026", hasPhoto: false },
    { group: "Six at the Table", member: "You", rating: 4.7, text: "The omakase was extraordinary. The presentation alone was worth the visit.", date: "Feb 2026", hasPhoto: true },
  ];

  const searchGooglePlaces = useCallback(async (query: string, city: string, setter: (r: GooglePlace[]) => void, setLoading: (b: boolean) => void) => {
    if (query.length < 2) { setter([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-restaurants', {
        body: { query, city: city || activeGroup.city || "New York, NY", radius: searchRadius },
      });
      if (error) throw error;
      setter(data?.restaurants || []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup.city, searchRadius]);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [postDinnerDates, setPostDinnerDates] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState(["Dinner"]);
  const [confirmationVotes, setConfirmationVotes] = useState<Record<string, boolean>>({ Marisol:true, Derek:true, Priya:false, You:false });

  const [autoSubmit, setAutoSubmit] = useState(false);
  const [noRepeats, setNoRepeats] = useState(true);
  const [repeatMonths, setRepeatMonths] = useState(6);
  const [cutoffDays, setCutoffDays] = useState(7);
  const [allowedMealTypes, setAllowedMealTypes] = useState(["Dinner"]);
  const [resTimeStart, setResTimeStart] = useState("6:00 PM");
  const [resTimeEnd, setResTimeEnd] = useState("9:00 PM");

  // Sync group settings from DB
  useEffect(() => {
    if (dbData.groupSettings) {
      setAutoSubmit(dbData.groupSettings.auto_submit);
      setNoRepeats(dbData.groupSettings.no_repeats);
      setRepeatMonths(dbData.groupSettings.repeat_months);
      setCutoffDays(dbData.groupSettings.cutoff_days);
      setAllowedMealTypes(dbData.groupSettings.allowed_meal_types);
      setResTimeStart(dbData.groupSettings.res_time_start);
      setResTimeEnd(dbData.groupSettings.res_time_end);
      setSearchRadius(dbData.groupSettings.search_radius);
    }
  }, [dbData.groupSettings]);

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [returnChoice, setReturnChoice] = useState<string | null>(null);
  const [bestDishMember, setBestDishMember] = useState<string | null>(null);

  const [revealUnlocked, setRevealUnlocked] = useState(false);
  const [bookingDateConfirm, setBookingDateConfirm] = useState(false);
  const [restaurantDescription, setRestaurantDescription] = useState<string | null>(null);
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  // Post-dinner reset: 2 hours after reservation time, reset for next cycle
  const [dinnerCompletedAt, setDinnerCompletedAt] = useState<string | null>(null);

  const resetForNextDinner = useCallback(() => {
    setSelectedDates([]);
    setPostDinnerDates([]);
    setAvailabilityModifying(false);
    setHostSelectedDate(null);
    setConfirmationVotes({ Marisol: false, Derek: false, Priya: false, You: false });
    setReviewRating(0);
    setReviewText("");
    setPhotoSubmitted(false);
    setReturnChoice(null);
    setBestDishMember(null);
    setRevealUnlocked(false);
    setBookingDateConfirm(false);
    setAwaitingInitiation(false);
    setMemberAvailability({ Marisol: [], Derek: [], Priya: [] });
  }, []);

  const fetchRestaurantDescription = useCallback(async (name: string, cuisine: string, city: string, reviews: any[]) => {
    setDescriptionLoading(true);
    setRestaurantDescription(null);
    try {
      const { data, error } = await supabase.functions.invoke('describe-restaurant', {
        body: { restaurantName: name, cuisine, city, reviews },
      });
      if (error) throw error;
      setRestaurantDescription(data?.description || null);
    } catch {
      setRestaurantDescription("A distinguished establishment worthy of your attention.");
    } finally {
      setDescriptionLoading(false);
    }
  }, []);

  const openRestaurantDetail = useCallback((r: Restaurant | GooglePlace) => {
    setSelectedRestaurantDetail(r);
    const cuisine = 'cuisine' in r ? r.cuisine : 'Restaurant';
    const reviews = PUBLIC_REVIEWS.filter(rev => rev.restaurant === r.name).map(rev => ({ text: rev.review, rating: rev.rating }));
    fetchRestaurantDescription(r.name, cuisine, r.city, reviews);
  }, [fetchRestaurantDescription]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const updateGroup = (id: number, patch: Partial<Group>) => {
    const updated = groups.map(g => g.id === id ? { ...g, ...patch } : g) as Group[];
    setGroups(updated);
    if (activeGroup.id === id) setActiveGroup({ ...activeGroup, ...patch } as Group);
  };

  const toggleMealType = (type: string, arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>) => {
    setArr(p => p.includes(type) ? (p.length > 1 ? p.filter(x => x !== type) : p) : [...p, type]);
  };

  const onNavigate = (tab: string, scr: string) => { setActiveTab(tab); setScreen(scr); };

  const iEarned = INDIVIDUAL_BADGES.filter(b => b.earned).length;
  const gEarned = GROUP_BADGES.filter(b => b.earned).length;
  const confirmedCount = Object.values(confirmationVotes).filter(Boolean).length;
  const allConfirmed = confirmedCount === currentMembers.length;

  const sortedVisited = [...visitedRestaurants].sort((a, b) => {
    if (visitedSort === "rating") return (b.visitedRating || 0) - (a.visitedRating || 0);
    if (visitedSort === "price") return b.price - a.price;
    return new Date(b.visitedDate || 0).getTime() - new Date(a.visitedDate || 0).getTime();
  });

  // ── ONBOARDING ──
  if (screen === "onboarding") return (
    <Onboarding
      userName={userName}
      onComplete={() => {
        localStorage.setItem("sc_onboarded", "1");
        setScreen("welcome");
      }}
    />
  );

  // ── WELCOME ──
  if (screen === "welcome") return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.welcomeBg}>
        <div style={S.orb}/>
        <div style={S.eyebrow}>Est. 2026</div>
        <div style={S.mainTitle}>The Supper Club</div>
        <div style={{ ...S.subtitle, marginBottom:"12px" }}>Welcome, {userName}.</div>
        <div style={S.ornament}>— · —</div>
        <button style={S.primaryBtn} onClick={() => { setJoinMode("create"); setNewGroupName(""); setNewGroupCity(""); setScreen("join_create"); }}>Create a Club</button>
        <button style={S.secondaryBtn} onClick={() => { setJoinMode("join"); setJoinCode(""); setScreen("join_create"); }}>Join with Invite Code</button>
        <button
          style={{ background:"none", border:"none", color:"#7a5a40", fontSize:"12px", letterSpacing:"1px", cursor:"pointer", fontFamily:"Georgia,serif", marginTop:"20px", padding:"8px" }}
          onClick={() => { setScreen("explore"); setActiveTab("explore"); }}
        >
          Skip for now
        </button>
        <div style={{ marginTop:"20px" }}>
          <button onClick={signOut} style={{ background:"none", border:"none", color:"#4a2e18", fontSize:"11px", letterSpacing:"1px", cursor:"pointer", fontFamily:"Georgia,serif" }}>Sign Out</button>
        </div>
      </div>
    </div></div>
  );

  // No-group placeholder helper
  const hasGroup = groups.length > 0 && activeGroup.id !== (EMPTY_GROUP.id as any);
  const NoGroupPlaceholder = ({ feature }: { feature: string }) => (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={{ padding:"54px 24px 20px", borderBottom:"1px solid rgba(201,149,106,0.1)" }}>
          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"4px" }}>The Supper Club</div>
          <div style={{ fontSize:"30px", color:"#f5e6d3", fontWeight:"400" }}>{feature}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"64px 32px", textAlign:"center" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"16px", background:"rgba(201,149,106,0.08)", border:"1px solid rgba(201,149,106,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", color:"#c9956a", marginBottom:"24px" }}>
            ◇
          </div>
          <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"12px", fontWeight:"400" }}>
            Join or create a club first
          </div>
          <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.8", marginBottom:"28px", maxWidth:"280px" }}>
            Please create or join a club to access {feature.toLowerCase()}. Your dining journey begins with a group.
          </div>
          <button style={{ ...S.primaryBtn, maxWidth:"260px" }} onClick={() => { setJoinMode("create"); setNewGroupName(""); setNewGroupCity(""); setScreen("join_create"); }}>Create a Club</button>
          <button style={{ ...S.secondaryBtn, maxWidth:"260px" }} onClick={() => { setJoinMode("join"); setJoinCode(""); setScreen("join_create"); }}>Join with Invite Code</button>
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
  );

  // Helper: create group in DB
  const createGroupInDB = async (name: string, city: string) => {
    const code = "SUPR-" + Math.floor(1000 + Math.random() * 9000);
    const { data: groupData, error: groupErr } = await supabase
      .from("groups")
      .insert({ name, city, code })
      .select()
      .single();
    if (groupErr || !groupData) { showToast("Failed to create club. Try again."); return; }

    // Add current user as a member
    const avatarColors = ["#c9956a", "#7a9e7e", "#9b7ec8", "#c45c5c", "#4a8bc2", "#c4a35c"];
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    await supabase.from("members").insert({
      group_id: groupData.id,
      user_id: user.id,
      name: userName,
      avatar_color: color,
      is_host: true,
    });

    const newGroup: Group = {
      id: groupData.id as any,
      name: groupData.name,
      code: groupData.code,
      members: 1,
      city: groupData.city,
      dinnerStatus: "no_date",
      nextDinner: null,
      pendingDate: null,
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
    setGroupAdmin(userName);
    setScreen("club_home");
    setActiveTab("home");
    showToast(`${name} created! Share code ${code} to invite friends.`);
  };

  // Helper: join group by code
  const joinGroupByCode = async (code: string) => {
    const { data: groupData, error: findErr } = await supabase
      .from("groups")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();
    if (findErr || !groupData) { showToast("Club not found. Check the invite code."); return; }

    // Check if already a member
    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("group_id", groupData.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) { showToast("You're already in this club!"); return; }

    const avatarColors = ["#c9956a", "#7a9e7e", "#9b7ec8", "#c45c5c", "#4a8bc2", "#c4a35c"];
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    await supabase.from("members").insert({
      group_id: groupData.id,
      user_id: user.id,
      name: userName,
      avatar_color: color,
      is_host: false,
    });

    const newGroup: Group = {
      id: groupData.id as any,
      name: groupData.name,
      code: groupData.code,
      members: 0,
      city: groupData.city,
      dinnerStatus: "no_date",
      nextDinner: null,
      pendingDate: null,
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
    setScreen("club_home");
    setActiveTab("home");
    showToast(`Welcome to ${groupData.name}!`);
  };

  // ── JOIN/CREATE ──
  if (screen === "join_create") return (
    <div style={S.app}><div style={S.phone}>
      <div style={{ ...S.welcomeBg, justifyContent:"flex-start", paddingTop:"72px" }}>
        <div style={{ alignSelf:"flex-start", marginBottom:"28px" }}>
          <button onClick={() => setScreen("welcome")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"22px", cursor:"pointer" }}>←</button>
        </div>
        <div style={{ width:"100%" }}>
          {joinMode === "create" ? (<>
            <div style={{ ...S.mainTitle, fontSize:"34px", textAlign:"left", marginBottom:"6px" }}>Create Your Club</div>
            <div style={{ ...S.subtitle, textAlign:"left", marginBottom:"28px" }}>Name your circle of diners</div>
            <label style={S.label}>Club Name</label>
            <input style={S.input} placeholder="e.g. The Golden Table" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}/>
            <label style={S.label}>City</label>
            <input style={S.input} placeholder="e.g. New York, NY" value={newGroupCity} onChange={e => setNewGroupCity(e.target.value)}/>
            <label style={S.label}>Search Radius</label>
            <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
              {[5, 10, 15, 25, 50].map(r => (
                <div key={r} onClick={() => setSearchRadius(r)} style={chip(searchRadius === r)}>{r} mi</div>
              ))}
            </div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px" }}>
              Restaurants within {searchRadius} miles of your city will appear in your pool.
            </div>
            <div style={{ height:"12px" }}/>
            <button style={S.primaryBtn} onClick={() => {
              if (!newGroupName.trim()) { showToast("Give your club a name."); return; }
              if (!newGroupCity.trim()) { showToast("Enter your city."); return; }
              createGroupInDB(newGroupName.trim(), newGroupCity.trim());
            }}>Create &amp; Get Invite Code</button>
          </>) : (<>
            <div style={{ ...S.mainTitle, fontSize:"34px", textAlign:"left", marginBottom:"6px" }}>Join a Club</div>
            <div style={{ ...S.subtitle, textAlign:"left", marginBottom:"28px" }}>Enter your invite code</div>
            <label style={S.label}>Invite Code</label>
            <input style={S.input} placeholder="e.g. SUPR-4829" value={joinCode} onChange={e => setJoinCode(e.target.value)}/>
            <div style={{ height:"12px" }}/>
            <button style={S.primaryBtn} onClick={() => {
              if (!joinCode.trim()) { showToast("Enter an invite code."); return; }
              joinGroupByCode(joinCode.trim());
            }}>Join Club</button>
          </>)}
        </div>
      </div>
    </div></div>
  );

  // ── NEW CLUB (in-app) ──
  if (screen === "new_club") return (
    <div style={S.app}><div style={S.phone}>
      <div style={{ ...S.welcomeBg, justifyContent:"flex-start", paddingTop:"72px" }}>
        <div style={{ alignSelf:"flex-start", marginBottom:"28px" }}>
          <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"22px", cursor:"pointer" }}>←</button>
        </div>
        <div style={{ width:"100%" }}>
          <div style={{ ...S.mainTitle, fontSize:"34px", textAlign:"left", marginBottom:"6px" }}>Create New Club</div>
          <div style={{ ...S.subtitle, textAlign:"left", marginBottom:"28px" }}>Start a new circle of diners</div>
          <label style={S.label}>Club Name</label>
          <input style={S.input} placeholder="e.g. Wine Wednesday Crew" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
          <label style={S.label}>City</label>
          <input style={S.input} placeholder="e.g. New York, NY" value={newGroupCity} onChange={e => setNewGroupCity(e.target.value)} />
          <label style={S.label}>Search Radius</label>
          <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
            {[5, 10, 15, 25, 50].map(r => (
              <div key={r} onClick={() => setSearchRadius(r)} style={chip(searchRadius === r)}>{r} mi</div>
            ))}
          </div>
          <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px" }}>
            Restaurants within {searchRadius} miles of your city will appear in your pool.
          </div>
          <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginBottom:"20px" }}>{groups.length} of {MAX_GROUPS} clubs used</div>
          <button style={S.primaryBtn} onClick={() => {
            if (!newGroupName.trim()) { showToast("Name your club first."); return; }
            createGroupInDB(newGroupName.trim(), newGroupCity.trim() || "New York, NY");
          }}>Create & Get Invite Code</button>
          <button style={S.ghostBtn} onClick={() => { setNewGroupName(""); setNewGroupCity(""); setScreen("club_home"); }}>Cancel</button>
        </div>
      </div>
    </div></div>
  );

  // ── JOIN CLUB (in-app) ──
  if (screen === "join_club_inapp") return (
    <div style={S.app}><div style={S.phone}>
      <div style={{ ...S.welcomeBg, justifyContent:"flex-start", paddingTop:"72px" }}>
        <div style={{ alignSelf:"flex-start", marginBottom:"28px" }}>
          <button onClick={() => { setJoinCode(""); setJoinName(""); setScreen("club_home"); }} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"22px", cursor:"pointer" }}>←</button>
        </div>
        <div style={{ width:"100%" }}>
          <div style={{ ...S.mainTitle, fontSize:"34px", textAlign:"left", marginBottom:"6px" }}>Join a Club</div>
          <div style={{ ...S.subtitle, textAlign:"left", marginBottom:"28px" }}>Enter your invite code to join an existing club</div>
          <label style={S.label}>Invite Code</label>
          <input style={S.input} placeholder="e.g. SUPR-4829" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
          <label style={S.label}>Your Display Name</label>
          <input style={S.input} placeholder="Your name" value={joinName} onChange={e => setJoinName(e.target.value)} />
          <div style={{ height:"12px" }}/>
          <button style={S.primaryBtn} onClick={() => {
            if (!joinCode.trim()) { showToast("Please enter an invite code."); return; }
            joinGroupByCode(joinCode.trim());
          }}>Join Club</button>
          <button style={S.ghostBtn} onClick={() => { setJoinCode(""); setJoinName(""); setScreen("club_home"); }}>Cancel</button>
        </div>
      </div>
    </div></div>
  );


  if (screen === "club_home") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Home" />;
    const ag = { ...activeGroup, dinnerStatus: dbData.dinnerStatus, nextDinner: dbData.nextDinner, pendingDate: dbData.pendingDate };
    const noDate = ag.dinnerStatus === "no_date";
    const pending = ag.dinnerStatus === "pending_confirm";
    
    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />

          <div style={{ padding:"16px 24px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"28px", color:"#f5e6d3", fontWeight:"400" }}>Good evening.</div>
            <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
              {/* Notification Bell */}
              <div onClick={() => setShowNotifications(true)} style={{ position:"relative", cursor:"pointer", padding:"4px" }}>
                <span style={{ fontSize:"18px", color: notifs.unreadCount > 0 ? "#c9956a" : "#4a2e18" }}>◉</span>
                {notifs.unreadCount > 0 && (
                  <div style={{ position:"absolute", top:0, right:0, width:"14px", height:"14px", borderRadius:"50%", background:"#c45c5c", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"8px", color:"#fff", fontWeight:"700" }}>
                    {notifs.unreadCount}
                  </div>
                )}
              </div>
              <div onClick={() => setShowProfile(true)} style={{ width:"36px", height:"36px", borderRadius:"50%", background: user.user_metadata?.avatar_color || "#c9956a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#fff", fontWeight:"700", cursor:"pointer", border:"2px solid rgba(201,149,106,0.3)" }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Awaiting Initiation - shown when user joins after host has booked */}
          {awaitingInitiation && ag.dinnerStatus === "scheduled" && (
            <div style={{ padding:"0 16px", marginBottom:"16px" }}>
              <div style={{ 
                background:"linear-gradient(135deg, rgba(201,149,106,0.06), rgba(26,15,10,0.95))", 
                border:"1px solid rgba(201,149,106,0.25)", 
                borderRadius:"16px", 
                padding:"32px 24px", 
                textAlign:"center" 
              }}>
                <div style={{ fontSize:"24px", marginBottom:"16px", color:"#c9956a" }}>◈</div>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"12px" }}>
                  Awaiting Initiation
                </div>
                <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"12px", fontWeight:"500", lineHeight:"1.5" }}>
                  Welcome to {ag.name}
                </div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px", fontStyle:"italic", lineHeight:"1.7" }}>
                  {WITTY_INITIATION_MESSAGES[wittyInitiationIdx]}
                </div>
                <div style={{ 
                  background:"rgba(201,149,106,0.08)", 
                  borderRadius:"12px", 
                  padding:"16px", 
                  marginBottom:"16px" 
                }}>
                  <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>
                    Current Dinner Status
                  </div>
                  <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"4px" }}>
                    {ag.nextDinner || "Date TBD"}
                  </div>
                  <div style={{ fontSize:"12px", color:"#5a3a25" }}>
                    Reservation booked · You'll join the next one
                  </div>
                </div>
                <div style={{ 
                  background:"rgba(122,158,126,0.08)", 
                  borderRadius:"10px", 
                  padding:"14px", 
                  marginBottom:"16px" 
                }}>
                  <div style={{ fontSize:"12px", color:"#7a9e7e", lineHeight:"1.6" }}>
                    <strong>What happens next?</strong><br/>
                    After the group completes their dinner, you'll be fully activated and can participate in scheduling the next one.
                  </div>
                </div>
                <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic" }}>
                  In the meantime, feel free to explore the restaurant pool and get to know the group.
                </div>
              </div>
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 16px", marginBottom:"4px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"11px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase" }}>Invite Code</span>
              <span style={{ fontSize:"14px", color:"#f5e6d3", fontWeight:"600", letterSpacing:"3px" }}>{ag.code}</span>
            </div>
            <div style={{ display:"flex", gap:"6px" }}>
              <button 
                onClick={() => { navigator.clipboard.writeText(ag.code); showToast("Invite code copied!"); }}
                style={{ 
                  background:"rgba(201,149,106,0.12)", border:"1px solid rgba(201,149,106,0.25)", 
                  borderRadius:"8px", padding:"6px 12px", cursor:"pointer",
                  fontSize:"11px", color:"#c9956a", letterSpacing:"0.5px", fontFamily:"Georgia,serif"
                }}>
                Code
              </button>
              <button 
                onClick={() => { 
                  const link = `${window.location.origin}/?invite=${ag.code}`;
                  navigator.clipboard.writeText(link); 
                  showToast("Invite link copied!"); 
                }}
                style={{ 
                  background:"linear-gradient(135deg,rgba(201,149,106,0.2),rgba(201,149,106,0.08))", border:"1px solid rgba(201,149,106,0.35)", 
                  borderRadius:"8px", padding:"6px 12px", cursor:"pointer",
                  fontSize:"11px", color:"#c9956a", letterSpacing:"0.5px", fontFamily:"Georgia,serif"
                }}>
                Share Link
              </button>
            </div>
          </div>

          {ag.dinnerStatus === "scheduled" && (() => {
            const hostIsYou = dbData.isHost;
            const mockRestaurant = { name: "Osteria Morini", cuisine: "Northern Italian", city: activeGroup.city || "New York", googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4" };
            
            // Auto-fetch booking links for host
            const fetchLinks = async () => {
              if (hostIsYou && !bookingLinks) {
                const links = await dbData.generateBookingLinks(mockRestaurant.name, mockRestaurant.city, mockRestaurant.googlePlaceId);
                if (links) setBookingLinks(links);
              }
            };
            if (hostIsYou && !bookingLinks) fetchLinks();
            
            return hostIsYou ? (
              <div style={{ ...S.card, border:"2px solid rgba(201,149,106,0.4)", background:"linear-gradient(135deg, rgba(201,149,106,0.08), rgba(26,15,10,0.95))" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                  <span style={{ fontSize:"14px", color:"#c9956a" }}>◆</span>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase" }}>For Your Eyes Only</div>
                </div>
                <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px", lineHeight:"1.7" }}>
                  You hold the secret. The group suspects nothing. Guard this information with your life (or at least until 8 AM on dinner day).
                </div>
                <div style={{ background:"rgba(201,149,106,0.1)", borderRadius:"12px", padding:"16px", marginBottom:"16px" }}>
                  <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>The Secret Destination</div>
                  <div style={{ fontSize:"24px", color:"#f5e6d3", marginBottom:"4px", fontWeight:"500" }}>{mockRestaurant.name}</div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>{mockRestaurant.cuisine} · {mockRestaurant.city}</div>
                </div>
                <div style={{ fontSize:"12px", color:"#f5e6d3", marginBottom:"12px", fontWeight:"500" }}>Secure the Reservation</div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"16px" }}>
                  <a href={bookingLinks?.google || `https://www.google.com/maps/search/${encodeURIComponent(mockRestaurant.name)}+${encodeURIComponent(mockRestaurant.city)}`} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.15)", textDecoration:"none", cursor:"pointer" }}>
                    <span style={{ fontSize:"12px", color:"#7a9e7e" }}>◎</span>
                    <span style={{ fontSize:"13px", color:"#f5e6d3" }}>Google Maps</span>
                    <span style={{ fontSize:"11px", color:"#5a3a25", marginLeft:"auto" }}>often has direct booking</span>
                  </a>
                  <a href={bookingLinks?.opentable || `https://www.opentable.com/s?term=${encodeURIComponent(mockRestaurant.name)}`} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.15)", textDecoration:"none", cursor:"pointer" }}>
                    <span style={{ fontSize:"12px", color:"#c9956a" }}>◎</span>
                    <span style={{ fontSize:"13px", color:"#f5e6d3" }}>OpenTable</span>
                    <span style={{ fontSize:"11px", color:"#5a3a25", marginLeft:"auto" }}>real-time availability</span>
                  </a>
                  <a href={bookingLinks?.resy || `https://resy.com/?query=${encodeURIComponent(mockRestaurant.name)}`} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"rgba(255,255,255,0.04)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.15)", textDecoration:"none", cursor:"pointer" }}>
                    <span style={{ fontSize:"12px", color:"#9b7ec8" }}>◎</span>
                    <span style={{ fontSize:"13px", color:"#f5e6d3" }}>Resy</span>
                    <span style={{ fontSize:"11px", color:"#5a3a25", marginLeft:"auto" }}>trending spots</span>
                  </a>
                </div>
                <div style={{ background:"rgba(122,158,126,0.1)", borderRadius:"10px", padding:"12px", marginBottom:"12px" }}>
                  <div style={{ fontSize:"12px", color:"#7a9e7e", lineHeight:"1.6" }}>
                    <strong>Reminder:</strong> Your group agreed on <strong>{ag.nextDinner}</strong>. Please book the reservation for that date. Party of {currentMembers.length}.
                  </div>
                </div>
                {!bookingDateConfirm ? (
                  <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #7a9e7e, #5a7a5e)" }} onClick={() => {
                    setBookingDateConfirm(true);
                  }}>
                    I've Booked It
                  </button>
                ) : (
                  <div style={{ background:"rgba(122,158,126,0.06)", border:"1px solid rgba(122,158,126,0.3)", borderRadius:"14px", padding:"20px", marginBottom:"12px" }}>
                    <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"10px", fontWeight:"500", textAlign:"center" }}>Confirm Booking Details</div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", textAlign:"center", lineHeight:"1.6" }}>
                      Please confirm you booked the reservation for the date the group selected.
                    </div>
                    <div style={{ background:"rgba(122,158,126,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"16px", textAlign:"center" }}>
                      <div style={{ fontSize:"10px", color:"#7a9e7e", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>Agreed Date</div>
                      <div style={{ fontSize:"18px", color:"#f5e6d3", fontWeight:"500" }}>{ag.nextDinner}</div>
                      <div style={{ fontSize:"12px", color:"#7a5a40", marginTop:"4px" }}>Party of {currentMembers.length}</div>
                    </div>
                    <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #7a9e7e, #5a7a5e)" }} onClick={async () => {
                      const success = await dbData.confirmBooking();
                      if (success) {
                        showToast("Reservation confirmed for " + ag.nextDinner + ". The secret is safe.");
                      } else {
                        showToast("Failed to confirm. Try again.");
                      }
                      setBookingDateConfirm(false);
                    }}>
                      Yes, Booked for {ag.nextDinner}
                    </button>
                    <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={() => setBookingDateConfirm(false)}>
                      Go Back
                    </button>
                  </div>
                )}
                <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={() => {
                  const wittyMsg = WITTY_SKIP_MESSAGES[Math.floor(Math.random() * WITTY_SKIP_MESSAGES.length)];
                  showToast(wittyMsg);
                }}>
                  Skip This One
                </button>
              </div>
            ) : (
              <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.18)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <span style={{ fontSize:"12px", color:"#c9956a" }}>◇</span>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase" }}>Next Dinner</div>
                </div>
                <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>Destination Unknown</div>
                <div style={{ fontSize:"13px", color:"#7a5a40" }}>{ag.nextDinner} · 7:30 PM</div>
                <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"3px", fontStyle:"italic" }}>Only the host knows where you're going...</div>
                <div style={{ marginTop:"14px", padding:"10px 14px", background:"rgba(201,149,106,0.07)", borderRadius:"10px", fontSize:"12px", color:"#c9956a", textAlign:"center" }}>
                  Restaurant revealed at 8 AM on dinner day
                </div>
              </div>
            );
          })()}

          {/* Post-Dinner Reset Card */}
          {dinnerCompletedAt && (
            <div style={{ ...S.card, border:"1px solid rgba(122,158,126,0.3)", background:"linear-gradient(135deg, rgba(122,158,126,0.06), rgba(26,15,10,0.95))", textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:"20px", color:"#7a9e7e", marginBottom:"12px" }}>◈</div>
              <div style={{ fontSize:"11px", color:"#7a9e7e", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>Dinner Complete</div>
              <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"500", lineHeight:"1.5" }}>
                Another evening for the books.
              </div>
              <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>
                Time to share your thoughts and start planning the next one.
              </div>
              <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #c9956a, #9a6040)" }} onClick={() => {
                setPostDinnerReviewPrompt(true);
              }}>
                Write Your Review
              </button>
              <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={async () => {
                resetForNextDinner();
                setBookingLinks(null);
                await dbData.completeDinner();
                setDinnerCompletedAt(null);
                setScreen("availability");
                setActiveTab("schedule");
              }}>
                Set Availability for Next Dinner
              </button>
              <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={async () => {
                resetForNextDinner();
                setBookingLinks(null);
                await dbData.completeDinner();
                setDinnerCompletedAt(null);
              }}>
                I'll Do It Later
              </button>
            </div>
          )}

          {ag.dinnerStatus === "pending_confirm" && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.3)", background:"rgba(201,149,106,0.04)" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Proposed Date</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>{ag.pendingDate}</div>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"14px", fontStyle:"italic" }}>Everyone must confirm before the reservation is locked.</div>
              <div style={{ marginBottom:"14px" }}>
                {MEMBERS.map(m => (
                  <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                      <span style={{ fontSize:"13px", color:"#f5e6d3" }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", fontStyle:"italic", color:confirmationVotes[m.name]?"#7a9e7e":"#5a3a25" }}>{confirmationVotes[m.name]?"Confirmed":"Pending"}</span>
                  </div>
                ))}
              </div>
              {!confirmationVotes["You"] && (
                <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={() => { setConfirmationVotes(v => ({...v, You:true})); showToast("Confirmed. Reservation will be placed shortly."); }}>
                  Confirm — I'll Be There
                </button>
              )}
              {confirmationVotes["You"] && !allConfirmed && <div style={{ fontSize:"12px", color:"#7a9e7e", textAlign:"center", fontStyle:"italic", padding:"4px 0" }}>Waiting on {MEMBERS.filter(m => !confirmationVotes[m.name]).map(m => m.name).join(", ")}.</div>}
            </div>
          )}

          {ag.dinnerStatus === "no_date" && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.12)", textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"8px" }}>◫</div>
              <div style={{ fontSize:"14px", color:"#7a5a40", marginBottom:"6px", lineHeight:"1.6", fontStyle:"italic" }}>
                Your group is out here living life without a dinner on the books. Bold strategy.
              </div>
              <div style={{ fontSize:"12px", color:"#5a3a25", marginBottom:"18px", lineHeight:"1.5" }}>
                Once everyone submits their available dates, the host will pick the perfect night.
              </div>
              <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={() => { setActiveTab("schedule"); setScreen("availability"); }}>Submit My Dates</button>
              <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={() => showToast("Nudge sent. They'll get the hint.")}>Nudge the Group</button>
            </div>
          )}

          {ag.dinnerStatus === "awaiting_host" && (() => {
            const isHost = dbData.isHost;
            const submittedMembers = currentMembers.filter(m => m.name === "You" ? selectedDates.length > 0 : (memberAvailability[m.name]?.length || 0) > 0);
            const allSubmitted = submittedMembers.length === currentMembers.length;
            
            // Calculate overlapping dates
            const allDates: string[] = [];
            MEMBERS.forEach(m => {
              const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
              dates.forEach(d => allDates.push(d));
            });
            const dateCount: Record<string, number> = {};
            allDates.forEach(d => { dateCount[d] = (dateCount[d] || 0) + 1; });
            const overlappingDates = Object.entries(dateCount)
              .filter(([_, count]) => count === submittedMembers.length && submittedMembers.length > 0)
              .map(([date]) => date)
              .sort();

            return (
              <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.25)", background:"rgba(201,149,106,0.04)" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>
                  {isHost ? "Your Move, Host" : "Awaiting Host"}
                </div>
                {isHost ? (
                  <>
                    <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px" }}>
                      {allSubmitted ? "Everyone's in. Time to decide." : "Some dates are in — you can pick anytime."}
                    </div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                      {WITTY_HOST_WAITING[wittyHostIdx]}
                    </div>
                    <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"10px", padding:"12px", marginBottom:"16px" }}>
                      <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"10px" }}>Submissions</div>
                      {MEMBERS.map(m => {
                        const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
                        const hasSubmitted = dates.length > 0;
                        return (
                          <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.06)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                              <span style={{ fontSize:"12px", color:"#f5e6d3" }}>{m.name}</span>
                            </div>
                            <span style={{ fontSize:"11px", color: hasSubmitted ? "#7a9e7e" : "#5a3a25", fontStyle:"italic" }}>
                              {hasSubmitted ? `${dates.length} dates` : "Waiting"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {overlappingDates.length > 0 && (
                      <div style={{ fontSize:"12px", color:"#7a9e7e", marginBottom:"12px", textAlign:"center" }}>
                        {overlappingDates.length} date{overlappingDates.length > 1 ? "s" : ""} work for everyone who's submitted
                      </div>
                    )}
                    <button style={S.primaryBtn} onClick={() => setScreen("host_select_date")}>
                      Pick the Night
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px" }}>The host is deciding</div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                      Everyone's dates are in. Now we wait for the host to work their magic.
                    </div>
                    <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"10px", padding:"12px" }}>
                      {currentMembers.map(m => {
                        const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
                        const hasSubmitted = dates.length > 0;
                        return (
                          <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.06)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                              <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                              <span style={{ fontSize:"12px", color:"#f5e6d3" }}>{m.name}</span>
                              {m.name === dbData.hostName && <span style={{ fontSize:"8px", color:"#1a0f0a", background:"rgba(201,149,106,0.5)", borderRadius:"3px", padding:"2px 4px", fontWeight:"700" }}>HOST</span>}
                            </div>
                            <span style={{ fontSize:"11px", color: hasSubmitted ? "#7a9e7e" : "#5a3a25" }}>
                              {hasSubmitted ? "✓" : "..."}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          <div style={{ padding:"8px 16px 4px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase" }}>Members · {currentMembers.length}/{MAX_GROUP_MEMBERS}</div>
                {dbData.isHost && <span style={{ fontSize:"9px", color:"#1a0f0a", background:"rgba(201,149,106,0.6)", borderRadius:"4px", padding:"2px 6px", fontWeight:"700", letterSpacing:"1px", textTransform:"uppercase" }}>Host</span>}
              </div>
              <div onClick={() => setScreen("group_settings")} style={{ fontSize:"11px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>Settings ›</div>
            </div>
            <div style={{ display:"flex", gap:"14px", overflowX:"auto" }}>
              {currentMembers.map(m => (
                <div key={m.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", flexShrink:0 }}>
                  <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", color:"#fff", fontWeight:"700", border:"2px solid rgba(201,149,106,0.25)" }}>{m.avatar}</div>
                  <div style={{ fontSize:"11px", color:"#7a5a40" }}>{m.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:"8px 16px 4px" }}>
            <button style={{ ...S.primaryBtn, fontSize:"12px", padding:"14px", marginBottom:"8px" }} onClick={() => setScreen("past_dinners")}>Past Dinners · {visitedRestaurants.length}</button>
            <button style={{ ...S.primaryBtn, fontSize:"12px", padding:"14px", marginBottom:"8px" }} onClick={() => setScreen("group_pool")}>View {activeGroup.name} Pool</button>
          </div>
        </div>

        {/* Notifications Panel */}
        {showNotifications && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(26,15,10,0.92)", zIndex:200, display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"20px 16px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid rgba(201,149,106,0.15)" }}>
              <div style={{ fontSize:"20px", color:"#f5e6d3", fontWeight:"400" }}>Notifications</div>
              <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
                {notifs.unreadCount > 0 && (
                  <span onClick={() => notifs.markAllRead()} style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"0.5px", cursor:"pointer" }}>Mark all read</span>
                )}
                <span onClick={() => setShowNotifications(false)} style={{ fontSize:"22px", color:"#c9956a", cursor:"pointer" }}>×</span>
              </div>
            </div>
            <div style={{ flex:1, overflow:"auto", padding:"12px 16px" }}>
              {notifs.notifications.length === 0 ? (
                <div style={{ textAlign:"center", padding:"40px 20px" }}>
                  <div style={{ fontSize:"24px", color:"#4a2e18", marginBottom:"12px" }}>◉</div>
                  <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic" }}>No notifications yet.</div>
                  <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"4px" }}>You'll be notified when important events happen.</div>
                </div>
              ) : (
                notifs.notifications.map(n => (
                  <div key={n.id} style={{
                    padding:"14px", marginBottom:"8px", borderRadius:"12px",
                    background: n.delivered ? "rgba(201,149,106,0.03)" : "rgba(201,149,106,0.08)",
                    border: n.delivered ? "1px solid rgba(201,149,106,0.08)" : "1px solid rgba(201,149,106,0.2)",
                  }}>
                    <div style={{ fontSize:"13px", color: n.delivered ? "#7a5a40" : "#f5e6d3", lineHeight:"1.5" }}>
                      {notifs.getNotificationMessage(n)}
                    </div>
                    <div style={{ fontSize:"10px", color:"#5a3a25", marginTop:"6px" }}>
                      {new Date(n.sent_at).toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Post-Dinner Review Prompt */}
        {postDinnerReviewPrompt && (
          <ReviewForm
            restaurantName="Your Last Dinner"
            cuisine={undefined}
            city={activeGroup.city}
            members={currentMembers}
            reservationId={dbData.activeReservation?.id}
            onSubmit={async (review) => {
              const ok = await dbData.submitReview(review);
              if (ok) {
                setPostDinnerReviewPrompt(false);
                showToast("Review submitted! 🎉");
              }
              return ok;
            }}
            onUploadPhoto={dbData.uploadReviewPhoto}
            onClose={() => setPostDinnerReviewPrompt(false)}
            showToast={showToast}
          />
        )}

        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── GROUP SETTINGS ──
  if (screen === "group_settings") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Settings" />;
    const isCreator = dbData.isHost; // Host can manage settings
    
    if (!isCreator) return (
      <div style={S.app}><div style={S.phone}>
        <div style={S.screen}>
          <div style={S.header}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
              <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
              <div style={S.headerEye}>{activeGroup.name}</div>
            </div>
            <div style={S.headerTitle}>Settings</div>
          </div>
          <div style={{ padding:"40px 24px", textAlign:"center" }}>
            <div style={{ fontSize:"18px", color:"#c9956a", marginBottom:"12px" }}>◈</div>
            <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px" }}>Creator Access Only</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.6" }}>
              Only the group creator can modify these settings. If you need something changed, have a word with them.
            </div>
          </div>
        </div>
      </div></div>
    );
    
    return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
            <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
            <div style={S.headerEye}>{activeGroup.name}</div>
          </div>
          <div style={S.headerTitle}>Group Settings</div>
        </div>
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"14px" }}>Dining Preferences</div>
          <div style={S.card}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Allowed Meal Types</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
              The app will only make reservations for these meal types. Uncheck anything your group would consider unreasonable.
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"4px" }}>
              {MEAL_TYPES.map(t => (
                <div key={t} style={chip(allowedMealTypes.includes(t))} onClick={() => toggleMealType(t, allowedMealTypes, setAllowedMealTypes)}>{t}</div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Reservation Time Range</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
              The app will only book reservations within this window.
            </div>
            <div style={{ display:"flex", gap:"10px", alignItems:"center", marginBottom:"4px" }}>
              <div style={{ flex:1 }}>
                <label style={S.label}>Earliest</label>
                <select value={resTimeStart} onChange={e => setResTimeStart(e.target.value)} style={{ ...S.input, marginBottom:0, fontSize:"13px" }}>
                  {["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","5:00 PM","6:00 PM","7:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ color:"#5a3a25", paddingTop:"20px" }}>—</div>
              <div style={{ flex:1 }}>
                <label style={S.label}>Latest</label>
                <select value={resTimeEnd} onChange={e => setResTimeEnd(e.target.value)} style={{ ...S.input, marginBottom:0, fontSize:"13px" }}>
                  {["10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","7:00 PM","8:00 PM","9:00 PM","10:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginTop:"8px" }}>Currently: {resTimeStart} – {resTimeEnd}</div>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Availability Window</div>
          <div style={S.card}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Submission Cutoff</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>Minimum days before the dinner that members must submit availability. We recommend 7.</div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              {[3,5,7,10,14].map(n => (
                <div key={n} onClick={() => setCutoffDays(n)} style={{ width:"38px", height:"38px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", background:cutoffDays===n?"linear-gradient(135deg,#c9956a,#9a6040)":"rgba(255,255,255,0.04)", border:cutoffDays===n?"none":"1px solid rgba(201,149,106,0.15)", fontSize:"13px", color:cutoffDays===n?"#1a0f0a":"#7a5a40", fontWeight:cutoffDays===n?"700":"400" }}>{n}</div>
              ))}
              <span style={{ fontSize:"12px", color:"#5a3a25" }}>days</span>
            </div>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Automation</div>
          <div style={S.card}>
            <Toggle on={autoSubmit} onToggle={() => setAutoSubmit(p => !p)} label="Automatic Submittal"/>
            <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", padding:"10px 0 4px", lineHeight:"1.6" }}>
              {autoSubmit ? "If a member forgets, the app uses their most recent availability pattern." : "Members must submit their own availability. No excuses."}
            </div>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Restaurant Rules</div>
          <div style={S.card}>
            <Toggle on={noRepeats} onToggle={() => setNoRepeats(p => !p)} label="No Repeats"/>
            <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", padding:"8px 0 12px", lineHeight:"1.5" }}>
              {noRepeats ? "Visited restaurants move to the archive and won't be re-selected until the cooldown expires." : "Visited restaurants may be returned to the pool and selected again at any time."}
            </div>
            {noRepeats && (<>
              <div style={{ fontSize:"12px", color:"#c9956a", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"10px" }}>Repeat Cooldown</div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                {[3,6,9,12].map(n => (
                  <div key={n} onClick={() => setRepeatMonths(n)} style={{ padding:"8px 14px", borderRadius:"10px", cursor:"pointer", background:repeatMonths===n?"linear-gradient(135deg,#c9956a,#9a6040)":"rgba(255,255,255,0.04)", border:repeatMonths===n?"none":"1px solid rgba(201,149,106,0.15)", fontSize:"12px", color:repeatMonths===n?"#1a0f0a":"#7a5a40", fontWeight:repeatMonths===n?"700":"400" }}>{n} mo</div>
                ))}
              </div>
              <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", marginTop:"10px" }}>Currently {repeatMonths} months. Cosme is on timeout.</div>
            </>)}
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Members · {currentMembers.length}/{MAX_GROUP_MEMBERS}</div>
          <div style={S.card}>
            {currentMembers.length >= MAX_GROUP_MEMBERS && (
              <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"12px", lineHeight:"1.5" }}>
                This group is at capacity. No more members can join.
              </div>
            )}
            {currentMembers.map(m => {
              const isMemberHost = m.name === dbData.hostName;
              const isYou = m.name === "You";
              return (
                <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                    <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
                    {isMemberHost && <span style={{ fontSize:"11px", color:"#f5e6d3", marginLeft:"2px" }} title="Current Host">♛</span>}
                  </div>
                  <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                    {!isYou && !isMemberHost && (
                      <span onClick={async () => { 
                        const dbMember = dbData.members.find(dm => dm.name === m.name || (m.name === "You" && dm.user_id === user.id));
                        if (dbMember) {
                          const success = await dbData.makeHost(dbMember.id);
                          if (success) showToast(`${m.name} is now the host.`);
                          else showToast("Failed to update host.");
                        }
                      }} style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"0.5px", cursor:"pointer" }}>Make Host</span>
                    )}
                    {!isYou && <span style={{ fontSize:"11px", color:"#4a2e18", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>Remove</span>}
                    {isYou && <span style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic" }}>You</span>}
                  </div>
                </div>
              );
            })}
            <div style={{ paddingTop:"14px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>Invite Code</div>
              <div style={{ fontSize:"20px", color:"#f5e6d3", letterSpacing:"6px", fontWeight:"700" }}>{activeGroup.code}</div>
              <button onClick={() => { 
                const link = `${window.location.origin}/?invite=${activeGroup.code}`;
                navigator.clipboard.writeText(link); 
                showToast("Invite link copied!"); 
              }} style={{ marginTop:"10px", background:"rgba(201,149,106,0.12)", border:"1px solid rgba(201,149,106,0.25)", borderRadius:"8px", padding:"8px 14px", cursor:"pointer", fontSize:"11px", color:"#c9956a", letterSpacing:"0.5px", fontFamily:"Georgia,serif", width:"100%" }}>
                Copy Shareable Link
              </button>
            </div>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Demo Actions</div>
          <div style={S.card}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Test Host Selection</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
              Preview the secret notification a new host receives when they're randomly selected.
            </div>
            <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #7a9e7e, #5a7a5e)" }} onClick={() => setScreen("new_host_reveal")}>
              Demo: New Host Reveal
            </button>
            <button style={{ ...S.primaryBtn, marginBottom:"0", background:"linear-gradient(135deg, #9b7ec8, #7a5ea8)" }} onClick={() => {
              setAwaitingInitiation(!awaitingInitiation);
              updateGroup(activeGroup.id, { dinnerStatus: "scheduled", nextDinner: "March 18, 2026" });
              showToast(awaitingInitiation ? "Initiation cleared — you're in!" : "Now viewing as new member awaiting initiation");
            }}>
              Demo: {awaitingInitiation ? "Clear" : "Awaiting"} Initiation
            </button>
            <button style={{ ...S.primaryBtn, marginBottom:"0", marginTop:"8px", background:"linear-gradient(135deg, #c45c5c, #9a4040)" }} onClick={() => {
              if (activeGroup.dinnerStatus === "scheduled") {
                setDinnerCompletedAt(new Date().toISOString());
                showToast("Dinner marked complete. Reset available on home screen.");
                setScreen("club_home");
                setActiveTab("home");
              } else {
                showToast("No scheduled dinner to complete.");
              }
            }}>
              Demo: Complete Dinner (2hr Reset)
            </button>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Danger Zone</div>
          <div style={{ ...S.card, border:"1px solid rgba(197,92,92,0.2)", background:"rgba(197,92,92,0.03)" }}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Leave This Club</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
              You'll lose access to this group's pool, history, and badges. This can't be undone.
            </div>
            <button style={{ width:"100%", padding:"12px", borderRadius:"10px", fontSize:"12px", letterSpacing:"0.5px", background:"rgba(197,92,92,0.12)", border:"1px solid rgba(197,92,92,0.3)", color:"#c45c5c", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"600" }}
              onClick={async () => {
                const remaining = groups.filter(g => g.id !== activeGroup.id);
                if (remaining.length === 0) { showToast("You can't leave your only club."); return; }
                const success = await dbData.leaveGroup();
                if (success) {
                  setGroups(remaining);
                  setActiveGroup(remaining[0]);
                  showToast(`You left ${activeGroup.name}.`);
                  setTimeout(() => setScreen("club_home"), 800);
                } else {
                  showToast("Failed to leave. Try again.");
                }
              }}>
              Leave {activeGroup.name}
            </button>
          </div>

          <div style={{ height:"16px" }}/>
          <button style={S.primaryBtn} onClick={async () => {
            const success = await dbData.saveGroupSettings({
              auto_submit: autoSubmit,
              no_repeats: noRepeats,
              repeat_months: repeatMonths,
              cutoff_days: cutoffDays,
              allowed_meal_types: allowedMealTypes,
              res_time_start: resTimeStart,
              res_time_end: resTimeEnd,
              search_radius: searchRadius,
            });
            showToast(success ? "Settings saved." : "Failed to save settings.");
            if (success) setTimeout(() => setScreen("club_home"), 800);
          }}>Save Settings</button>
          <div style={{ height:"12px" }}/>
          <button style={{ ...S.ghostBtn, color:"#c45c5c", borderColor:"rgba(197,92,92,0.3)" }} onClick={signOut}>Sign Out</button>
        </div>
      </div>
    </div></div>
    );
  }

  // ── HOST SELECT DATE ──
  if (screen === "host_select_date") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Host Selection" />;
    const submittedMembers = currentMembers.filter(m => m.name === "You" ? selectedDates.length > 0 : (memberAvailability[m.name]?.length || 0) > 0);
    const notSubmittedMembers = currentMembers.filter(m => m.name === "You" ? selectedDates.length === 0 : (memberAvailability[m.name]?.length || 0) === 0);
    
    // Gather all dates from submitted members
    const allDatesFromSubmitted: string[] = [];
    submittedMembers.forEach(m => {
      const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
      dates.forEach(d => { if (!allDatesFromSubmitted.includes(d)) allDatesFromSubmitted.push(d); });
    });
    
    // Count how many members are available on each date
    const dateAvailability: Record<string, string[]> = {};
    submittedMembers.forEach(m => {
      const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
      dates.forEach(d => {
        if (!dateAvailability[d]) dateAvailability[d] = [];
        dateAvailability[d].push(m.name);
      });
    });
    
    // Sort dates: full overlap first, then by number of available members, then by date
    const sortedDates = allDatesFromSubmitted.sort((a, b) => {
      const aCount = dateAvailability[a]?.length || 0;
      const bCount = dateAvailability[b]?.length || 0;
      if (aCount !== bCount) return bCount - aCount;
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    const formatDateDisplay = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <div style={S.header}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
              <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
              <div style={S.headerEye}>{activeGroup.name}</div>
            </div>
            <div style={S.headerTitle}>Pick the Night</div>
          </div>
          
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
              As the host, you have the sacred duty of choosing the dinner date. Choose wisely. No pressure.
            </div>
            
            {/* Submission Status */}
            <div style={{ ...S.card, marginBottom:"16px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Who's Submitted</div>
              {currentMembers.map(m => {
                const dates = m.name === "You" ? selectedDates : (memberAvailability[m.name] || []);
                const hasSubmitted = dates.length > 0;
                return (
                  <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.06)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                      <span style={{ fontSize:"13px", color:"#f5e6d3" }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", color: hasSubmitted ? "#7a9e7e" : "#5a3a25", fontStyle:"italic" }}>
                      {hasSubmitted ? `${dates.length} dates` : "Not submitted"}
                    </span>
                  </div>
                );
              })}
              {notSubmittedMembers.length > 0 && (
                <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginTop:"10px", lineHeight:"1.5" }}>
                  {notSubmittedMembers.map(m => m.name).join(", ")} {notSubmittedMembers.length === 1 ? "hasn't" : "haven't"} submitted yet. You can still pick a date — they'll be marked as unable to attend.
                </div>
              )}
            </div>
            
            {/* Date Selection */}
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Available Dates</div>
            
            {sortedDates.length === 0 ? (
              <div style={{ ...S.card, textAlign:"center", padding:"24px" }}>
                <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic" }}>No dates submitted yet. Check back later or nudge the group.</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginBottom:"20px" }}>
                {sortedDates.map(date => {
                  const available = dateAvailability[date] || [];
                  const isFullOverlap = available.length === submittedMembers.length;
                  const isSelected = hostSelectedDate === date;
                  
                  return (
                    <div 
                      key={date} 
                      onClick={() => setHostSelectedDate(date)}
                      style={{ 
                        ...S.card, 
                        margin: 0, 
                        cursor: "pointer",
                        border: isSelected ? "2px solid #c9956a" : isFullOverlap ? "1px solid rgba(122,158,126,0.4)" : "1px solid rgba(201,149,106,0.12)",
                        background: isSelected ? "rgba(201,149,106,0.12)" : isFullOverlap ? "rgba(122,158,126,0.06)" : "rgba(201,149,106,0.02)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                        <div style={{ fontSize:"15px", color:"#f5e6d3", fontWeight:"500" }}>{formatDateDisplay(date)}</div>
                        {isFullOverlap && <span style={{ fontSize:"10px", color:"#7a9e7e", background:"rgba(122,158,126,0.2)", padding:"3px 8px", borderRadius:"6px", fontWeight:"600" }}>FULL OVERLAP</span>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"11px", color:"#7a5a40" }}>Available:</span>
                        {available.map(name => {
                          const member = currentMembers.find(m => m.name === name);
                          return (
                            <div key={name} style={{ width:"22px", height:"22px", borderRadius:"50%", background: member?.color || "#c9956a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color:"#fff", fontWeight:"700" }}>
                              {member?.avatar || name[0]}
                            </div>
                          );
                        })}
                        {notSubmittedMembers.length > 0 && (
                          <span style={{ fontSize:"10px", color:"#5a3a25", fontStyle:"italic", marginLeft:"4px" }}>
                            ({notSubmittedMembers.length} pending)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {hostSelectedDate && (
              <div style={{ background:"rgba(201,149,106,0.08)", borderRadius:"12px", padding:"14px", marginBottom:"16px", textAlign:"center" }}>
                <div style={{ fontSize:"12px", color:"#c9956a", marginBottom:"4px" }}>Selected Date</div>
                <div style={{ fontSize:"16px", color:"#f5e6d3", fontWeight:"500" }}>{formatDateDisplay(hostSelectedDate)}</div>
                <div style={{ fontSize:"11px", color:"#7a5a40", marginTop:"4px" }}>
                  {(dateAvailability[hostSelectedDate]?.length || 0)} of {currentMembers.length} members available
                </div>
              </div>
            )}
            
            <button 
              style={{ ...S.primaryBtn, opacity: hostSelectedDate ? 1 : 0.5 }} 
              onClick={async () => {
                if (!hostSelectedDate) { showToast("Select a date first."); return; }
                const success = await dbData.proposeDate(hostSelectedDate);
                if (success) {
                  showToast("Date proposed! Members will be asked to confirm.");
                  setScreen("club_home");
                  setActiveTab("home");
                } else {
                  showToast("Failed to propose date. Try again.");
                }
              }}
            >
              Propose This Date
            </button>
            
            <button style={{ ...S.ghostBtn, marginTop:"8px" }} onClick={() => setScreen("club_home")}>
              Cancel
            </button>
          </div>
        </div>
      </div></div>
    );
  }

  // ── GROUP POOL ──
  if (screen === "group_pool") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Restaurant Pool" />;
    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <div style={S.header}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
              <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
              <div style={S.headerEye}>{activeGroup.name}</div>
            </div>
            <div style={S.headerTitle}>Restaurant Pool</div>
          </div>
          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Active Pool · {poolRestaurants.length}</div>
            {poolRestaurants.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px" }}>Your pool is empty. Add restaurants from Explore.</div>
                <button style={S.primaryBtn} onClick={() => { setActiveTab("explore"); setScreen("explore"); }}>Explore Restaurants</button>
              </div>
            ) : (
              poolRestaurants.map(r => (
                <div key={r.id} style={{ ...S.card, margin:"0 0 10px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={S.cardTitle}>{r.name}</div>
                      <div style={S.cardSub}>{r.cuisine} · {r.city}</div>
                      <div style={{ fontSize:"11px", color:"#4a2e18", marginTop:"3px" }}>added by {r.suggested_by}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                      <PriceTag price={r.price}/>
                      <RatingBadge restaurant={r}/>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      setPoolRestaurants(pool => pool.filter(rest => rest.id !== r.id)); 
                      showToast(`${r.name} removed from pool.`); 
                    }}
                    style={{ 
                      marginTop:"12px", width:"100%", padding:"10px", borderRadius:"8px",
                      background:"transparent", border:"1px solid rgba(197,92,92,0.2)", 
                      color:"#c45c5c", fontSize:"11px", cursor:"pointer", fontFamily:"Georgia,serif"
                    }}>
                    Remove from Pool
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── PAST DINNERS ──
  if (screen === "past_dinners") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Past Dinners" />;
    // Get reviews from DB for this group's visited restaurants
    const groupReviews = dbData.communityReviews.filter(r => r.group_id === activeGroupId);

    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <div style={S.header}>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
              <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
              <div style={S.headerEye}>{activeGroup.name}</div>
            </div>
            <div style={S.headerTitle}>Past Dinners</div>
          </div>

          <div style={{ padding:"16px 16px 0" }}>
            <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px", fontStyle:"italic", lineHeight:"1.6" }}>
              Relive the memories. View photos and reviews from your group's dining adventures.
            </div>

            {visitedRestaurants.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:"24px", marginBottom:"12px", color:"#c9956a" }}>◈</div>
                <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic", marginBottom:"4px" }}>No dinners yet.</div>
                <div style={{ fontSize:"12px", color:"#5a3a25" }}>Your dining history will appear here once you've been out together.</div>
              </div>
            ) : (
              visitedRestaurants.map((d) => {
                const restaurantReviews = groupReviews.filter(r => r.restaurant_name === d.name);
                const restaurantPhotos = restaurantReviews.filter(r => r.photo_url).map(r => r.photo_url!);
                return (
                <div key={d.id} style={{ ...S.card, margin:"0 0 16px", padding:"0", overflow:"hidden" }}>
                  <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid rgba(201,149,106,0.1)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={S.cardTitle}>{d.name}</div>
                        <div style={S.cardSub}>{d.cuisine} · {d.city}</div>
                        <div style={{ fontSize:"11px", color:"#5a3a25", marginTop:"3px" }}>{d.visitedDate}</div>
                      </div>
                      <RatingBadge restaurant={d} large/>
                    </div>
                  </div>

                  {/* Photos */}
                  {restaurantPhotos.length > 0 && (
                    <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(201,149,106,0.1)" }}>
                      <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"10px" }}>Photos · {restaurantPhotos.length}</div>
                      <div style={{ display:"flex", gap:"8px", overflowX:"auto" }}>
                        {restaurantPhotos.map((url, i) => (
                          <div key={i} style={{ width:"64px", height:"64px", borderRadius:"8px", overflow:"hidden", flexShrink:0 }}>
                            <img src={url} alt={`Photo ${i + 1}`} style={{ width:"64px", height:"64px", objectFit:"cover" }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reviews */}
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"1.5px", textTransform:"uppercase", marginBottom:"10px" }}>
                      Member Reviews · {restaurantReviews.length}
                    </div>
                    {restaurantReviews.length === 0 && (
                      <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic" }}>No reviews submitted yet.</div>
                    )}
                    {restaurantReviews.map((rev, i) => (
                      <div key={i} style={{ marginBottom:"12px", paddingBottom:"12px", borderBottom: i < restaurantReviews.length - 1 ? "1px solid rgba(201,149,106,0.06)" : "none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                          <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:"#c9956a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#fff", fontWeight:"700" }}>
                            {(rev.review_text || "R")[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:"12px", color:"#f5e6d3", fontWeight:"600" }}>
                            {rev.user_id === user.id ? "You" : "Member"}
                          </span>
                          <span style={{ fontSize:"12px", color:"#c9956a", fontWeight:"700", marginLeft:"auto" }}>
                            {rev.rating}
                          </span>
                        </div>
                        {rev.review_text && (
                          <div style={{ fontSize:"12px", color:"#7a5a40", lineHeight:"1.5", fontStyle:"italic" }}>
                            "{rev.review_text}"
                          </div>
                        )}
                        {rev.photo_url && (
                          <div style={{ marginTop:"6px", borderRadius:"6px", overflow:"hidden", maxHeight:"80px" }}>
                            <img src={rev.photo_url} alt="Review" style={{ width:"100%", height:"auto", objectFit:"cover" }} />
                          </div>
                         )}
                      </div>
                    ))}
                  </div>

                  {/* Write Review Button */}
                  <button 
                    style={{ ...S.ghostBtn, marginBottom: 0, fontSize: "11px", padding: "10px", marginTop: "8px" }}
                    onClick={() => setShowReviewForm({ restaurant: d.name, cuisine: d.cuisine, city: d.city })}
                  >
                    Write a Review
                  </button>
                </div>
                );
              })
            )}
          </div>
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
        {showReviewForm && (
          <ReviewForm
            restaurantName={showReviewForm.restaurant}
            cuisine={showReviewForm.cuisine}
            city={showReviewForm.city}
            members={currentMembers}
            reservationId={showReviewForm.reservationId}
            onSubmit={dbData.submitReview}
            onUploadPhoto={dbData.uploadReviewPhoto}
            onClose={() => setShowReviewForm(null)}
            showToast={showToast}
          />
        )}
      </div></div>
    );
  }
  if (screen === "explore") {
    // Merge static PUBLIC_REVIEWS with DB community reviews for display
    const allCommunityReviews = [
      ...dbData.communityReviews.map(r => ({
        group: "Supper Club Member",
        restaurant: r.restaurant_name,
        rating: r.rating,
        review: r.review_text || "",
        city: r.city || "Unknown",
        date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        photo_url: r.photo_url,
      })),
      ...PUBLIC_REVIEWS.map(r => ({ ...r, review: r.review, photo_url: null as string | null })),
    ];
    const uniqueRestaurants = [...new Set(allCommunityReviews.map(r => r.restaurant))];
    const cuisines = [...new Set([...RESTAURANT_POOL, ...PREVIOUSLY_VISITED].map(r => r.cuisine))];

    // Restaurant Detail View
    if (selectedRestaurantDetail) {
      const r = selectedRestaurantDetail;
      const isGooglePlace = 'googlePlaceId' in r;
      const reviews = allCommunityReviews.filter(rev => rev.restaurant === r.name);
      const avgRating = reviews.length > 0 ? (reviews.reduce((s, rev) => s + rev.rating, 0) / reviews.length).toFixed(1) : null;
      
      return (
        <div style={S.app}><div style={S.phone}>
          {toast && <div style={S.toast}>{toast}</div>}
          <div style={S.screen}>
            <div style={S.header}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
                <button onClick={() => { setSelectedRestaurantDetail(null); setRestaurantDescription(null); }} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
                <div style={S.headerEye}>Restaurant Details</div>
              </div>
              <div style={S.headerTitle}>{r.name}</div>
            </div>
            
            <div style={{ padding:"16px 16px 0" }}>
              {/* Hero Info */}
              <div style={{ ...S.card, marginBottom:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                  <div>
                    <div style={{ fontSize:"13px", color:"#7a5a40" }}>{'cuisine' in r ? r.cuisine : 'Restaurant'} · {r.city}</div>
                    {'address' in r && r.address && <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"4px" }}>{r.address}</div>}
                  </div>
                  <PriceTag price={r.price}/>
                </div>
                <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
                  {('googleRating' in r && r.googleRating) && (
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ fontSize:"18px", color:"#7a9e7e", fontWeight:"700" }}>{r.googleRating}</span>
                      <div style={{ fontSize:"11px", color:"#5a3a25" }}>
                        <div>Google</div>
                        <div>{('googleReviewCount' in r ? r.googleReviewCount : 0)} reviews</div>
                      </div>
                    </div>
                  )}
                  {avgRating && (
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ fontSize:"18px", color:"#c9956a", fontWeight:"700" }}>{avgRating}</span>
                      <div style={{ fontSize:"11px", color:"#5a3a25" }}>
                        <div>Supper Club</div>
                        <div>{reviews.length} review{reviews.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Description */}
              <div style={{ ...S.card, marginBottom:"16px", background:"linear-gradient(135deg, rgba(201,149,106,0.06), rgba(26,15,10,0.95))", border:"1px solid rgba(201,149,106,0.18)" }}>
                <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>About This Restaurant</div>
                {descriptionLoading ? (
                  <div style={{ fontSize:"13px", color:"#5a3a25", fontStyle:"italic", lineHeight:"1.7" }}>Composing a description...</div>
                ) : restaurantDescription ? (
                  <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.8", fontStyle:"italic" }}>{restaurantDescription}</div>
                ) : (
                  <div style={{ fontSize:"13px", color:"#5a3a25", fontStyle:"italic", lineHeight:"1.7" }}>A distinguished establishment worthy of your attention.</div>
                )}
              </div>

              {/* Photos Section */}
              {(() => {
                const reviewPhotos = allCommunityReviews
                  .filter(rev => rev.restaurant === r.name && rev.photo_url)
                  .map(rev => rev.photo_url!);
                return reviewPhotos.length > 0 ? (<>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                    Photos · {reviewPhotos.length}
                  </div>
                  <div style={{ 
                    display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"16px", marginBottom:"16px",
                    scrollSnapType:"x mandatory", WebkitOverflowScrolling:"touch" as any,
                    scrollbarWidth:"none" as any, msOverflowStyle:"none" as any,
                  }}>
                    {reviewPhotos.map((url, i) => (
                      <div key={i} style={{ 
                        minWidth:"110px", height:"110px", borderRadius:"16px", 
                        overflow:"hidden",
                        flexShrink:0, scrollSnapAlign:"start",
                        boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
                      }}>
                        <img src={url} alt={`Photo ${i + 1}`} style={{ width:"110px", height:"110px", objectFit:"cover" }} />
                      </div>
                    ))}
                  </div>
                </>) : (
                  <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginBottom:"16px" }}>
                    No photos yet. Share yours after your next visit.
                  </div>
                );
              })()}

              {/* Reviews Section */}
              {(() => {
                const detailReviews = allCommunityReviews.filter(rev => rev.restaurant === r.name);
                return (<>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                    Member Reviews · {detailReviews.length}
                  </div>
                  {detailReviews.length === 0 && (
                    <div style={{ ...S.card, margin:"0 0 10px", padding:"14px" }}>
                      <div style={{ fontSize:"13px", color:"#5a3a25", fontStyle:"italic" }}>No reviews yet. Be the first to dine here and share your thoughts.</div>
                    </div>
                  )}
                  {detailReviews.map((rev, i) => (
                    <div key={i} style={{ ...S.card, margin:"0 0 10px", padding:"14px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                        <div style={{ 
                          width:"28px", height:"28px", borderRadius:"50%", 
                          background: "#c9956a",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"11px", color:"#fff", fontWeight:"700"
                        }}>
                          {rev.group[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:"13px", color:"#f5e6d3", fontWeight:"600" }}>{rev.group}</div>
                          <div style={{ fontSize:"11px", color:"#5a3a25" }}>{rev.date}</div>
                        </div>
                        <div style={{ fontSize:"15px", color:"#c9956a", fontWeight:"700" }}>{rev.rating}</div>
                      </div>
                      {rev.review && (
                        <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.6", fontStyle:"italic" }}>
                          "{rev.review}"
                        </div>
                      )}
                      {rev.photo_url && (
                        <div style={{ marginTop:"10px", borderRadius:"10px", overflow:"hidden", maxHeight:"120px" }}>
                          <img src={rev.photo_url} alt="Review" style={{ width:"100%", height:"auto", objectFit:"cover", borderRadius:"10px" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </>);
              })()}

              {/* Action Buttons */}
              <button style={{ ...S.ghostBtn, marginTop:"16px", marginBottom:"8px" }} onClick={() => {
                setShowReviewForm({ restaurant: r.name, cuisine: 'cuisine' in r ? r.cuisine : undefined, city: r.city });
              }}>
                Write a Review
              </button>
              <button style={{ ...S.primaryBtn, marginBottom:"24px" }} onClick={() => {
                const restaurant: Restaurant = {
                  id: Date.now(), 
                  name: r.name, 
                  cuisine: 'cuisine' in r ? r.cuisine : "Restaurant", 
                  suggested_by: "You",
                  city: r.city, 
                  price: r.price, 
                  visited: false, 
                  visitedDate: null, 
                  visitedRating: null,
                  googleRating: 'googleRating' in r ? r.googleRating : null,
                  googleReviewCount: 'googleReviewCount' in r ? r.googleReviewCount : 0,
                  scRating: null, 
                  scReviewCount: 0,
                };
                setAddToGroupPicker({ restaurant, visible: true });
                setAddToGroupSelected([activeGroup.id]);
              }}>
                Add to Pool
              </button>
            </div>
          </div>
          <NavBar activeTab={activeTab} onNavigate={onNavigate}/>

          {/* Group Picker Modal */}
          {addToGroupPicker.visible && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(26,15,10,0.9)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
              <div style={{ background:"#2d1208", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"16px", padding:"20px", maxWidth:"320px", width:"100%" }}>
                <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"600" }}>Add to Groups</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic" }}>{addToGroupPicker.restaurant.name}</div>
                <div style={{ marginBottom:"20px" }}>
                  {groups.map(g => (
                    <div key={g.id} onClick={() => {
                      const isSelected = addToGroupSelected.includes(g.id);
                      setAddToGroupSelected(prev => isSelected ? prev.filter(id => id !== g.id) : [...prev, g.id]);
                    }} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px", cursor:"pointer", borderRadius:"10px", background:addToGroupSelected.includes(g.id)?"rgba(201,149,106,0.1)":"transparent", marginBottom:"8px" }}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"4px", border:"1px solid rgba(201,149,106,0.3)", background:addToGroupSelected.includes(g.id)?"#c9956a":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {addToGroupSelected.includes(g.id) && <span style={{ fontSize:"12px", color:"#1a0f0a" }}>*</span>}
                      </div>
                      <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{g.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:"10px" }}>
                  <button style={{ ...S.ghostBtn, flex:1, marginBottom:0 }} onClick={() => { setAddToGroupPicker(prev => ({ ...prev, visible: false })); setAddToGroupSelected([]); setSelectedRestaurantDetail(null); }}>Cancel</button>
                  <button style={{ ...S.primaryBtn, flex:1, marginBottom:0 }} onClick={() => {
                    if (addToGroupSelected.length === 0) { showToast("Select at least one group."); return; }
                    addToGroupPool(addToGroupPicker.restaurant, addToGroupSelected);
                    showToast(`Added to ${addToGroupSelected.length} group${addToGroupSelected.length > 1 ? "s" : ""}.`);
                    setAddToGroupPicker(prev => ({ ...prev, visible: false }));
                    setAddToGroupSelected([]);
                    setSelectedRestaurantDetail(null);
                  }}>Add to {addToGroupSelected.length} Group{addToGroupSelected.length !== 1 ? "s" : ""}</button>
                </div>
              </div>
            </div>
          )}
          {showReviewForm && (
            <ReviewForm
              restaurantName={showReviewForm.restaurant}
              cuisine={showReviewForm.cuisine}
              city={showReviewForm.city}
              members={currentMembers}
              onSubmit={dbData.submitReview}
              onUploadPhoto={dbData.uploadReviewPhoto}
              onClose={() => setShowReviewForm(null)}
              showToast={showToast}
            />
          )}
        </div></div>
      );
    }

    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />
          <div style={{ ...S.header, paddingTop: "8px" }}>
            <div style={S.headerEye}>Discover</div>
            <div style={S.headerTitle}>Explore Restaurants</div>
          </div>

          <div style={{ display:"flex", gap:"4px", margin:"16px 16px 0", padding:"4px", background:"rgba(255,255,255,0.03)", borderRadius:"12px", border:"1px solid rgba(201,149,106,0.08)" }}>
            {([["search","Search"],["visited","Visited"],["community","Community"]] as const).map(([id,label]) => (
              <div key={id} style={{ ...tabPill(exploreView===id), flex:1 }} onClick={() => { setExploreView(id); setSelectedPublicR(null); }}>{label}</div>
            ))}
          </div>

          {exploreView === "search" && (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>Search for restaurants to add to your group pools.</div>
              
              <label style={S.label}>Location</label>
              <input style={S.input} placeholder="e.g. New York, NY" value={rCity || activeGroup.city}
                onChange={e => setRCity(e.target.value)}
              />
              <label style={S.label}>Search Radius</label>
              <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
                {[5, 10, 15, 25, 50].map(r => (
                  <div key={r} onClick={() => setSearchRadius(r)} style={chip(searchRadius === r)}>{r} mi</div>
                ))}
              </div>

              <label style={S.label}>Search Restaurants</label>
              <input style={S.input} placeholder="e.g. Le Bernardin, sushi, Italian..." value={rName}
                onChange={e => { setRName(e.target.value); searchGooglePlaces(e.target.value, rCity || activeGroup.city, setGpResults, setGpLoading); }}
              />
              {gpLoading && <div style={{ fontSize:"11px", color:"#c9956a", padding:"4px 0" }}>Searching nearby restaurants...</div>}
              
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px", marginTop:"16px" }}>Filters</div>
              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>Cuisine</label>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                  <div style={chip(exploreCuisineFilter==="all")} onClick={() => setExploreCuisineFilter("all")}>All</div>
                  {cuisines.slice(0,5).map(c => (
                    <div key={c} style={chip(exploreCuisineFilter===c)} onClick={() => setExploreCuisineFilter(c)}>{c}</div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>Price Range</label>
                <div style={{ display:"flex", gap:"8px" }}>
                  {([["all","All"],["1","$"],["2","$$"],["3","$$$"],["4","$$$$"]] as const).map(([id,label]) => (
                    <div key={id} style={chip(explorePriceFilter===id)} onClick={() => setExplorePriceFilter(id)}>{label}</div>
                  ))}
                </div>
              </div>

              <button style={{ ...S.primaryBtn, marginBottom:"16px" }} onClick={() => {
                searchGooglePlaces(rName || "restaurant", rCity || activeGroup.city, setGpResults, setGpLoading);
              }}>
                Search
              </button>

              {/* Search Results */}
              {gpResults.length > 0 && (
                <>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                    Results · {gpResults.filter(r => exploreCuisineFilter === "all" || r.cuisine.toLowerCase().includes(exploreCuisineFilter.toLowerCase()))
                      .filter(r => explorePriceFilter === "all" || String(r.price) === explorePriceFilter).length}
                  </div>
                  {gpResults
                    .filter(r => exploreCuisineFilter === "all" || r.cuisine.toLowerCase().includes(exploreCuisineFilter.toLowerCase()))
                    .filter(r => explorePriceFilter === "all" || String(r.price) === explorePriceFilter)
                    .map(r => (
                    <div key={r.id} style={{ ...S.card, margin:"0 0 10px", cursor:"pointer" }}
                      onClick={() => openRestaurantDetail(r)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={S.cardTitle}>{r.name}</div>
                          <div style={S.cardSub}>{r.cuisine}</div>
                          <div style={{ fontSize:"11px", color:"#5a3a25", marginTop:"3px" }}>{r.address?.split(',').slice(0,2).join(',') || r.city}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                          <PriceTag price={r.price}/>
                          {r.googleRating && (
                            <div style={{ fontSize:"12px", color:"#7a9e7e", fontWeight:"700" }}>
                              {r.googleRating} <span style={{ fontWeight:"400", color:"#5a3a25" }}>G</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize:"11px", color:"#c9956a", marginTop:"8px" }}>Tap for details and reviews →</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {exploreView === "visited" && (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                Restaurants you've visited across all groups. Tap for details.
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>Sort By</label>
                <div style={{ display:"flex", gap:"8px" }}>
                  {([["date","Date"],["rating","Rating"],["price","Price"]] as const).map(([id,label]) => (
                    <div key={id} style={chip(visitedSort===id)} onClick={() => setVisitedSort(id)}>{label}</div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>Filter by Price</label>
                <div style={{ display:"flex", gap:"8px" }}>
                  {([["all","All"],["1","$"],["2","$$"],["3","$$$"],["4","$$$$"]] as const).map(([id,label]) => (
                    <div key={id} style={chip(visitedFilter===id)} onClick={() => setVisitedFilter(id)}>{label}</div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                {visitedRestaurants.length} Previously Visited
              </div>
              {sortedVisited.filter(r => visitedFilter === "all" || String(r.price) === visitedFilter).map(r => (
                <div key={r.id} style={{ ...S.card, margin:"0 0 10px", cursor:"pointer" }} onClick={() => openRestaurantDetail(r as any)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1 }}>
                      <div style={S.cardTitle}>{r.name}</div>
                      <div style={S.cardSub}>{r.cuisine} · {r.city}</div>
                      <div style={{ fontSize:"11px", color:"#5a3a25", marginTop:"3px" }}>Visited {r.visitedDate}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"6px" }}>
                      <PriceTag price={r.price}/>
                      <RatingBadge restaurant={r} large/>
                    </div>
                  </div>
                  <div style={{ fontSize:"11px", color:"#c9956a", marginTop:"8px" }}>Tap for photos and reviews →</div>
                </div>
              ))}
            </div>
          )}

          {exploreView === "community" && (
            selectedPublicR ? (
              <div style={{ padding:"16px 16px 0" }}>
                <button onClick={() => setSelectedPublicR(null)} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"14px", cursor:"pointer", padding:0, marginBottom:"16px" }}>← All Restaurants</button>
                <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>{selectedPublicR}</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>New York, NY</div>
                
                {/* Photos Section */}
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                  Photos · {mockRestaurantPhotos.length}
                </div>
                <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"12px", marginBottom:"16px" }}>
                  {mockRestaurantPhotos.slice(0,4).map((symbol, i) => (
                    <div key={i} style={{ 
                      minWidth:"72px", height:"72px", borderRadius:"10px", 
                      background:"linear-gradient(135deg, rgba(201,149,106,0.15), rgba(201,149,106,0.05))",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"24px", color:"#c9956a", border:"1px solid rgba(201,149,106,0.12)",
                      flexShrink:0
                    }}>
                      {symbol}
                    </div>
                  ))}
                </div>

                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                  Reviews · {allCommunityReviews.filter(r => r.restaurant === selectedPublicR).length}
                </div>
                {allCommunityReviews.filter(r => r.restaurant === selectedPublicR).map((rev, i) => (
                  <div key={i} style={{ ...S.card, margin:"0 0 10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                      <div style={{ fontSize:"14px", color:"#f5e6d3", fontWeight:"600" }}>{rev.group}</div>
                      <div style={{ fontSize:"14px", color:"#c9956a", fontWeight:"700" }}>{rev.rating}</div>
                    </div>
                    {rev.photo_url && (
                      <div style={{ marginBottom:"10px", borderRadius:"10px", overflow:"hidden", maxHeight:"160px" }}>
                        <img src={rev.photo_url} alt="Review photo" style={{ width:"100%", height:"auto", objectFit:"cover", borderRadius:"10px" }} />
                      </div>
                    )}
                    <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.5", fontStyle:"italic" }}>"{rev.review}"</div>
                    <div style={{ fontSize:"11px", color:"#4a2e18", marginTop:"8px" }}>{rev.date}</div>
                  </div>
                ))}
                <button style={{ ...S.primaryBtn, marginTop:"8px" }} onClick={() => {
                  const restaurant: Restaurant = { id:Date.now(), name:selectedPublicR!, cuisine:"—", suggested_by:"Community", city:"New York, NY", price:3, visited:false, visitedDate:null, visitedRating:null };
                  setAddToGroupPicker({ restaurant, visible: true });
                  setAddToGroupSelected([activeGroup.id]);
                }}>Add to Pool</button>
              </div>
            ) : (
              <div style={{ padding:"16px 16px 0" }}>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                  Reviews from other Supper Club groups. Browse, discover, add to your pools.
                </div>
                {uniqueRestaurants.map(name => {
                  const reviews = allCommunityReviews.filter(r => r.restaurant === name);
                  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
                  return (
                    <div key={name} onClick={() => setSelectedPublicR(name)} style={{ ...S.card, margin:"0 0 10px", cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                        <div style={S.cardTitle}>{name}</div>
                        <div style={{ fontSize:"16px", color:"#c9956a", fontWeight:"700" }}>{avg}</div>
                      </div>
                      <div style={S.cardSub}>New York, NY · {reviews.length} review{reviews.length > 1 ? "s" : ""}</div>
                      <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.5", fontStyle:"italic", marginTop:"8px" }}>"{reviews[0].review.slice(0,80)}..."</div>
                      <div style={{ fontSize:"11px", color:"#c9956a", marginTop:"8px" }}>Tap to see photos and all reviews →</div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Group Picker Modal */}
          {addToGroupPicker.visible && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(26,15,10,0.9)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
              <div style={{ background:"#2d1208", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"16px", padding:"20px", maxWidth:"320px", width:"100%" }}>
                <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"600" }}>Add to Groups</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic" }}>{addToGroupPicker.restaurant.name}</div>
                <div style={{ marginBottom:"20px" }}>
                  {groups.map(g => (
                    <div key={g.id} onClick={() => {
                      const isSelected = addToGroupSelected.includes(g.id);
                      setAddToGroupSelected(prev => isSelected ? prev.filter(id => id !== g.id) : [...prev, g.id]);
                    }} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px", cursor:"pointer", borderRadius:"10px", background:addToGroupSelected.includes(g.id)?"rgba(201,149,106,0.1)":"transparent", marginBottom:"8px" }}>
                      <div style={{ width:"20px", height:"20px", borderRadius:"4px", border:"1px solid rgba(201,149,106,0.3)", background:addToGroupSelected.includes(g.id)?"#c9956a":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {addToGroupSelected.includes(g.id) && <span style={{ fontSize:"12px", color:"#1a0f0a" }}>*</span>}
                      </div>
                      <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{g.name}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:"10px" }}>
                  <button style={{ ...S.ghostBtn, flex:1, marginBottom:0 }} onClick={() => { setAddToGroupPicker(prev => ({ ...prev, visible: false })); setAddToGroupSelected([]); }}>Cancel</button>
                  <button style={{ ...S.primaryBtn, flex:1, marginBottom:0 }} onClick={() => {
                    if (addToGroupSelected.length === 0) { showToast("Select at least one group."); return; }
                    addToGroupPool(addToGroupPicker.restaurant, addToGroupSelected);
                    showToast(`Added to ${addToGroupSelected.length} group${addToGroupSelected.length > 1 ? "s" : ""}.`);
                    setAddToGroupPicker(prev => ({ ...prev, visible: false }));
                    setAddToGroupSelected([]);
                  }}>Add to {addToGroupSelected.length} Group{addToGroupSelected.length !== 1 ? "s" : ""}</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── AVAILABILITY ──
  if (screen === "availability") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Availability" />;
    const datesAlreadySubmitted = selectedDates.length > 0;
    
    return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />
        <div style={{ ...S.header, paddingTop: "8px" }}>
          <div style={S.headerEye}>Schedule</div>
          <div style={S.headerTitle}>{datesAlreadySubmitted && !availabilityModifying ? "Your Dates" : "Set Availability"}</div>
        </div>
        <div style={{ padding:"16px 16px 0" }}>

          {/* ── Dates Already Submitted State ── */}
          {datesAlreadySubmitted && !availabilityModifying ? (
            <>
              <div style={{ 
                background:"linear-gradient(135deg, rgba(122,158,126,0.08), rgba(26,15,10,0.95))", 
                border:"1px solid rgba(122,158,126,0.3)", 
                borderRadius:"16px", 
                padding:"28px 20px", 
                textAlign:"center",
                marginBottom:"20px"
              }}>
                <div style={{ fontSize:"20px", marginBottom:"12px", color:"#7a9e7e" }}>◈</div>
                <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"500", lineHeight:"1.5" }}>
                  Your dates for your upcoming meal have been selected.
                </div>
                <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.6", marginBottom:"16px" }}>
                  {selectedDates.length} evening{selectedDates.length > 1 ? "s" : ""} submitted · {selectedMealTypes.join(", ")}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", justifyContent:"center", marginBottom:"20px" }}>
                  {[...selectedDates].sort().map(d => {
                    const date = new Date(d);
                    return (
                      <div key={d} style={{
                        padding:"8px 14px", borderRadius:"10px",
                        background:"rgba(122,158,126,0.12)", border:"1px solid rgba(122,158,126,0.25)",
                        fontSize:"12px", color:"#f5e6d3", fontWeight:"500"
                      }}>
                        {date.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
                      </div>
                    );
                  })}
                </div>
                <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"12px" }} onClick={() => setAvailabilityModifying(true)}>
                  Modify Dates
                </button>
              </div>

              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Group Status</div>
              {MEMBERS.map(m => {
                const isYou = m.name === "You";
                const hasSubmitted = isYou ? selectedDates.length > 0 : m.name !== "Priya";
                return (
                  <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                      <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", fontStyle:"italic", color: hasSubmitted ? "#7a9e7e" : "#5a3a25" }}>
                      {isYou ? `${selectedDates.length} dates` : hasSubmitted ? "Submitted" : "Waiting"}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {availabilityModifying && (
                <div style={{ background:"rgba(201,149,106,0.08)", borderRadius:"10px", padding:"12px 14px", marginBottom:"16px", fontSize:"12px", color:"#c9956a", lineHeight:"1.6" }}>
                  Modifying your dates. The host will be notified of any changes.
                </div>
              )}
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                Select the evenings you're free. We'll find the best overlap so you don't have to negotiate in the group chat.
              </div>
              <MealTypeSelector selected={selectedMealTypes} onToggle={(t) => toggleMealType(t, selectedMealTypes, setSelectedMealTypes)} label="I'm open to"/>
              <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.5" }}>
                The app will only propose mealtimes matching both your preferences and the group's allowed types in Settings.
              </div>
              <div style={{ background:"rgba(201,149,106,0.07)", borderRadius:"10px", padding:"10px 14px", marginBottom:"20px", fontSize:"12px", color:"#c9956a", lineHeight:"1.7" }}>
                Cutoff: <strong>{cutoffDays} days</strong> before the dinner. Greyed dates are no longer eligible.
                {autoSubmit && <span style={{ color:"#7a9e7e" }}> · Auto-submittal on.</span>}
                <div style={{ marginTop:"4px", fontSize:"11px", color:"#7a5a40" }}>The date is announced as soon as everyone submits — no waiting for a deadline.</div>
              </div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"14px" }}>Next 3 Weeks</div>
              <CalendarGrid selectedArr={selectedDates} setArr={setSelectedDates} weeks={3} cutoffDays={cutoffDays} showToast={showToast}/>
              {selectedDates.length > 0 && (
                <div style={{ background:"rgba(201,149,106,0.07)", borderRadius:"12px", padding:"11px", marginBottom:"16px", fontSize:"12px", color:"#c9956a", textAlign:"center" }}>
                  {selectedDates.length} evening{selectedDates.length > 1 ? "s" : ""} selected · {selectedMealTypes.join(", ")}
                </div>
              )}

              {availabilityModifying ? (
                <div style={{ display:"flex", gap:"10px", marginBottom:"16px" }}>
                  <button style={{ ...S.ghostBtn, flex:1, marginBottom:0 }} onClick={() => setAvailabilityModifying(false)}>
                    Cancel
                  </button>
                  <button style={{ ...S.primaryBtn, flex:1, marginBottom:0 }} onClick={async () => {
                    const saved = await dbData.saveAvailability(selectedDates);
                    if (saved) {
                      showToast("Dates updated. The host has been notified.");
                    } else {
                      showToast("Failed to save. Try again.");
                    }
                    setAvailabilityModifying(false);
                  }}>
                    Save Changes
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Group Status</div>
                  {currentMembers.map(m => {
                    const isYou = m.name === "You";
                    const hasSubmitted = isYou ? selectedDates.length > 0 : (memberAvailability[m.name]?.length || 0) > 0;
                    return (
                      <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                          <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
                        </div>
                        <span style={{ fontSize:"12px", fontStyle:"italic", color: hasSubmitted ? "#7a9e7e" : "#5a3a25" }}>
                          {isYou ? (selectedDates.length > 0 ? `${selectedDates.length} dates` : "Not yet set") : hasSubmitted ? "Submitted" : "Waiting"}
                        </span>
                      </div>
                    );
                  })}

                  {/* ── Admin Override ── */}
                  <div style={{ marginTop:"20px", marginBottom:"8px" }}>
                    <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Host Override</div>
                    <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.15)", background:"rgba(201,149,106,0.03)" }}>
                      <div style={{ fontSize:"13px", color:"#f5e6d3", marginBottom:"6px", fontWeight:"500" }}>Force a Date</div>
                      <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
                        Tired of waiting? As host, you can lock in a date even if not everyone has submitted. Members who haven't responded will be marked as not attending.
                      </div>
                      {currentMembers.filter(m => m.name !== "You" && !(memberAvailability[m.name]?.length > 0)).length > 0 && (
                        <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"10px", padding:"10px 14px", marginBottom:"14px" }}>
                          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"8px" }}>Haven't Submitted</div>
                          {currentMembers.filter(m => m.name !== "You" && !(memberAvailability[m.name]?.length > 0)).map(m => (
                            <div key={m.name} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 0" }}>
                              <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                              <span style={{ fontSize:"12px", color:"#f5e6d3" }}>{m.name}</span>
                              <span style={{ fontSize:"10px", color:"#5a3a25", fontStyle:"italic", marginLeft:"auto" }}>will be marked absent</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button style={{ ...S.primaryBtn, marginBottom:"0", fontSize:"12px", padding:"13px", background:"linear-gradient(135deg,#9a6040,#c9956a)" }}
                        onClick={() => {
                          if (selectedDates.length === 0) { showToast("Select at least one date first."); return; }
                          dbData.proposeDate(selectedDates[0]).then(ok => {
                            if (ok) showToast("Date locked. Members not submitted marked as absent.");
                            else showToast("Failed. Try again.");
                          });
                        }}>
                        Override & Lock Date
                      </button>
                      <div style={{ fontSize:"10px", color:"#5a3a25", fontStyle:"italic", marginTop:"8px", textAlign:"center" }}>Only visible to the host</div>
                    </div>
                  </div>

                  <div style={{ height:"18px" }}/>
                  <button style={S.primaryBtn} onClick={async () => { 
                    if (selectedDates.length > 0) { 
                      const saved = await dbData.saveAvailability(selectedDates);
                      if (saved) {
                        showToast("Availability saved. Waiting on host to pick a date.");
                        setScreen("club_home");
                        setActiveTab("home");
                      } else {
                        showToast("Failed to save. Try again.");
                      }
                    } 
                  }}>
                    Submit Availability
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
    );
  }

  // ── REVEAL TAB ──
  if (screen === "reveal") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Reveal" />;
    const ag = { ...activeGroup, dinnerStatus: dbData.dinnerStatus, nextDinner: dbData.nextDinner, pendingDate: dbData.pendingDate };
    const hostIsYou = dbData.isHost;
    const hasScheduled = ag.dinnerStatus === "scheduled" && ag.nextDinner;
    const hasConfirmed = ag.dinnerStatus === "pending_confirm" && ag.pendingDate;

    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.header}>
          <div style={S.headerEye}>{ag.name}</div>
          <div style={S.headerTitle}>Reveal</div>
        </div>
        <div style={S.screen}>
          {hasScheduled ? (
            <>
              {/* Dinner is booked — show reveal countdown or info */}
              <div style={{ ...S.revealBox, margin:"20px 16px" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Next Dinner</div>
                <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"8px" }}>{ag.nextDinner}</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>7:30 PM</div>
                <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 20px" }}/>
                {hostIsYou ? (
                  <>
                    <div style={{ fontSize:"14px", color:"#c9956a", marginBottom:"8px", fontStyle:"italic" }}>You know the secret destination.</div>
                    <div style={{ fontSize:"12px", color:"#5a3a25" }}>The group will find out at 8 AM on dinner day.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:"40px", color:"#c9956a", marginBottom:"16px" }}>?</div>
                    <div style={{ fontSize:"15px", color:"#f5e6d3", marginBottom:"8px" }}>Destination Unknown</div>
                    <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic" }}>Only the host knows where you're going.</div>
                    <div style={{ marginTop:"20px", padding:"12px 16px", background:"rgba(201,149,106,0.07)", borderRadius:"12px", fontSize:"12px", color:"#c9956a" }}>
                      Restaurant revealed at 8 AM on dinner day
                    </div>
                  </>
                )}
              </div>

              {/* Group members status */}
              <div style={{ ...S.card }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>The Table</div>
                {currentMembers.map(m => (
                  <div key={m.name} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#1a0f0a", fontWeight:"700" }}>{m.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</div>
                      <div style={{ fontSize:"11px", color:"#5a3a25" }}>Confirmed</div>
                    </div>
                    <span style={{ fontSize:"11px", color:"#7a9e7e" }}>Ready</span>
                  </div>
                ))}
              </div>
            </>
          ) : hasConfirmed ? (
            <div style={{ ...S.revealBox, margin:"20px 16px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Pending Confirmation</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"8px" }}>{ag.pendingDate}</div>
              <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>Waiting for the host to finalize the booking.</div>
            </div>
          ) : (
            <div style={{ ...S.revealBox, margin:"20px 16px" }}>
              <div style={{ fontSize:"40px", color:"#4a2e18", marginBottom:"16px" }}>◎</div>
              <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"8px" }}>No Reveal Yet</div>
              <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>Once the group picks a date and the host books a restaurant, the reveal countdown begins.</div>
              <button style={{ ...S.primaryBtn, marginTop:"20px" }} onClick={() => { setActiveTab("schedule"); setScreen("availability"); }}>
                Set Availability
              </button>
            </div>
          )}
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── NEW HOST SELECTED (Secret Reveal) ──
  if (screen === "new_host_reveal") {
    const secretMsg = SECRET_HOST_MESSAGES[Math.floor(Math.random() * SECRET_HOST_MESSAGES.length)];
    const privilegeMsg = HOST_PRIVILEGE_MESSAGES[Math.floor(Math.random() * HOST_PRIVILEGE_MESSAGES.length)];
    
    return (
      <div style={S.app}><div style={S.phone}>
        <div style={{ ...S.welcomeBg, background:"linear-gradient(180deg, #0d0805 0%, #1a0f0a 50%, #2a1a10 100%)" }}>
          <div style={{ 
            position:"absolute", 
            top:"50%", 
            left:"50%", 
            transform:"translate(-50%, -50%)", 
            width:"300px", 
            height:"300px", 
            background:"radial-gradient(circle, rgba(201,149,106,0.1) 0%, transparent 70%)", 
            borderRadius:"50%",
            animation:"pulse 3s ease-in-out infinite"
          }}/>
          
          <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"40px 24px" }}>
            <div style={{ 
              width:"100px", 
              height:"100px", 
              borderRadius:"50%", 
              border:"2px solid rgba(201,149,106,0.4)", 
              margin:"0 auto 32px",
              display:"flex", 
              alignItems:"center", 
              justifyContent:"center",
              background:"rgba(201,149,106,0.05)"
            }}>
              <div style={{ 
                width:"70px", 
                height:"70px", 
                borderRadius:"50%", 
                border:"1.5px solid rgba(201,149,106,0.6)",
                display:"flex", 
                alignItems:"center", 
                justifyContent:"center",
                fontSize:"24px",
                color:"#c9956a"
              }}>
                ◆
              </div>
            </div>
            
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"20px" }}>
              Top Secret Transmission
            </div>
            
            <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"16px", lineHeight:"1.3" }}>
              You've Been<br/>Chosen
            </div>
            
            <div style={{ fontSize:"15px", color:"#c9956a", marginBottom:"24px", fontStyle:"italic", lineHeight:"1.7" }}>
              {secretMsg}
            </div>
            
            <div style={{ 
              background:"rgba(201,149,106,0.08)", 
              borderRadius:"16px", 
              padding:"20px", 
              marginBottom:"32px",
              border:"1px solid rgba(201,149,106,0.2)"
            }}>
              <div style={{ fontSize:"12px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"600" }}>
                You are now the Host of
              </div>
              <div style={{ fontSize:"20px", color:"#c9956a", marginBottom:"4px" }}>
                {activeGroup.name}
              </div>
              <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic" }}>
                {privilegeMsg}
              </div>
            </div>
            
            <div style={{ fontSize:"13px", color:"#7a5a40", lineHeight:"1.7", marginBottom:"28px" }}>
              When the group schedules the next dinner, you'll be the one who knows where they're going — and they won't.
            </div>
            
            <button 
              style={{ ...S.primaryBtn, background:"linear-gradient(135deg, #c9956a, #9a6040)", marginBottom:"12px" }} 
              onClick={async () => { 
                if (dbData.currentMember) {
                  await dbData.makeHost(dbData.currentMember.id);
                }
                setScreen("club_home"); 
                setActiveTab("home");
                showToast("You're officially the host. Keep the secret safe.");
              }}
            >
              Accept the Responsibility
            </button>
            
            <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic" }}>
              This message will self-destruct... just kidding. But do keep it secret.
            </div>
          </div>
        </div>
      </div></div>
    );
  }

  // ── BADGES ──
  if (screen === "badges") {
    return (
      <BadgesScreen
        userBadges={dbData.userBadges}
        activeGroupId={activeGroupId}
        activeTab={activeTab}
        onNavigate={onNavigate}
        groupName={activeGroup.name || undefined}
      />
    );
  }

  // ── PROFILE ──
  if (showProfile) {
    return (
      <ProfileScreen
        user={user}
        onClose={() => setShowProfile(false)}
        showToast={showToast}
        signOut={signOut}
      />
    );
  }

  return null;
}

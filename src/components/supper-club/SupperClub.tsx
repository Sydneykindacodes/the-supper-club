import { useState, useCallback, useEffect } from "react";
import {
  INDIVIDUAL_BADGES, GROUP_BADGES,
  WITTY_NO_DATE, MEAL_TYPES, WITTY_HOST_WAITING,
  SECRET_HOST_MESSAGES, HOST_PRIVILEGE_MESSAGES, WITTY_INITIATION_MESSAGES,
  WITTY_SKIP_MESSAGES, WITTY_AWAITING_HOST, WITTY_SOLO_MESSAGES,
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
import NotificationConsent from "./NotificationConsent";
import ReviewForm from "./ReviewForm";
import BadgesScreen from "./BadgesScreen";
import ProfileScreen from "./ProfileScreen";
import MemberProfileView from "./MemberProfileView";
import RestaurantReveal from "./RestaurantReveal";
import HostReveal from "./HostReveal";

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
  photoRefs?: string[];
  lat?: number | null;
  lng?: number | null;
}

// Haversine distance in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import { S, tabPill, chip, FONT_DISPLAY_FAMILY } from "./styles";
import {
  StarRating, Toggle, PriceTag, RatingBadge,
  NavBar, CalendarGrid, MealTypeSelector, ShareRow, GlobalGroupSwitcher,
} from "./shared";

// ── Restaurant Photo Strip (fetches Google Places photos) ──
const RestaurantPhotoStrip = ({ photoRefs, fetchPhotoUrl }: { photoRefs: string[]; fetchPhotoUrl: (ref: string) => Promise<string | null> }) => {
  const [urls, setUrls] = useState<(string | null)[]>(photoRefs.map(() => null));
  useEffect(() => {
    photoRefs.forEach((ref, i) => {
      fetchPhotoUrl(ref).then(url => {
        if (url) setUrls(prev => { const n = [...prev]; n[i] = url; return n; });
      });
    });
  }, [photoRefs.join(',')]);
  const loaded = urls.filter(Boolean);
  if (loaded.length === 0) return (
    <div style={{ width:"100%", height:"120px", background:"linear-gradient(135deg, rgba(201,149,106,0.08), rgba(26,15,10,0.6))", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"20px", height:"20px", border:"2px solid rgba(201,149,106,0.3)", borderTop:"2px solid #c9956a", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
    </div>
  );
  return (
    <div style={{ display:"flex", width:"100%", height:"120px", overflow:"hidden" }}>
      {loaded.map((url, i) => (
        <img key={i} src={url!} alt="" style={{ flex:1, objectFit:"cover", minWidth:0 }} loading="lazy" />
      ))}
    </div>
  );
};

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
  const MAX_GROUPS = 10;
  const MAX_POOL_SIZE = 20;
  const userName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || "You";
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [screen, setScreen] = useState<string>("loading");
  const [greetingPhase, setGreetingPhase] = useState<"in" | "hold" | "out" | null>(() => {
    if (sessionStorage.getItem("sc_greeted")) return null;
    return "in";
  });
  const [pendingScreen, setPendingScreen] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const EMPTY_GROUP: Group = { id: 0 as any, name: "", code: "", members: 0, city: "", dinnerStatus: "no_date", nextDinner: null, pendingDate: null, is_temporary: false };
  const [activeGroup, setActiveGroup] = useState<Group>(EMPTY_GROUP);
  const [activeTab, setActiveTab] = useState("home");

  // Load current user's avatar_url
  useEffect(() => {
    supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
    });
  }, [user.id]);

  // Load user's groups from DB on mount (and handle invite links)
  useEffect(() => {
    const loadGroups = async () => {
      // Check for invite link in URL
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get("invite");

      // Helper: set screen directly or defer if greeting is active
      const goToScreen = (s: string) => {
        if (greetingPhase) {
          setPendingScreen(s);
        } else {
          setScreen(s);
        }
      };

      // Check if user has any groups via members table
      const { data: memberRows } = await supabase
        .from("members")
        .select("group_id, groups(id, name, code, city, is_temporary)")
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
            is_temporary: m.groups.is_temporary || false,
          }));
        if (loadedGroups.length > 0) {
          setGroups(loadedGroups);
          setActiveGroup(loadedGroups[0]);
          goToScreen("club_home");
          setActiveTab("home");
          // If there's an invite code, auto-join that group too
          if (inviteCode) {
            const alreadyIn = loadedGroups.some(g => g.code === inviteCode.toUpperCase().trim());
            if (alreadyIn) {
              const target = loadedGroups.find(g => g.code === inviteCode.toUpperCase().trim());
              if (target) setActiveGroup(target);
            } else {
              setJoinMode("join");
              setJoinCode(inviteCode);
              goToScreen("join_club_inapp");
            }
            window.history.replaceState({}, "", window.location.pathname);
          }
          return;
        }
      }
      // New user — check for invite link
      if (inviteCode) {
        setJoinMode("join");
        setJoinCode(inviteCode);
        goToScreen("join_create");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      // New user — show onboarding if not yet completed
      const onboarded = localStorage.getItem("sc_onboarded");
      const notifConsent = localStorage.getItem("sc_notif_consent");
      if (!onboarded) {
        goToScreen("onboarding");
      } else if (!notifConsent) {
        goToScreen("notif_consent");
      } else {
        goToScreen("welcome");
      }
    };
    loadGroups();
  }, [user.id]);

  // Greeting animation sequence: in → hold → out → done
  useEffect(() => {
    if (!greetingPhase) return;
    if (greetingPhase === "in") {
      const t = setTimeout(() => setGreetingPhase("hold"), 600);
      return () => clearTimeout(t);
    }
    if (greetingPhase === "hold") {
      const t = setTimeout(() => setGreetingPhase("out"), 1400);
      return () => clearTimeout(t);
    }
    if (greetingPhase === "out") {
      const t = setTimeout(() => {
        setGreetingPhase(null);
        sessionStorage.setItem("sc_greeted", "1");
        if (pendingScreen) {
          setScreen(pendingScreen);
          setPendingScreen(null);
        }
      }, 600);
      return () => clearTimeout(t);
    }
  }, [greetingPhase, pendingScreen]);

  // Data hook for DB-backed members, restaurants
  const activeGroupId = typeof activeGroup.id === 'string' ? activeGroup.id : null;
  const isTemporaryGroup = activeGroup.is_temporary || false;
  const dbData = useSupperClubData(user, activeGroupId, isTemporaryGroup);

  // Realtime subscriptions for live updates
  useRealtimeSubscriptions(activeGroupId, dbData.refresh);

  // Auto-earn badges based on activity
  useBadgeTriggers(
    dbData.communityReviews,
    dbData.userBadges,
    user.id,
    dbData.hostCount,
    dbData.earnBadge,
    activeGroupId
  );

  // Notifications
  const memberIdsForNotif = dbData.currentMember ? [dbData.currentMember.id] : [];
  const notifs = useNotifications(user, memberIdsForNotif);

  // Review form and profile state
  const [showReviewForm, setShowReviewForm] = useState<{ restaurant: string; cuisine?: string; city?: string; reservationId?: string } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingMemberUserId, setViewingMemberUserId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRevealAnimation, setShowRevealAnimation] = useState(false);
  const [hasSeenReveal, setHasSeenReveal] = useState(false);
  const [bookingLinks, setBookingLinks] = useState<{ google: string; opentable?: string; resy?: string; yelp?: string; phone?: string; website?: string } | null>(null);
  const [showBookingLinks, setShowBookingLinks] = useState(false);
  const [postDinnerReviewPrompt, setPostDinnerReviewPrompt] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancellationNotice, setShowCancellationNotice] = useState(false);
  const [showTempFarewell, setShowTempFarewell] = useState(false);
  const [prevDinnerStatus, setPrevDinnerStatus] = useState<string | null>(null);
  const [postDinnerStep, setPostDinnerStep] = useState<"review" | "availability" | "completing" | null>(null);
  const [wittyAwaitingIdx] = useState(Math.floor(Math.random() * WITTY_AWAITING_HOST.length));
  const [wittysoloIdx] = useState(Math.floor(Math.random() * WITTY_SOLO_MESSAGES.length));

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
  
  const [availabilityModifying, setAvailabilityModifying] = useState(false);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCity, setNewGroupCity] = useState("");
  const [newGroupTemporary, setNewGroupTemporary] = useState(false);
  const [groupAdmin, setGroupAdmin] = useState(userName);
  const [groupCreator] = useState(userName);
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");

  // Member availability tracking
  const [memberAvailability, setMemberAvailability] = useState<MemberAvailability>({});
  const [hostSelectedDate, setHostSelectedDate] = useState<string | null>(null);
  const [selectedRestId, setSelectedRestId] = useState<string | null>(null);
  const [showHostRevealAnimation, setShowHostRevealAnimation] = useState(false);
  const [hasSeenHostReveal, setHasSeenHostReveal] = useState(false);

  // Use DB-backed restaurants when available, else local pool
  const [groupPools, setGroupPools] = useState<Record<string | number, Restaurant[]>>({});
  const poolRestaurants = dbData.restaurants.length > 0 ? dbData.restaurants : (groupPools[activeGroup.id] || []);
  const setPoolRestaurants = (fn: (p: Restaurant[]) => Restaurant[]) => {
    setGroupPools(prev => ({ ...prev, [activeGroup.id]: fn(prev[activeGroup.id] || []) }));
  };
  const visitedRestaurants = dbData.visitedRestaurants;

  // Use DB members when available, else fallback to static MEMBERS
  const currentMembers = dbData.uiMembers;

  // Check if a restaurant is within the group's search radius
  const isWithinRadius = (r: { lat?: number | null; lng?: number | null }): boolean => {
    if (!groupCityCenter || !r.lat || !r.lng) return true; // allow if no coords available
    const dist = haversineDistance(groupCityCenter.lat, groupCityCenter.lng, r.lat, r.lng);
    return dist <= searchRadius;
  };

  // Add restaurant to group pool(s) - DB-backed
  const addToGroupPool = async (restaurant: Restaurant & { lat?: number | null; lng?: number | null }, groupIds: (number | string)[]) => {
    // Distance check
    if (!isWithinRadius(restaurant)) {
      showToast(`${restaurant.name} is outside your group's ${searchRadius}-mile radius.`);
      return;
    }
    let added = 0;
    let dupes = 0;
    let full = false;
    for (const gid of groupIds) {
      const gidStr = String(gid);
      // Check pool size limit
      const currentPoolSize = poolRestaurants.length + visitedRestaurants.length;
      if (currentPoolSize >= MAX_POOL_SIZE) { full = true; continue; }
      const result = await dbData.addRestaurantToPool({
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        city: restaurant.city,
        price: restaurant.price,
        googleRating: restaurant.googleRating,
        googleReviewCount: restaurant.googleReviewCount,
      }, gidStr);
      if (result === "duplicate") dupes++;
      else if (result === true) added++;
    }
    if (full) {
      showToast(`Pool is full (max ${MAX_POOL_SIZE} restaurants).`);
    } else if (dupes > 0 && added === 0) {
      showToast(`${restaurant.name} is already in the pool.`);
    } else if (added > 0 && dupes > 0) {
      showToast(`Added to ${added} group${added > 1 ? "s" : ""}. Already in ${dupes} pool${dupes > 1 ? "s" : ""}.`);
    } else if (added > 0) {
      showToast(`Added to ${added} group${added > 1 ? "s" : ""}.`);
    }
  };

  const [exploreView, setExploreView] = useState("search");
  const [visitedSort, setVisitedSort] = useState("date");
  const [visitedFilter, setVisitedFilter] = useState("all");
  const [exploreCuisineFilter, setExploreCuisineFilter] = useState<string[]>([]);
  const [explorePriceFilter, setExplorePriceFilter] = useState("all");
  const [communitySearchQuery, setCommunitySearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const MAX_ITEMS = 50;
  const [selectedPublicR, setSelectedPublicR] = useState<string | null>(null);
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState<Restaurant | GooglePlace | null>(null);
  const [addToGroupPicker, setAddToGroupPicker] = useState<{ restaurant: Restaurant; visible: boolean }>({ restaurant: { id: 0, name: "", cuisine: "", city: "", price: 0, visited: false, visitedDate: null, visitedRating: null } as Restaurant, visible: false });
  const [addToGroupSelected, setAddToGroupSelected] = useState<number[]>([]);
  const [rName, setRName] = useState("");
  const [rCuisine, setRCuisine] = useState("");
  const [rCity, setRCity] = useState<string | null>(null);
  const [rPrice, setRPrice] = useState(3);

  // Seed pool state (for initial restaurant picks after create/join)
  const [seedPoolMin, setSeedPoolMin] = useState(3);
  const [seedPoolMax, setSeedPoolMax] = useState(3);
  const [seedPoolPicks, setSeedPoolPicks] = useState<GooglePlace[]>([]);
  const [seedPoolSearch, setSeedPoolSearch] = useState("");
  const [seedPoolResults, setSeedPoolResults] = useState<GooglePlace[]>([]);
  const [seedPoolLoading, setSeedPoolLoading] = useState(false);
  const [seedPoolSaving, setSeedPoolSaving] = useState(false);

  const [freeReviewRestaurant, setFreeReviewRestaurant] = useState("");
  const [freeReviewRating, setFreeReviewRating] = useState(0);
  const [freeReviewText, setFreeReviewText] = useState("");
  const [freeReviewMealType, setFreeReviewMealType] = useState("Dinner");
  const [freeReviewPhoto, setFreeReviewPhoto] = useState(false);
  const [freeReviewCity, setFreeReviewCity] = useState("");
  const [freeReviewCuisine, setFreeReviewCuisine] = useState("");
  const [freeReviewShowSuggestions, setFreeReviewShowSuggestions] = useState(false);

  // Restaurant suggestions for free review from DB restaurants only
  const allKnownRestaurants = [...poolRestaurants, ...visitedRestaurants];
  const restaurantSuggestions = freeReviewRestaurant.length >= 2
    ? allKnownRestaurants.filter(r => r.name.toLowerCase().includes(freeReviewRestaurant.toLowerCase()))
    : [];

  // City autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<{ description: string; placeId: string }[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [citySearchTimeout, setCitySearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Photo URL cache
  const [photoCache, setPhotoCache] = useState<Record<string, string>>({});

  const searchCityAutocomplete = useCallback(async (input: string) => {
    if (input.length < 2) { setCitySuggestions([]); return; }
    try {
      const { data, error } = await supabase.functions.invoke('autocomplete-city', { body: { input } });
      if (!error && data?.suggestions) {
        setCitySuggestions(data.suggestions);
        setShowCitySuggestions(true);
      }
    } catch { setCitySuggestions([]); }
  }, []);

  const handleCityInputChange = useCallback((value: string) => {
    setRCity(value);
    if (citySearchTimeout) clearTimeout(citySearchTimeout);
    const timeout = setTimeout(() => searchCityAutocomplete(value), 300);
    setCitySearchTimeout(timeout);
  }, [citySearchTimeout, searchCityAutocomplete]);

  const fetchPhotoUrl = useCallback(async (photoRef: string) => {
    if (photoCache[photoRef]) return photoCache[photoRef];
    try {
      const { data, error } = await supabase.functions.invoke('place-photo', { body: { photoName: photoRef, maxWidth: 400 } });
      if (!error && data?.url) {
        setPhotoCache(prev => ({ ...prev, [photoRef]: data.url }));
        return data.url as string;
      }
    } catch {}
    return null;
  }, [photoCache]);

  const [searchRadius, setSearchRadius] = useState(10);
  const [groupCityCenter, setGroupCityCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Google Places search state
  const [gpResults, setGpResults] = useState<GooglePlace[]>([]);
  const [gpLoading, setGpLoading] = useState(false);
  const [gpNextPageToken, setGpNextPageToken] = useState<string | null>(null);
  const [gpLoadingMore, setGpLoadingMore] = useState(false);
  const [gpLastSearchTerm, setGpLastSearchTerm] = useState("");
  const [gpLastSearchCity, setGpLastSearchCity] = useState("");
  const [gpFreeResults, setGpFreeResults] = useState<GooglePlace[]>([]);
  const [gpFreeLoading, setGpFreeLoading] = useState(false);

  // Reset cancellation tracking and city center when switching groups
  useEffect(() => {
    setPrevDinnerStatus(null);
    setShowCancellationNotice(false);
    setGroupCityCenter(null);
    // Eagerly geocode group city for radius checks
    if (activeGroup.city) {
      supabase.functions.invoke('search-restaurants', {
        body: { query: "restaurant", city: activeGroup.city, radius: searchRadius },
      }).then(({ data }) => {
        if (data?.cityCenter) setGroupCityCenter(data.cityCenter);
      }).catch(() => {});
    }
  }, [activeGroupId]);

  // Detect dinner cancellation — show notice to non-host members
  // Skip on initial load (prevDinnerStatus null) or when status was already "no_date"
  useEffect(() => {
    const current = dbData.dinnerStatus;
    if (prevDinnerStatus && prevDinnerStatus !== "no_date" && current === "no_date" && !dbData.isHost) {
      setShowCancellationNotice(true);
    }
    if (current) setPrevDinnerStatus(current);
  }, [dbData.dinnerStatus, dbData.isHost, prevDinnerStatus]);

  // Restaurant detail reviews come from DB now

  const searchGooglePlaces = useCallback(async (query: string, city: string, setter: (r: GooglePlace[]) => void, setLoading: (b: boolean) => void, pageToken?: string) => {
    if (query.length < 2 && !pageToken) { setter([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-restaurants', {
        body: { query, city: city || activeGroup.city || "New York, NY", radius: searchRadius, pageToken },
      });
      if (error) throw error;
      const newResults = data?.restaurants || [];
      if (pageToken) {
        setGpResults(prev => [...prev, ...newResults]);
      } else {
        setter(newResults);
      }
      setGpNextPageToken(data?.nextPageToken || null);
      // Cache group city center from search results
      if (data?.cityCenter && !groupCityCenter) {
        setGroupCityCenter(data.cityCenter);
      }
    } catch {
      if (!pageToken) setter([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup.city, searchRadius, groupCityCenter]);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [postDinnerDates, setPostDinnerDates] = useState<string[]>([]);

  // Fetch availability from OTHER groups to show cross-group indicators
  const [otherGroupDates, setOtherGroupDates] = useState<string[]>([]);
  useEffect(() => {
    if (!activeGroupId || groups.length <= 1) { setOtherGroupDates([]); return; }
    const fetchOtherAvail = async () => {
      // Get member IDs for user in other groups
      const { data: otherMembers } = await supabase
        .from("members")
        .select("id, group_id")
        .eq("user_id", user.id)
        .neq("group_id", activeGroupId);
      if (!otherMembers || otherMembers.length === 0) { setOtherGroupDates([]); return; }
      const memberIds = otherMembers.map(m => m.id);
      const { data: avail } = await supabase
        .from("member_availability")
        .select("available_dates")
        .in("member_id", memberIds);
      if (avail) {
        const allDates = new Set<string>();
        avail.forEach(a => a.available_dates.forEach((d: string) => allDates.add(d)));
        setOtherGroupDates(Array.from(allDates));
      }
    };
    fetchOtherAvail();
  }, [activeGroupId, groups.length, user.id]);
  const [selectedMealTypes, setSelectedMealTypes] = useState(["Dinner"]);
  const [confirmationVotes, setConfirmationVotes] = useState<Record<string, boolean>>({});

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

  // Post-dinner reset
  // dinnerCompletedAt is no longer needed - post-dinner is auto-detected via dinnerStatus

  const resetForNextDinner = useCallback(() => {
    setSelectedDates([]);
    setPostDinnerDates([]);
    setAvailabilityModifying(false);
    setHostSelectedDate(null);
    setConfirmationVotes({});
    setReviewRating(0);
    setReviewText("");
    setPhotoSubmitted(false);
    setReturnChoice(null);
    setBestDishMember(null);
    setRevealUnlocked(false);
    setBookingDateConfirm(false);
    
    setMemberAvailability({});
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
    const reviews = dbData.communityReviews
      .filter(rev => rev.restaurant_name === r.name)
      .map(rev => ({ text: rev.review_text || "", rating: rev.rating }));
    fetchRestaurantDescription(r.name, cuisine, r.city, reviews);
  }, [fetchRestaurantDescription, dbData.communityReviews]);

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

  // Helper to send push notifications to all group members + in-app for self
  const sendGroupNotification = useCallback(async (type: string, excludeSelf = true) => {
    if (!activeGroupId) return;
    try {
      // Send to other members
      await supabase.functions.invoke('send-group-notification', {
        body: {
          group_id: activeGroupId,
          type,
          reservation_id: dbData.activeReservation?.id || null,
          exclude_member_id: excludeSelf ? dbData.currentMember?.id : undefined,
        },
      });
      // Also insert an in-app notification for self so it shows in the running tab
      if (excludeSelf && dbData.currentMember?.id) {
        await supabase.from("notifications").insert({
          member_id: dbData.currentMember.id,
          reservation_id: dbData.activeReservation?.id || null,
          type,
          channel: "in_app",
          delivered: true, // already seen by the person who triggered it
        });
      }
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  }, [activeGroupId, dbData.activeReservation?.id, dbData.currentMember?.id]);

  // Check if pool is low (<5) and send a notification — only after at least 1 completed dinner
  const checkLowPoolNotification = useCallback(async (poolSizeAfterAction: number) => {
    if (!activeGroupId || poolSizeAfterAction >= 5) return;
    // Check if group has at least 1 completed reservation
    const { data: completed } = await supabase
      .from("reservations")
      .select("id")
      .eq("group_id", activeGroupId)
      .eq("status", "completed")
      .limit(1);
    if (!completed || completed.length === 0) return;
    // Send notification to all members
    await supabase.functions.invoke('send-group-notification', {
      body: {
        group_id: activeGroupId,
        type: "low_pool",
        reservation_id: null,
      },
    });
  }, [activeGroupId]);

  // Helper to send a notification to the host only
  const sendHostNotification = useCallback(async (type: string) => {
    if (!activeGroupId) return;
    const hostMember = dbData.members.find(m => m.is_host);
    if (!hostMember) return;
    try {
      await supabase.from("notifications").insert({
        member_id: hostMember.id,
        reservation_id: dbData.activeReservation?.id || null,
        type,
        channel: "push",
        delivered: false,
      });
    } catch (e) {
      console.error('Failed to send host notification:', e);
    }
  }, [activeGroupId, dbData.members, dbData.activeReservation?.id]);

  const iEarned = INDIVIDUAL_BADGES.filter(b => b.earned).length;
  const gEarned = GROUP_BADGES.filter(b => b.earned).length;

  const sortedVisited = [...visitedRestaurants].sort((a, b) => {
    if (visitedSort === "rating") return (b.visitedRating || 0) - (a.visitedRating || 0);
    if (visitedSort === "price") return b.price - a.price;
    return new Date(b.visitedDate || 0).getTime() - new Date(a.visitedDate || 0).getTime();
  });

  // ── GREETING TRANSITION ──
  if (greetingPhase) {
    const firstName = userName.split(" ")[0];
    const opacity = greetingPhase === "in" ? 0 : greetingPhase === "hold" ? 1 : 0;
    const translateY = greetingPhase === "in" ? "12px" : greetingPhase === "hold" ? "0" : "-8px";
    return (
      <div style={{
        fontFamily: "'Montserrat', sans-serif",
        background: "#1a0f0a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
      }}>
        <div style={{
          opacity,
          transform: `translateY(${translateY})`,
          transition: "opacity 0.6s ease, transform 0.6s ease",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "13px", color: "#7a5a40", letterSpacing: "4px", textTransform: "uppercase", marginBottom: "12px" }}>
            Welcome back
          </div>
          <div style={{ fontSize: "32px", color: "#f5e6d3", fontWeight: "300", fontFamily: FONT_DISPLAY_FAMILY }}>
            Hello, {firstName}
          </div>
          <div style={{
            width: "40px", height: "1px",
            background: "rgba(201,149,106,0.4)",
            margin: "16px auto 0",
            opacity: greetingPhase === "hold" ? 1 : 0,
            transform: `scaleX(${greetingPhase === "hold" ? 1 : 0})`,
            transition: "opacity 0.4s ease 0.2s, transform 0.4s ease 0.2s",
          }} />
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (screen === "loading") return <LoadingScreen />;

  // ── ONBOARDING ──
  if (screen === "onboarding") return (
    <Onboarding
      userName={userName}
      onComplete={() => {
        localStorage.setItem("sc_onboarded", "1");
        setScreen("notif_consent");
      }}
    />
  );

  // ── NOTIFICATION CONSENT ──
  if (screen === "notif_consent") return (
    <NotificationConsent
      userId={user.id}
      onComplete={() => setScreen("welcome")}
    />
  );

  // ── WELCOME ──
  if (screen === "welcome") return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.welcomeBg}>
        <div style={S.orb}/>
        <div style={S.eyebrow}>Est. 2026</div>
        <div style={S.mainTitle}>The Supper Club Social</div>
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
  const isSoloGroup = hasGroup && currentMembers.length < 2;

  const SoloPlaceholder = ({ feature }: { feature: string }) => (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />
        <div style={{ padding:"16px 24px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:"28px", color:"#f5e6d3", fontWeight:"400", fontFamily: FONT_DISPLAY_FAMILY }}>{feature}</div>
          <div onClick={() => setShowProfile(true)} style={{ width:"36px", height:"36px", borderRadius:"50%", background: userAvatarUrl ? `url(${userAvatarUrl}) center/cover no-repeat` : (user.user_metadata?.avatar_color || "#c9956a"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#fff", fontWeight:"700", cursor:"pointer", border:"2px solid rgba(201,149,106,0.3)", overflow:"hidden" }}>
            {!userAvatarUrl && userName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 28px", textAlign:"center" }}>
          <div style={{ width:"72px", height:"72px", borderRadius:"18px", background:"linear-gradient(135deg, rgba(201,149,106,0.1), rgba(201,149,106,0.03))", border:"1px solid rgba(201,149,106,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"28px", color:"#c9956a", marginBottom:"24px" }}>
            ◇
          </div>
          <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"12px", fontWeight:"400" }}>
            Waiting for your crew
          </div>
          <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.8", marginBottom:"28px", maxWidth:"280px" }}>
            {WITTY_SOLO_MESSAGES[wittysoloIdx]}
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"rgba(201,149,106,0.06)", borderRadius:"12px", border:"1px solid rgba(201,149,106,0.15)", width:"100%", maxWidth:"300px", marginBottom:"16px" }}>
            <div>
              <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"4px" }}>Invite Code</div>
              <div style={{ fontSize:"16px", color:"#f5e6d3", fontWeight:"600", letterSpacing:"3px" }}>{activeGroup.code}</div>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(activeGroup.code); showToast("Invite code copied!"); }}
              style={{ background:"rgba(201,149,106,0.15)", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontSize:"11px", color:"#c9956a", fontFamily:"Georgia,serif" }}
            >Copy</button>
          </div>
          <button
            onClick={() => {
              const link = `${window.location.origin}/?invite=${activeGroup.code}`;
              navigator.clipboard.writeText(link);
              showToast("Invite link copied!");
            }}
            style={{ ...S.primaryBtn, maxWidth:"300px", marginBottom:"8px" }}
          >Share Invite Link</button>
          <button
            onClick={() => setScreen("group_settings")}
            style={{ ...S.ghostBtn, maxWidth:"300px", marginBottom:"8px" }}
          >◇ Group Settings</button>
          <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginTop:"8px" }}>
            You need at least 2 members to unlock {feature.toLowerCase()}.
          </div>
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
    </div></div>
  );

  const NoGroupPlaceholder = ({ feature }: { feature: string }) => (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={{ padding:"54px 24px 20px", borderBottom:"1px solid rgba(201,149,106,0.1)" }}>
          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"4px" }}>The Supper Club Social</div>
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
      <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
    </div></div>
  );

  // Helper: create group in DB
  const createGroupInDB = async (name: string, city: string, isTemporary: boolean = false) => {
    const code = "SUPR-" + Math.floor(1000 + Math.random() * 9000);
    const { data: groupData, error: groupErr } = await supabase
      .from("groups")
      .insert({ name, city, code, is_temporary: isTemporary })
      .select()
      .single();
    if (groupErr || !groupData) { showToast("Failed to create club. Try again."); return; }

    // Add current user as a member — creator is always host for temp groups
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
      is_temporary: isTemporary,
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
    setGroupAdmin(userName);
    // Founder must seed pool with 3 restaurants
    setSeedPoolMin(3);
    setSeedPoolMax(3);
    setSeedPoolPicks([]);
    setSeedPoolSearch("");
    setSeedPoolResults([]);
    setScreen("seed_pool");
    showToast(`${name} created! Now add 3 restaurants to your pool.`);
    setNewGroupTemporary(false);
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
      is_temporary: (groupData as any).is_temporary || false,
    };
    setGroups(prev => [...prev, newGroup]);
    setActiveGroup(newGroup);
    // New member must add 1-3 restaurants
    setSeedPoolMin(1);
    setSeedPoolMax(3);
    setSeedPoolPicks([]);
    setSeedPoolSearch("");
    setSeedPoolResults([]);
    setScreen("seed_pool");
    showToast(`Welcome to ${groupData.name}! Add at least 1 restaurant to the pool.`);
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid rgba(212,205,196,0.07)", marginBottom:"12px" }}>
              <div>
                <span style={{ fontSize:"14px", color:"#e5ded5" }}>Pop-Up Supper</span>
                <div style={{ fontSize:"10px", color:"#7a5a40", fontStyle:"italic", marginTop:"2px" }}>One night only — dissolves after dinner</div>
              </div>
              <div onClick={() => setNewGroupTemporary(p => !p)} style={{ width:"44px", height:"24px", borderRadius:"12px", background:newGroupTemporary?"linear-gradient(135deg,#d4cdc4,#a49a8e)":"rgba(255,255,255,0.08)", border:newGroupTemporary?"none":"1px solid rgba(212,205,196,0.2)", position:"relative", cursor:"pointer", transition:"all 0.2s" }}>
                <div style={{ position:"absolute", top:"3px", left:newGroupTemporary?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:newGroupTemporary?"#2a2a2a":"#565250", transition:"left 0.2s" }}/>
              </div>
            </div>
            <div style={{ height:"12px" }}/>
            <button style={S.primaryBtn} onClick={() => {
              if (!newGroupName.trim()) { showToast("Give your club a name."); return; }
              if (!newGroupCity.trim()) { showToast("Enter your city."); return; }
              createGroupInDB(newGroupName.trim(), newGroupCity.trim(), newGroupTemporary);
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
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid rgba(212,205,196,0.07)", marginBottom:"12px" }}>
            <div>
              <span style={{ fontSize:"14px", color:"#e5ded5" }}>Pop-Up Supper</span>
              <div style={{ fontSize:"10px", color:"#7a5a40", fontStyle:"italic", marginTop:"2px" }}>One night only — dissolves after dinner</div>
            </div>
            <div onClick={() => setNewGroupTemporary(p => !p)} style={{ width:"44px", height:"24px", borderRadius:"12px", background:newGroupTemporary?"linear-gradient(135deg,#d4cdc4,#a49a8e)":"rgba(255,255,255,0.08)", border:newGroupTemporary?"none":"1px solid rgba(212,205,196,0.2)", position:"relative", cursor:"pointer", transition:"all 0.2s" }}>
              <div style={{ position:"absolute", top:"3px", left:newGroupTemporary?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:newGroupTemporary?"#2a2a2a":"#565250", transition:"left 0.2s" }}/>
            </div>
          </div>
          <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginBottom:"20px" }}>{groups.length} of {MAX_GROUPS} clubs used</div>
          <button style={S.primaryBtn} onClick={() => {
            if (!newGroupName.trim()) { showToast("Name your club first."); return; }
            createGroupInDB(newGroupName.trim(), newGroupCity.trim() || "New York, NY", newGroupTemporary);
          }}>Create & Get Invite Code</button>
          <button style={S.ghostBtn} onClick={() => { setNewGroupName(""); setNewGroupCity(""); setNewGroupTemporary(false); setScreen("club_home"); }}>Cancel</button>
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

  // ── SEED POOL (initial restaurant picks after create/join) ──
  if (screen === "seed_pool") {
    const seedSearchCity = activeGroup.city || "New York, NY";
    const canFinish = seedPoolPicks.length >= seedPoolMin;
    const atMax = seedPoolPicks.length >= seedPoolMax;
    const isFounder = seedPoolMin === 3;

    const handleSeedSearch = () => {
      if (!seedPoolSearch.trim()) return;
      searchGooglePlaces(seedPoolSearch.trim(), seedSearchCity, setSeedPoolResults, setSeedPoolLoading);
    };

    const handleSeedAdd = (r: GooglePlace) => {
      if (atMax) { showToast(`Maximum ${seedPoolMax} picks allowed.`); return; }
      if (seedPoolPicks.some(p => p.name.toLowerCase() === r.name.toLowerCase())) { showToast("Already picked."); return; }
      if (!isWithinRadius(r)) { showToast(`${r.name} is outside your group's ${searchRadius}-mile radius.`); return; }
      setSeedPoolPicks(prev => [...prev, r]);
    };

    const handleSeedRemove = (name: string) => {
      setSeedPoolPicks(prev => prev.filter(p => p.name !== name));
    };

    const handleSeedFinish = async () => {
      if (!canFinish) return;
      setSeedPoolSaving(true);
      for (const r of seedPoolPicks) {
        await dbData.addRestaurantToPool({
          name: r.name,
          cuisine: r.cuisine,
          city: r.city,
          price: r.price,
          googleRating: r.googleRating,
          googleReviewCount: r.googleReviewCount,
          googlePlaceId: r.googlePlaceId,
          address: r.address,
        }, String(activeGroup.id));
      }
      setSeedPoolSaving(false);
      setScreen("club_home");
      setActiveTab("home");
      showToast(`${seedPoolPicks.length} restaurant${seedPoolPicks.length > 1 ? "s" : ""} added to the pool!`);
    };

    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={{ ...S.welcomeBg, justifyContent:"flex-start", paddingTop:"52px", overflowY:"auto" }}>
          <div style={{ width:"100%", paddingBottom:"40px" }}>
            <div style={{ ...S.mainTitle, fontSize:"30px", textAlign:"center", marginBottom:"6px" }}>
              {isFounder ? "Seed Your Pool" : "Add to the Pool"}
            </div>
            <div style={{ ...S.subtitle, textAlign:"center", marginBottom:"8px" }}>
              {isFounder
                ? "Pick 3 restaurants to start your club's pool"
                : "Add 1–3 restaurants to the group pool"}
            </div>
            <div style={{ fontSize:"11px", color:"#8c8278", textAlign:"center", marginBottom:"24px" }}>
              {seedPoolPicks.length} of {seedPoolMax} selected
              {!canFinish && <span style={{ color:"#c45c5c" }}> · {seedPoolMin - seedPoolPicks.length} more needed</span>}
            </div>

            {/* Current picks */}
            {seedPoolPicks.length > 0 && (
              <div style={{ marginBottom:"20px" }}>
                <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Your Picks</div>
                {seedPoolPicks.map(p => (
                  <div key={p.name} style={{ ...S.card, margin:"0 0 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={S.cardTitle}>{p.name}</div>
                      <div style={S.cardSub}>{p.cuisine} · {p.city}</div>
                    </div>
                    <button onClick={() => handleSeedRemove(p.name)} style={{ background:"none", border:"none", color:"#c45c5c", fontSize:"18px", cursor:"pointer", padding:"4px 8px" }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            {!atMax && (
              <>
                <label style={S.label}>Search Restaurants</label>
                <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
                  <input
                    style={{ ...S.input, flex:1, marginBottom:0 }}
                    placeholder={`Search in ${seedSearchCity}...`}
                    value={seedPoolSearch}
                    onChange={e => setSeedPoolSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSeedSearch()}
                  />
                  <button onClick={handleSeedSearch} style={{ ...S.primaryBtn, width:"auto", padding:"12px 20px", marginBottom:0 }}>
                    Go
                  </button>
                </div>

                {seedPoolLoading && (
                  <div style={{ padding:"12px 0", textAlign:"center", fontSize:"12px", color:"#8c8278" }}>Searching...</div>
                )}

                {seedPoolResults.length > 0 && (
                  <div style={{ marginBottom:"16px" }}>
                    <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>
                      Results · {seedPoolResults.length}
                    </div>
                    {seedPoolResults.slice(0, 10).map(r => {
                      const alreadyPicked = seedPoolPicks.some(p => p.name.toLowerCase() === r.name.toLowerCase());
                      return (
                        <div key={r.id} style={{ ...S.card, margin:"0 0 8px", display:"flex", justifyContent:"space-between", alignItems:"center", opacity: alreadyPicked ? 0.5 : 1 }}>
                          <div style={{ flex:1 }}>
                            <div style={S.cardTitle}>{r.name}</div>
                            <div style={S.cardSub}>{r.cuisine} · {"$".repeat(r.price || 2)}</div>
                            <div style={{ fontSize:"11px", color:"#5a3a25", marginTop:"2px" }}>{r.address?.split(',').slice(0,2).join(',') || r.city}</div>
                          </div>
                          <button
                            onClick={() => !alreadyPicked && handleSeedAdd(r)}
                            disabled={alreadyPicked}
                            style={{
                              background: alreadyPicked ? "transparent" : "rgba(201,149,106,0.15)",
                              border: `1px solid ${alreadyPicked ? "rgba(122,158,126,0.3)" : "rgba(201,149,106,0.3)"}`,
                              borderRadius:"8px", padding:"6px 14px",
                              cursor: alreadyPicked ? "default" : "pointer",
                              fontSize:"11px",
                              color: alreadyPicked ? "#7a9e7e" : "#c9956a",
                              fontFamily:"Georgia,serif", whiteSpace:"nowrap",
                            }}
                          >
                            {alreadyPicked ? "✓ Picked" : "+ Add"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Finish button */}
            <button
              style={{ ...S.primaryBtn, opacity: canFinish && !seedPoolSaving ? 1 : 0.4, marginTop:"8px" }}
              onClick={handleSeedFinish}
              disabled={!canFinish || seedPoolSaving}
            >
              {seedPoolSaving ? "Saving..." : canFinish ? `Continue with ${seedPoolPicks.length} Pick${seedPoolPicks.length > 1 ? "s" : ""}` : `Select ${seedPoolMin - seedPoolPicks.length} More`}
            </button>
          </div>
        </div>
      </div></div>
    );
  }

  if (viewingMemberUserId) {
    return (
      <MemberProfileView
        userId={viewingMemberUserId}
        allReviews={dbData.communityReviews}
        onClose={() => setViewingMemberUserId(null)}
        isOwnProfile={viewingMemberUserId === user.id}
      />
    );
  }

  // ── PROFILE ──
  if (showProfile) {
    return (
      <ProfileScreen
        user={user}
        userReviews={dbData.communityReviews.filter(r => r.user_id === user.id)}
        userBadges={dbData.userBadges}
        onClose={() => setShowProfile(false)}
        showToast={showToast}
        signOut={signOut}
      />
    );
  }

  if (screen === "club_home") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Home" />;
    if (isSoloGroup) return <SoloPlaceholder feature="Home" />;

    // ── AWAITING INITIATION: full blocking screen for new members ──
    if (dbData.isAwaitingInitiation) {
      const ag = { ...activeGroup, dinnerStatus: dbData.dinnerStatus, nextDinner: dbData.nextDinner };
      return (
        <div style={S.app}><div style={S.phone}>
          {toast && <div style={S.toast}>{toast}</div>}
          <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />
          <div style={S.screen}>
            <div style={{ padding:"60px 28px 40px", textAlign:"center" }}>
              <div style={{ 
                width:"80px", height:"80px", borderRadius:"50%", margin:"0 auto 24px",
                background:"radial-gradient(circle, rgba(201,149,106,0.12) 0%, transparent 70%)",
                border:"2px solid rgba(201,149,106,0.25)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"28px", color:"#c9956a",
              }}>🍷</div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"12px" }}>
                Fashionably Late
              </div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", fontWeight:"400", lineHeight:"1.4", marginBottom:"16px" }}>
                Welcome to {ag.name}
              </div>
              <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.7", marginBottom:"28px", maxWidth:"300px", margin:"0 auto 28px" }}>
                {WITTY_INITIATION_MESSAGES[wittyInitiationIdx]}
              </div>

              {/* Current dinner info */}
              <div style={{ 
                background:"rgba(201,149,106,0.06)", 
                border:"1px solid rgba(201,149,106,0.15)", 
                borderRadius:"16px", 
                padding:"20px", 
                marginBottom:"16px",
                textAlign:"center",
              }}>
                <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>
                  Dinner in Progress
                </div>
                <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"6px", fontWeight:"500" }}>
                  {ag.nextDinner || "Date TBD"}
                </div>
                <div style={{ fontSize:"12px", color:"#5a3a25" }}>
                  The group is mid-feast · You'll join the next one
                </div>
              </div>

              {/* What happens next */}
              <div style={{ 
                background:"rgba(122,158,126,0.06)", 
                border:"1px solid rgba(122,158,126,0.15)", 
                borderRadius:"12px", 
                padding:"16px", 
                marginBottom:"20px" 
              }}>
                <div style={{ fontSize:"12px", color:"#7a9e7e", lineHeight:"1.7" }}>
                  <strong>What happens next?</strong><br/>
                  Once the group finishes dinner (about 1 hour 45 minutes after the reservation), you'll be fully activated — eligible to add your availability, become host, and join the next dinner.
                </div>
              </div>

              {/* What you can do */}
              <div style={{ 
                background:"rgba(201,149,106,0.04)", 
                borderRadius:"12px", 
                padding:"16px", 
                marginBottom:"24px",
                textAlign:"left",
              }}>
                <div style={{ fontSize:"10px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>
                  While You Wait
                </div>
                <div style={{ fontSize:"12px", color:"#7a5a40", lineHeight:"1.7", marginBottom:"8px" }}>
                  ◇ Browse the restaurant pool and explore options
                </div>
                <div style={{ fontSize:"12px", color:"#7a5a40", lineHeight:"1.7", marginBottom:"8px" }}>
                  ◇ Check out community reviews on the Explore tab
                </div>
                <div style={{ fontSize:"12px", color:"#7a5a40", lineHeight:"1.7" }}>
                  ◇ Set up your profile — make a good first impression
                </div>
              </div>

              <button style={S.ghostBtn} onClick={() => setScreen("group_pool")}>
                Browse Restaurant Pool
              </button>
              <div style={{ height:"8px" }}/>
              <button style={S.ghostBtn} onClick={() => { setActiveTab("explore"); setScreen("explore"); }}>
                Explore Reviews
              </button>
            </div>
          </div>
          <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
        </div></div>
      );
    }

    const ag = { ...activeGroup, dinnerStatus: dbData.dinnerStatus, nextDinner: dbData.nextDinner, pendingDate: dbData.pendingDate };
    const noDate = ag.dinnerStatus === "no_date";
    const pending = ag.dinnerStatus === "pending_confirm";
    
    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <GlobalGroupSwitcher groups={groups} activeGroup={activeGroup} setActiveGroup={setActiveGroup} onNewClub={() => setScreen("new_club")} onJoinClub={() => setScreen("join_club_inapp")} maxGroups={MAX_GROUPS} />

          <div style={{ padding:"16px 24px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:"28px", color:"#f5e6d3", fontWeight:"400", fontFamily:"'Bristol', cursive" }}>Good evening.</div>
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
              <div onClick={() => setShowProfile(true)} style={{ width:"36px", height:"36px", borderRadius:"50%", background: userAvatarUrl ? `url(${userAvatarUrl}) center/cover no-repeat` : (user.user_metadata?.avatar_color || "#c9956a"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#fff", fontWeight:"700", cursor:"pointer", border:"2px solid rgba(201,149,106,0.3)", overflow:"hidden" }}>
                {!userAvatarUrl && userName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>




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
                Copy
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
            const selectedRest = dbData.selectedRestaurantData;
            const mockRestaurant = selectedRest 
              ? { name: selectedRest.name, cuisine: selectedRest.cuisine, city: selectedRest.city, googlePlaceId: selectedRest.google_place_id || undefined }
              : { name: "Restaurant TBD", cuisine: "TBD", city: activeGroup.city || "Unknown", googlePlaceId: undefined };
            
            // Auto-fetch booking links for host
            const fetchLinks = async () => {
              if (hostIsYou && !bookingLinks) {
                const links = await dbData.generateBookingLinks(mockRestaurant.name, mockRestaurant.city, mockRestaurant.googlePlaceId);
                if (links) setBookingLinks(links);
              }
            };
            if (hostIsYou && !bookingLinks) fetchLinks();
            
            const isBooked = !!dbData.activeReservation?.confirmed_at;
            
            return hostIsYou ? (
              <div style={{ ...S.card, border:"2px solid rgba(201,149,106,0.4)", background:"linear-gradient(135deg, rgba(201,149,106,0.08), rgba(26,15,10,0.95))" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                  <span style={{ fontSize:"14px", color: isBooked ? "#7a9e7e" : "#c9956a" }}>{isBooked ? "◈" : "◆"}</span>
                  <div style={{ fontSize:"11px", color: isBooked ? "#7a9e7e" : "#c9956a", letterSpacing:"3px", textTransform:"uppercase" }}>{isBooked ? "Reservation Confirmed" : "For Your Eyes Only"}</div>
                </div>
                {!isBooked && (
                  <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px", lineHeight:"1.7" }}>
                    You hold the secret. The group suspects nothing. Guard this information with your life (or at least until 8 AM on dinner day).
                  </div>
                )}
                <div style={{ background: isBooked ? "rgba(122,158,126,0.08)" : "rgba(201,149,106,0.1)", borderRadius:"12px", padding:"16px", marginBottom:"16px" }}>
                  <div style={{ fontSize:"10px", color: isBooked ? "#7a9e7e" : "#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>{isBooked ? "Booked Restaurant" : "The Secret Destination"}</div>
                  {/* Hide restaurant name until booked — just show cuisine & city hint */}
                  {isBooked ? (
                    <>
                      <div style={{ fontSize:"24px", color:"#f5e6d3", marginBottom:"4px", fontWeight:"500" }}>{mockRestaurant.name}</div>
                      <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>{mockRestaurant.cuisine} · {mockRestaurant.city}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"6px", fontWeight:"500", letterSpacing:"1px" }}>? ? ?</div>
                      <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.6" }}>
                        Even you don't get to peek yet. Call the number below and let the adventure begin.
                      </div>
                    </>
                  )}
                </div>
                {isBooked ? (
                  <>
                    <div style={{ background:"rgba(122,158,126,0.08)", borderRadius:"10px", padding:"14px", textAlign:"center", marginBottom:"12px" }}>
                      <div style={{ fontSize:"12px", color:"#7a9e7e", lineHeight:"1.6" }}>
                        ✓ Booked for <strong>{ag.nextDinner}</strong> · Party of {dbData.activeReservation?.party_size || currentMembers.length}
                      </div>
                      <div style={{ fontSize:"11px", color:"#5a3a25", marginTop:"6px", fontStyle:"italic" }}>Restaurant will be revealed to the group on dinner day</div>
                    </div>
                    {!showCancelConfirm ? (
                      <div style={{ display:"flex", gap:"8px", justifyContent:"center" }}>
                        <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px", flex:1 }} onClick={() => setScreen("host_select_restaurant")}>
                          Change Restaurant
                        </button>
                        <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px", color:"#c45c5c", flex:1 }} onClick={() => setShowCancelConfirm(true)}>
                          Cancel Dinner
                        </button>
                      </div>
                    ) : (
                      <div style={{ background:"rgba(196,92,92,0.06)", border:"1px solid rgba(196,92,92,0.25)", borderRadius:"12px", padding:"16px", textAlign:"center" }}>
                        <div style={{ fontSize:"13px", color:"#f5e6d3", marginBottom:"6px", fontWeight:"500" }}>Cancel this dinner?</div>
                        <div style={{ fontSize:"11px", color:"#7a5a40", marginBottom:"14px", lineHeight:"1.5" }}>
                          Please confirm you've cancelled the restaurant booking. Members will be prompted to update their availability.
                        </div>
                        <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #c45c5c, #9a4040)", fontSize:"13px" }} onClick={async () => {
                          const success = await dbData.cancelDinner();
                          if (success) {
                            showToast("Dinner cancelled. Members can update availability.");
                            setShowCancelConfirm(false);
                            setBookingLinks(null);
                          } else {
                            showToast("Failed to cancel. Try again.");
                          }
                        }}>
                          Yes, I've Cancelled the Booking
                        </button>
                        <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={() => setShowCancelConfirm(false)}>
                          Never Mind
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Phone-first booking */}
                    <div style={{ fontSize:"12px", color:"#f5e6d3", marginBottom:"4px", fontWeight:"500" }}>Make the Reservation</div>
                    <div style={{ fontSize:"11px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
                      The old-fashioned way is the best way. Pick up the phone, call the restaurant, and book it like a proper host.
                    </div>
                    
                    {/* Phone number CTA */}
                    <a 
                      href={bookingLinks?.phone ? `tel:${bookingLinks.phone.replace(/[^+\d]/g, '')}` : undefined}
                      onClick={!bookingLinks?.phone ? (e) => { e.preventDefault(); showToast("Phone number not available — try the online options below."); } : undefined}
                      style={{ 
                        display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", 
                        padding:"16px", background:"linear-gradient(135deg, rgba(122,158,126,0.15), rgba(122,158,126,0.08))", 
                        borderRadius:"14px", border:"2px solid rgba(122,158,126,0.35)", 
                        textDecoration:"none", cursor:"pointer", marginBottom:"8px",
                        transition:"all 0.2s ease",
                      }}>
                      <span style={{ fontSize:"18px" }}>📞</span>
                      <div style={{ textAlign:"left" }}>
                        <div style={{ fontSize:"16px", color:"#f5e6d3", fontWeight:"500", letterSpacing:"1px" }}>
                          {bookingLinks?.phone || "Fetching number..."}
                        </div>
                        <div style={{ fontSize:"10px", color:"#7a9e7e", letterSpacing:"1px", textTransform:"uppercase", marginTop:"2px" }}>
                          Tap to Call
                        </div>
                      </div>
                    </a>
                    
                    <div style={{ background:"rgba(122,158,126,0.08)", borderRadius:"10px", padding:"12px", marginBottom:"16px", textAlign:"center" }}>
                      <div style={{ fontSize:"11px", color:"#7a9e7e", lineHeight:"1.5" }}>
                        📅 <strong>{ag.nextDinner}</strong> · 🍽️ Party of {dbData.activeReservation?.party_size || currentMembers.length}
                      </div>
                      <div style={{ fontSize:"10px", color:"#5a3a25", marginTop:"4px", fontStyle:"italic" }}>Tell them this when you call</div>
                    </div>

                    {/* Witty online fallback */}
                    {!showBookingLinks ? (
                      <button 
                        style={{ ...S.ghostBtn, marginBottom:"12px", fontSize:"11px" }} 
                        onClick={() => setShowBookingLinks(true)}
                      >
                        Can't call right now? Fine, book online...
                      </button>
                    ) : (
                      <div style={{ marginBottom:"16px" }}>
                        <div style={{ fontSize:"11px", color:"#c9956a", fontStyle:"italic", textAlign:"center", marginBottom:"10px", lineHeight:"1.6" }}>
                          Really? You'd rather tap a screen than have a real human interaction? Alright, here you go — but where's the fun in that?
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                          {bookingLinks?.website && (
                            <a href={bookingLinks.website} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"rgba(201,149,106,0.08)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.2)", textDecoration:"none", cursor:"pointer" }}>
                              <span style={{ fontSize:"12px" }}>🌐</span>
                              <span style={{ fontSize:"13px", color:"#f5e6d3" }}>Restaurant Website</span>
                              <span style={{ fontSize:"10px", color:"#7a5a40", marginLeft:"auto", fontStyle:"italic" }}>boring but effective</span>
                            </a>
                          )}
                          <a href={bookingLinks?.google || `https://www.google.com/maps/search/${encodeURIComponent(mockRestaurant.name)}+${encodeURIComponent(mockRestaurant.city)}`} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 14px", background:"rgba(122,158,126,0.06)", borderRadius:"10px", border:"1px solid rgba(122,158,126,0.15)", textDecoration:"none", cursor:"pointer" }}>
                            <span style={{ fontSize:"12px", color:"#7a9e7e" }}>◎</span>
                            <span style={{ fontSize:"13px", color:"#f5e6d3" }}>Google Maps</span>
                          </a>
                          <div style={{ display:"flex", gap:"8px" }}>
                            <a href={bookingLinks?.opentable || `https://www.opentable.com/s?term=${encodeURIComponent(mockRestaurant.name)}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"10px", background:"rgba(255,255,255,0.02)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.08)", textDecoration:"none", cursor:"pointer" }}>
                              <span style={{ fontSize:"11px", color:"#7a5a40" }}>OpenTable</span>
                            </a>
                            <a href={bookingLinks?.resy || `https://resy.com/?query=${encodeURIComponent(mockRestaurant.name)}`} target="_blank" rel="noopener noreferrer" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", padding:"10px", background:"rgba(255,255,255,0.02)", borderRadius:"10px", border:"1px solid rgba(201,149,106,0.08)", textDecoration:"none", cursor:"pointer" }}>
                              <span style={{ fontSize:"11px", color:"#7a5a40" }}>Resy</span>
                            </a>
                          </div>
                          <div style={{ fontSize:"10px", color:"#4a2e18", fontStyle:"italic", textAlign:"center" }}>
                            The phone was right there. Just saying.
                          </div>
                        </div>
                      </div>
                    )}

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
                          <div style={{ fontSize:"12px", color:"#7a5a40", marginTop:"4px" }}>Party of {dbData.activeReservation?.party_size || currentMembers.length}</div>
                        </div>
                        <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #7a9e7e, #5a7a5e)" }} onClick={async () => {
                          const success = await dbData.confirmBooking();
                          if (success) {
                            await sendGroupNotification("dinner_confirmed");
                            showToast("Reservation confirmed.");
                          } else {
                            showToast("Failed to confirm. Try again.");
                          }
                          setBookingDateConfirm(false);
                          setShowBookingLinks(false);
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
                  </>
                )}
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

          {/* Post-Dinner Flow: Review → Availability → Complete */}
          {ag.dinnerStatus === "post_dinner" && (() => {
            const restaurantName = dbData.selectedRestaurantData?.name || "Your Last Dinner";
            const hasReviewed = dbData.hasUserReviewedCurrentDinner;
            const currentStep = postDinnerStep || (hasReviewed ? "availability" : "review");

            if (currentStep === "review" && !hasReviewed) {
              return (
                <div style={{ ...S.card, border:"1px solid rgba(122,158,126,0.3)", background:"linear-gradient(135deg, rgba(122,158,126,0.06), rgba(26,15,10,0.95))", textAlign:"center", padding:"28px 20px" }}>
                  <div style={{ fontSize:"20px", color:"#7a9e7e", marginBottom:"12px" }}>◈</div>
                  <div style={{ fontSize:"11px", color:"#7a9e7e", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>Dinner Complete</div>
                  <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"500", lineHeight:"1.5" }}>
                    Another evening for the books.
                  </div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>
                    How was {restaurantName}? Share your thoughts before we plan the next one.
                  </div>
                  <button style={{ ...S.primaryBtn, marginBottom:"8px", background:"linear-gradient(135deg, #c9956a, #9a6040)" }} onClick={() => {
                    setPostDinnerReviewPrompt(true);
                  }}>
                    Write Your Review
                  </button>
                  <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={() => {
                    setPostDinnerStep("availability");
                  }}>
                    Skip Review
                  </button>
                </div>
              );
            }

            if (currentStep === "review" && hasReviewed) {
              // Auto-advance if they already reviewed
              setTimeout(() => setPostDinnerStep("availability"), 0);
            }

            if (currentStep === "availability") {
              // Temporary groups — no next dinner, just wrap up
              if (isTemporaryGroup) {
                return (
                  <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.25)", background:"linear-gradient(135deg, rgba(201,149,106,0.06), rgba(26,15,10,0.95))", textAlign:"center", padding:"28px 20px" }}>
                    <div style={{ fontSize:"20px", color:"#c9956a", marginBottom:"12px" }}>✧</div>
                    <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>That's a Wrap</div>
                    <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"500", lineHeight:"1.5" }}>
                      One night. One table. No strings attached.
                    </div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>
                      This pop-up club will dissolve at midnight. Your badges and reviews live on forever.
                    </div>
                    <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={async () => {
                      setPostDinnerStep("completing");
                      resetForNextDinner();
                      setBookingLinks(null);
                      await dbData.completeDinner();
                      setPostDinnerStep(null);
                      setShowTempFarewell(true);
                    }}>
                      Close the Chapter
                    </button>
                  </div>
                );
              }

              return (
                <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.25)", background:"linear-gradient(135deg, rgba(201,149,106,0.06), rgba(26,15,10,0.95))", textAlign:"center", padding:"28px 20px" }}>
                  <div style={{ fontSize:"20px", color:"#c9956a", marginBottom:"12px" }}>◇</div>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>What's Next?</div>
                  <div style={{ fontSize:"16px", color:"#f5e6d3", marginBottom:"8px", fontWeight:"500", lineHeight:"1.5" }}>
                    Time to plan the next gathering.
                  </div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>
                    Submit your available dates so the next host can pick the perfect night.
                  </div>
                  <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={async () => {
                    setPostDinnerStep("completing");
                    resetForNextDinner();
                    setBookingLinks(null);
                    await dbData.completeDinner();
                    checkLowPoolNotification(poolRestaurants.length - 1);
                    setPostDinnerStep(null);
                    setScreen("availability");
                    setActiveTab("schedule");
                  }}>
                    Set My Availability
                  </button>
                  <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={async () => {
                    setPostDinnerStep("completing");
                    resetForNextDinner();
                    setBookingLinks(null);
                    await dbData.completeDinner();
                    checkLowPoolNotification(poolRestaurants.length - 1);
                    setPostDinnerStep(null);
                  }}>
                    Skip for Now
                  </button>
                </div>
              );
            }

            if (currentStep === "completing") {
              return (
                <div style={{ ...S.card, textAlign:"center", padding:"28px 20px" }}>
                  <div style={{ width:"20px", height:"20px", border:"2px solid rgba(201,149,106,0.3)", borderTop:"2px solid #c9956a", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 12px" }} />
                  <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>Wrapping things up...</div>
                </div>
              );
            }

            return null;
          })()}

          {/* Awaiting Next Host Reveal */}
          {ag.dinnerStatus === "awaiting_next_host" && !hasSeenHostReveal && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.3)", background:"linear-gradient(140deg, rgba(26,15,10,0.98), rgba(45,18,8,0.9))", textAlign:"center", padding:"32px 20px" }}>
              <div style={{ fontSize:"28px", color:"#c9956a", marginBottom:"16px", opacity:0.6 }}>✉</div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"14px" }}>A New Host Has Been Chosen</div>
              <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"12px", fontWeight:"400", lineHeight:"1.5" }}>
                The envelope is sealed.<br/>Are you the one?
              </div>
              <div style={{ width:"40px", height:"1px", background:"rgba(201,149,106,0.3)", margin:"16px auto" }} />
              <button style={{ ...S.primaryBtn, maxWidth:"240px", margin:"0 auto" }} onClick={() => setShowHostRevealAnimation(true)}>
                Open the Envelope
              </button>
            </div>
          )}
          {ag.dinnerStatus === "awaiting_next_host" && hasSeenHostReveal && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.15)", textAlign:"center", padding:"24px 20px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>Next Cycle</div>
              <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"8px" }}>
                {dbData.isHost ? "You are the next host. The group awaits your command." : "A new host has been chosen. Submit your availability for the next dinner."}
              </div>
              <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic" }}>
                The cycle begins anew.
              </div>
            </div>
          )}

          {ag.dinnerStatus === "pending_confirm" && (() => {
            const nonHostMembers = currentMembers.filter(m => m.name !== dbData.hostName);
            const confirmedCount = Object.values(confirmationVotes).filter(Boolean).length;
            const allConfirmed = confirmedCount === nonHostMembers.length;
            const isHost = dbData.isHost;
            
            return (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.3)", background:"rgba(201,149,106,0.04)" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Proposed Date</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>{ag.pendingDate}</div>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"14px", fontStyle:"italic" }}>
                {isHost ? "Waiting for group members to confirm. As host, you're automatically confirmed." : "Everyone must confirm before the reservation is locked."}
              </div>
              <div style={{ marginBottom:"14px" }}>
                {/* Show host as auto-confirmed — only reveal identity to the host themselves */}
                {isHost && currentMembers.filter(m => m.name === dbData.hostName).map(m => (
                  <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                      <span style={{ fontSize:"13px", color:"#f5e6d3" }}>{m.name}</span>
                      <span style={{ fontSize:"8px", color:"#1a0f0a", background:"rgba(201,149,106,0.5)", borderRadius:"3px", padding:"2px 4px", fontWeight:"700" }}>HOST</span>
                    </div>
                    <span style={{ fontSize:"12px", fontStyle:"italic", color:"#7a9e7e" }}>Auto-Confirmed</span>
                  </div>
                ))}
                {nonHostMembers.map(m => (
                  <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                      <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                      <span style={{ fontSize:"13px", color:"#f5e6d3" }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:"12px", fontStyle:"italic", color:confirmationVotes[m.name]?"#7a9e7e":"#5a3a25" }}>{confirmationVotes[m.name]?"Confirmed":"Pending"}</span>
                  </div>
                ))}
              </div>
              {!isHost && !confirmationVotes["You"] && (
                <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={async () => { 
                  const newVotes = {...confirmationVotes, You: true};
                  setConfirmationVotes(newVotes);
                  showToast("Confirmed. Reservation will be placed shortly.");
                  // Check if all non-host members have now voted
                  const allNowVoted = nonHostMembers.every(m => newVotes[m.name]);
                  if (allNowVoted) {
                    await sendHostNotification("all_votes_in");
                  }
                }}>
                  Confirm — I'll Be There
                </button>
              )}
              {/* All confirmed — show finalize prompt for host, waiting message for members */}
              {allConfirmed ? (
                isHost ? (
                  <div style={{ background:"rgba(122,158,126,0.08)", borderRadius:"12px", padding:"20px", textAlign:"center" }}>
                    <div style={{ fontSize:"16px", color:"#7a9e7e", marginBottom:"6px" }}>✓ Everyone's In</div>
                    <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px", lineHeight:"1.6" }}>
                      All members have confirmed. Lock this date in and get ready to book.
                    </div>
                    <button style={{ ...S.primaryBtn, marginBottom:0, background:"linear-gradient(135deg, #7a9e7e, #5a7a5e)" }} onClick={async () => {
                      const success = await dbData.confirmBooking();
                      if (success) {
                        await sendGroupNotification("dinner_confirmed");
                        showToast("Date finalized! The dinner is locked in.");
                      } else {
                        showToast("Failed to finalize. Try again.");
                      }
                    }}>
                      Finalize This Date
                    </button>
                  </div>
                ) : (
                  <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"12px", padding:"16px", textAlign:"center" }}>
                    <div style={{ fontSize:"14px", color:"#7a9e7e", marginBottom:"4px" }}>✓ All Confirmed</div>
                    <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.6" }}>
                      Waiting on the host to finalize the date and lock in the reservation.
                    </div>
                  </div>
                )
              ) : (
                <>
                  {isHost && <div style={{ fontSize:"12px", color:"#7a9e7e", textAlign:"center", fontStyle:"italic", padding:"4px 0" }}>Waiting on {nonHostMembers.filter(m => !confirmationVotes[m.name]).map(m => m.name).join(", ")}.</div>}
                  {!isHost && confirmationVotes["You"] && <div style={{ fontSize:"12px", color:"#7a9e7e", textAlign:"center", fontStyle:"italic", padding:"4px 0" }}>Waiting on {nonHostMembers.filter(m => !confirmationVotes[m.name]).map(m => m.name).join(", ")}.</div>}
                </>
              )}
            </div>
            );
          })()}

          {ag.dinnerStatus === "pending_restaurant" && (() => {
            const dinnerDate = dbData.activeReservation?.dinner_date;
            const formattedDate = dinnerDate ? new Date(dinnerDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD";
            return (
              <div style={{ ...S.card, border:"2px solid rgba(201,149,106,0.4)", background:"linear-gradient(135deg, rgba(201,149,106,0.08), rgba(26,15,10,0.95))" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
                  <span style={{ fontSize:"14px", color:"#c9956a" }}>◆</span>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase" }}>
                    Selecting Restaurant
                  </div>
                </div>
                <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>{formattedDate}</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.7" }}>
                  The date is locked. The app is selecting a restaurant at random from your pool. Hang tight…
                </div>
                {poolRestaurants.length === 0 ? (
                  <div>
                    <div style={{ fontSize:"13px", color:"#c45c5c", marginBottom:"12px" }}>Your pool is empty — add restaurants first so one can be selected.</div>
                    <button style={S.primaryBtn} onClick={() => { setActiveTab("explore"); setScreen("explore"); }}>
                      Explore & Add Restaurants
                    </button>
                  </div>
                ) : (
                  <button style={S.primaryBtn} onClick={async () => {
                    const success = await dbData.selectRandomRestaurant();
                    if (success) {
                      await sendGroupNotification("restaurant_selected");
                      await sendHostNotification("restaurant_auto_selected");
                      showToast("Restaurant selected! Check below to book.");
                    } else {
                      showToast("Failed to select restaurant. Try again.");
                    }
                  }}>
                    Draw a Restaurant
                  </button>
                )}
              </div>
            );
          })()}
          {ag.dinnerStatus === "no_date" && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.12)", textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"8px" }}>◫</div>
              <div style={{ fontSize:"14px", color:"#7a5a40", marginBottom:"6px", lineHeight:"1.6", fontStyle:"italic" }}>
                {dbData.isHost
                  ? "You're the host — sit tight while the crew submits their available dates, then you'll pick the perfect night."
                  : "Your group is out here living life without a dinner on the books. Bold strategy."}
              </div>
              <div style={{ fontSize:"12px", color:"#5a3a25", marginBottom:"18px", lineHeight:"1.5" }}>
                {dbData.isHost
                  ? "Once members submit dates, you'll see them on the Schedule tab."
                  : "Once everyone submits their available dates, the host will pick the perfect night."}
              </div>
              {!dbData.isHost && (
                <button style={{ ...S.primaryBtn, marginBottom:"8px" }} onClick={() => { setActiveTab("schedule"); setScreen("availability"); }}>Submit My Dates</button>
              )}
              {dbData.isHost && <button style={{ ...S.ghostBtn, marginBottom:0, fontSize:"11px" }} onClick={async () => { await sendGroupNotification("availability_reminder"); showToast("Nudge sent. They'll get the hint."); }}>Nudge the Group</button>}
            </div>
          )}

          {ag.dinnerStatus === "awaiting_host" && (() => {
            const isHost = dbData.isHost;
            const nonHostMembers = currentMembers.filter(m => m.name !== dbData.hostName);
            const submittedMembers = nonHostMembers.filter(m => m.name === "You" ? selectedDates.length > 0 : (memberAvailability[m.name]?.length || 0) > 0);
            
            // Calculate overlapping dates (from non-host members only)
            const allDates: string[] = [];
            nonHostMembers.forEach(m => {
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
                      {submittedMembers.length === nonHostMembers.length ? "Everyone's in. Time to decide." : `${submittedMembers.length} of ${nonHostMembers.length} members submitted — you can pick anytime.`}
                    </div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                      {WITTY_HOST_WAITING[wittyHostIdx]}
                    </div>
                    <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"10px", padding:"12px", marginBottom:"16px" }}>
                      <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"10px" }}>Submissions</div>
                      {currentMembers.map(m => {
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
                              {dbData.isHost && m.name === dbData.hostName && <span style={{ fontSize:"8px", color:"#1a0f0a", background:"rgba(201,149,106,0.5)", borderRadius:"3px", padding:"2px 4px", fontWeight:"700" }}>HOST</span>}
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
              {dbData.loadingMembers ? (
                [1,2,3,4].map(i => (
                  <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", flexShrink:0 }}>
                    <SkeletonPulse width="48px" height="48px" borderRadius="50%" />
                    <SkeletonPulse width="36px" height="10px" />
                  </div>
                ))
              ) : (
                currentMembers.map(m => (
                  <div key={m.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", flexShrink:0 }}>
                    <div onClick={() => { if (m.user_id === user.id) setShowProfile(true); else if (m.user_id) setViewingMemberUserId(m.user_id); }} style={{ width:"48px", height:"48px", borderRadius:"50%", background: m.avatar_url ? `url(${m.avatar_url}) center/cover no-repeat` : m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", color:"#fff", fontWeight:"700", border:"2px solid rgba(201,149,106,0.25)", cursor: m.user_id ? "pointer" : "default", overflow:"hidden" }}>{!m.avatar_url && m.avatar}</div>
                    <div style={{ fontSize:"11px", color:"#7a5a40" }}>{m.name}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding:"8px 16px 4px" }}>
            <button style={{ ...S.primaryBtn, fontSize:"12px", padding:"14px", marginBottom:"8px" }} onClick={() => setScreen("past_dinners")}>Past Dinners · {visitedRestaurants.length}</button>
            <button style={{ ...S.primaryBtn, fontSize:"12px", padding:"14px", marginBottom:"8px" }} onClick={() => setScreen("group_pool")}>View {activeGroup.name} Pool</button>
          </div>

          {/* Subtle leave group option */}
          <div style={{ padding:"16px 16px 8px", textAlign:"center" }}>
            <span 
              onClick={async () => {
                const isLastMember = currentMembers.length <= 1;
                const msg = isLastMember
                  ? `You're the last member of ${activeGroup.name}. Leaving will permanently delete all group badges, accomplishments, and history. This can't be undone. Leave anyway?`
                  : `Leave ${activeGroup.name}? You'll lose access to this group's pool, history, and badges.`;
                if (!confirm(msg)) return;
                const remaining = groups.filter(g => g.id !== activeGroup.id);
                const success = await dbData.leaveGroup();
                if (success) {
                  setGroups(remaining);
                  if (remaining.length > 0) setActiveGroup(remaining[0]);
                  showToast(`Left ${activeGroup.name}.`);
                  setTimeout(() => setScreen("club_home"), 400);
                } else {
                  showToast("Failed to leave. Try again.");
                }
              }}
              style={{ fontSize:"10px", color:"#3a2518", letterSpacing:"1px", cursor:"pointer", opacity:0.6 }}
            >
              Leave this club
            </span>
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

        {/* Dinner Cancellation Notice */}
        {showCancellationNotice && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(6,3,2,0.92)", zIndex:250, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ maxWidth:"320px", padding:"40px 28px", textAlign:"center" }}>
              <div style={{ fontSize:"32px", marginBottom:"20px", opacity:0.7 }}>🍷</div>
              <div style={{ fontSize:"11px", color:"#c45c5c", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Dinner Cancelled</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", fontWeight:"400", lineHeight:"1.4", marginBottom:"16px" }}>
                The host has pulled the plug.
              </div>
              <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.7", marginBottom:"28px" }}>
                The dinner has been cancelled. Don't take it personally — sometimes even the best-laid plans fall apart. A new date will be proposed soon.
              </div>
              <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 24px" }} />
              <div style={{ fontSize:"12px", color:"#5a3a25", lineHeight:"1.6", marginBottom:"28px" }}>
                You can update your availability for the next round once a new date is proposed.
              </div>
              <button style={{ ...S.primaryBtn, maxWidth:"220px", margin:"0 auto" }} onClick={() => setShowCancellationNotice(false)}>
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Temporary Group Farewell */}
        {showTempFarewell && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(6,3,2,0.95)", zIndex:250, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ maxWidth:"320px", padding:"40px 28px", textAlign:"center" }}>
              <div style={{ fontSize:"36px", marginBottom:"20px", opacity:0.8 }}>🕯️</div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Farewell, Friends</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", fontWeight:"400", lineHeight:"1.4", marginBottom:"16px" }}>
                Every good meal ends with the check.
              </div>
              <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.8", marginBottom:"12px" }}>
                This little club of ours was never meant to last forever — and maybe that's what made it special. One evening, one table, one unrepeatable combination of people and plates.
              </div>
              <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 16px" }} />
              <div style={{ fontSize:"12px", color:"#5a3a25", lineHeight:"1.7", marginBottom:"28px", fontStyle:"italic" }}>
                The group will dissolve at midnight, but the memories — and your badges — are yours to keep. Thank you for showing up and breaking bread with strangers who didn't stay strangers.
              </div>
              <button style={{ ...S.primaryBtn, maxWidth:"220px", margin:"0 auto" }} onClick={() => {
                setShowTempFarewell(false);
                // Remove the temp group from local state
                const remaining = groups.filter(g => g.id !== activeGroup.id);
                setGroups(remaining);
                if (remaining.length > 0) {
                  setActiveGroup(remaining[0]);
                  setScreen("club_home");
                } else {
                  setActiveGroup(EMPTY_GROUP);
                  setScreen("welcome");
                }
              }}>
                Until We Eat Again
              </button>
            </div>
          </div>
        )}
        {postDinnerReviewPrompt && (
          <ReviewForm
            restaurantName={dbData.selectedRestaurantData?.name || "Your Last Dinner"}
            cuisine={dbData.selectedRestaurantData?.cuisine}
            city={dbData.selectedRestaurantData?.city || activeGroup.city}
            members={currentMembers}
            reservationId={dbData.activeReservation?.id}
            onSubmit={async (review) => {
              const ok = await dbData.submitReview(review);
              if (ok) {
                setPostDinnerReviewPrompt(false);
                setPostDinnerStep("availability");
                showToast("Review submitted!");
              }
              return ok;
            }}
            onUploadPhoto={dbData.uploadReviewPhoto}
            onClose={() => {
              setPostDinnerReviewPrompt(false);
              setPostDinnerStep("availability");
            }}
            showToast={showToast}
          />
        )}

        <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
      </div></div>
    );
  }

  // ── GROUP SETTINGS ──
  if (screen === "group_settings") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Settings" />;
    
    
    
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
              const isMemberHost = dbData.isHost && m.name === dbData.hostName;
              const isYou = m.name === "You";
              return (
                <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                    <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
                    {isMemberHost && <span style={{ fontSize:"11px", color:"#f5e6d3", marginLeft:"2px" }} title="Current Host">♛</span>}
                  </div>
                  <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
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
            
            <button style={{ ...S.primaryBtn, marginBottom:"0", marginTop:"8px", background:"linear-gradient(135deg, #c45c5c, #9a4040)" }} onClick={async () => {
              if (dbData.dinnerStatus === "scheduled" || dbData.dinnerStatus === "post_dinner") {
                await dbData.completeDinner();
                checkLowPoolNotification(poolRestaurants.length - 1);
                showToast("Dinner completed. Post-dinner flow triggered.");
                setScreen("club_home");
                setActiveTab("home");
              } else {
                showToast("No scheduled dinner to complete.");
              }
            }}>
              Demo: Complete Dinner
            </button>
          </div>

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Danger Zone</div>
          <div style={{ ...S.card, border:"1px solid rgba(197,92,92,0.2)", background:"rgba(197,92,92,0.03)" }}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", marginBottom:"6px" }}>Leave This Club</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"14px", lineHeight:"1.6" }}>
              {currentMembers.length <= 1
                ? "⚠️ You're the last member. Leaving will permanently delete all group badges, accomplishments, and history."
                : "You'll lose access to this group's pool, history, and badges. This can't be undone."}
            </div>
            <button style={{ width:"100%", padding:"12px", borderRadius:"10px", fontSize:"12px", letterSpacing:"0.5px", background:"rgba(197,92,92,0.12)", border:"1px solid rgba(197,92,92,0.3)", color:"#c45c5c", cursor:"pointer", fontFamily:"Georgia,serif", fontWeight:"600" }}
              onClick={async () => {
                const isLastMember = currentMembers.length <= 1;
                if (isLastMember) {
                  if (!confirm("You're the last member. All group badges, history, and accomplishments will be permanently lost. Are you sure?")) return;
                }
                const remaining = groups.filter(g => g.id !== activeGroup.id);
                if (remaining.length === 0 && !isLastMember) { showToast("You can't leave your only club."); return; }
                const success = await dbData.leaveGroup();
                if (success) {
                  setGroups(remaining);
                  if (remaining.length > 0) setActiveGroup(remaining[0]);
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
    if (isSoloGroup) return <SoloPlaceholder feature="Host Selection" />;
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
                  await sendGroupNotification("date_proposed");
                  showToast("Date locked!");
                  setScreen("club_home");
                  setActiveTab("home");
                } else {
                  showToast("Failed to propose date. Try again.");
                }
              }}
            >
              Lock This Date
            </button>
            
            <button style={{ ...S.ghostBtn, marginTop:"8px" }} onClick={() => setScreen("club_home")}>
              Cancel
            </button>
          </div>
        </div>
      </div></div>
    );
  }

  // ── HOST SELECT RESTAURANT (removed — now auto-selected) ──


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
                    onClick={async () => { 
                      const success = await dbData.removeRestaurantFromPool(r.name);
                      if (success) {
                        const newPool = poolRestaurants.filter(rest => rest.id !== r.id);
                        setPoolRestaurants(pool => pool.filter(rest => rest.id !== r.id)); 
                        showToast(`${r.name} removed from pool.`);
                        // Check low pool
                        checkLowPoolNotification(newPool.length);
                      } else {
                        showToast("Failed to remove restaurant.");
                      }
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
        <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
      </div></div>
    );
  }

  // ── PAST DINNERS ──
  if (screen === "past_dinners") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Past Dinners" />;
    if (isSoloGroup) return <SoloPlaceholder feature="Past Dinners" />;
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
        <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
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
    // Only use real DB community reviews — no fake/static data
    const allCommunityReviews = dbData.communityReviews.map(r => ({
      id: r.id,
      user_id: r.user_id,
      group: r.group_name || "Supper Club Member",
      reviewer: r.member_name || "Anonymous",
      reviewerColor: r.member_avatar_color || "#c9956a",
      reviewerAvatarUrl: r.member_avatar_url || null,
      restaurant: r.restaurant_name,
      rating: r.rating,
      review: r.review_text || "",
      city: r.city || "Unknown",
      cuisine: r.cuisine || "",
      mealType: r.meal_type || "Dinner",
      returnChoice: r.return_choice,
      bestDish: r.best_dish_member,
      date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      photo_url: r.photo_url,
    }));
    const uniqueRestaurants = [...new Set(allCommunityReviews.map(r => r.restaurant))];

    // Restaurant Detail View
    if (selectedRestaurantDetail) {
      const r = selectedRestaurantDetail;
      const isGooglePlace = 'googlePlaceId' in r;
      const reviews = allCommunityReviews.filter(rev => rev.restaurant === r.name);
      const avgRating = reviews.length > 0 ? (reviews.reduce((s, rev) => s + rev.rating, 0) / reviews.length).toFixed(1) : null;
      const isAlreadyInPool = poolRestaurants.some(p => p.name.toLowerCase() === r.name.toLowerCase()) || visitedRestaurants.some(p => p.name.toLowerCase() === r.name.toLowerCase());
      
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
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    <SkeletonPulse width="100%" height="14px" />
                    <SkeletonPulse width="85%" height="14px" />
                    <SkeletonPulse width="60%" height="14px" />
                  </div>
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
                        <div onClick={(e) => { e.stopPropagation(); if (rev.user_id === user.id) setShowProfile(true); else setViewingMemberUserId(rev.user_id); }} style={{ 
                          width:"28px", height:"28px", borderRadius:"50%", 
                          background: rev.reviewerAvatarUrl ? `url(${rev.reviewerAvatarUrl}) center/cover no-repeat` : (rev.reviewerColor || "#c9956a"),
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:"11px", color:"#fff", fontWeight:"700", cursor:"pointer", overflow:"hidden"
                        }}>
                          {!rev.reviewerAvatarUrl && (rev.reviewer?.charAt(0)?.toUpperCase() || rev.group[0])}
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

              {/* Already in pool notice */}
              {isAlreadyInPool && (
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"16px", padding:"12px 14px", background:"rgba(122,158,126,0.08)", border:"1px solid rgba(122,158,126,0.2)", borderRadius:"12px" }}>
                  <span style={{ fontSize:"14px" }}>✓</span>
                  <div style={{ fontSize:"13px", color:"#7a9e7e", fontWeight:"500" }}>This restaurant is already in your pool</div>
                </div>
              )}

              {/* Action Buttons */}
              <button style={{ ...S.ghostBtn, marginTop:"16px", marginBottom:"8px" }} onClick={() => {
                setShowReviewForm({ restaurant: r.name, cuisine: 'cuisine' in r ? r.cuisine : undefined, city: r.city });
              }}>
                Write a Review
              </button>
              {!isAlreadyInPool && (
                <button style={{ ...S.primaryBtn, marginBottom:"24px" }} onClick={() => {
                  const restaurant: Restaurant = {
                    id: Date.now(), 
                    name: r.name, 
                    cuisine: 'cuisine' in r ? r.cuisine : "Restaurant", 
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
              )}
            </div>
          </div>
          <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>

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
                  <button style={{ ...S.primaryBtn, flex:1, marginBottom:0 }} onClick={async () => {
                    if (addToGroupSelected.length === 0) { showToast("Select at least one group."); return; }
                    await addToGroupPool(addToGroupPicker.restaurant, addToGroupSelected);
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
            {([["search","Search"],["community","Community"]] as const).map(([id,label]) => (
              <div key={id} style={{ ...tabPill(exploreView===id), flex:1 }} onClick={() => { setExploreView(id); setSelectedPublicR(null); }}>{label}</div>
            ))}
          </div>

          {exploreView === "search" && (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>Search for restaurants to add to your group pools.</div>
              
              <label style={S.label}>Location (City or Zip Code)</label>
              <div style={{ position:"relative" }}>
                <input style={S.input} placeholder="e.g. New York, NY or 10001" value={rCity !== null ? rCity : activeGroup.city}
                  onChange={e => handleCityInputChange(e.target.value)}
                  onFocus={() => { if (citySuggestions.length > 0) setShowCitySuggestions(true); }}
                />
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <>
                    <div onClick={() => setShowCitySuggestions(false)} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:98 }} />
                    <div style={{
                      position:"absolute", top:"100%", left:0, right:0, zIndex:99,
                      background:"#2d1208", border:"1px solid rgba(201,149,106,0.3)",
                      borderRadius:"0 0 12px 12px", boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
                      maxHeight:"220px", overflowY:"auto",
                    }}>
                      {citySuggestions.map((s, i) => (
                        <div key={i} onClick={() => {
                          setRCity(s.description);
                          setShowCitySuggestions(false);
                          setCitySuggestions([]);
                        }}
                          style={{
                            padding:"12px 14px", cursor:"pointer",
                            borderBottom: i < citySuggestions.length - 1 ? "1px solid rgba(201,149,106,0.08)" : "none",
                            transition:"background 0.15s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,149,106,0.1)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ fontSize:"13px", color:"#f5e6d3" }}>{s.description}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <label style={S.label}>Search Radius</label>
              <div style={{ display:"flex", gap:"8px", marginBottom:"16px", flexWrap:"wrap" }}>
                {[5, 10, 15, 25, 50].map(r => (
                  <div key={r} onClick={() => setSearchRadius(r)} style={chip(searchRadius === r)}>{r} mi</div>
                ))}
              </div>

              <label style={S.label}>Cuisine</label>
              <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", marginBottom:"16px" }}>
                {["All","American","Mexican","Italian","Mediterranean","Chinese","Seafood","Indian","Thai","Sushi","Japanese","BBQ","Korean"].map(c => {
                  const isAll = c === "All";
                  const isActive = isAll ? exploreCuisineFilter.length === 0 : exploreCuisineFilter.includes(c);
                  return (
                    <div key={c} style={chip(isActive)} onClick={() => {
                      if (isAll) {
                        setExploreCuisineFilter([]);
                      } else {
                        setExploreCuisineFilter(prev => isActive ? prev.filter(x => x !== c) : [...prev, c]);
                      }
                      setSearchPage(1);
                    }}>{c}</div>
                  );
                })}
              </div>

              <label style={S.label}>Search Restaurants (optional)</label>
              <input style={S.input} placeholder="e.g. Le Bernardin, steakhouse..." value={rName}
                onChange={e => setRName(e.target.value)}
              />

              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>Price Range</label>
                <div style={{ display:"flex", gap:"8px" }}>
                  {([["all","All"],["1","$"],["2","$$"],["3","$$$"],["4","$$$$"]] as const).map(([id,label]) => (
                    <div key={id} style={chip(explorePriceFilter===id)} onClick={() => { setExplorePriceFilter(id); setSearchPage(1); }}>{label}</div>
                  ))}
                </div>
              </div>

              <button style={{ ...S.primaryBtn, marginBottom:"16px" }} onClick={() => {
                const cuisineQuery = exploreCuisineFilter.length > 0 ? exploreCuisineFilter.join(" or ") : "";
                const searchTerm = [rName, cuisineQuery].filter(Boolean).join(" ") || "restaurant";
                const searchCity = rCity || activeGroup.city;
                setGpLastSearchTerm(searchTerm);
                setGpLastSearchCity(searchCity);
                setGpNextPageToken(null);
                searchGooglePlaces(searchTerm, searchCity, setGpResults, setGpLoading);
                setSearchPage(1);
              }}>
                Search
              </button>
              {gpLoading && (
                <div style={{ padding:"12px 0" }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ ...S.card, margin:"0 0 10px" }}>
                      <SkeletonPulse width="60%" height="16px" style={{ marginBottom:"8px" }} />
                      <SkeletonPulse width="40%" height="12px" style={{ marginBottom:"6px" }} />
                      <SkeletonPulse width="30%" height="10px" />
                    </div>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {gpResults.length > 0 && (
                (() => {
                  const allFiltered = gpResults
                    .filter(r => exploreCuisineFilter.length === 0 || exploreCuisineFilter.some(c => r.cuisine.toLowerCase().includes(c.toLowerCase())))
                    .filter(r => explorePriceFilter === "all" || String(r.price) === explorePriceFilter);
                  const capped = allFiltered.slice(0, MAX_ITEMS);
                  const totalPages = Math.ceil(capped.length / ITEMS_PER_PAGE);
                  const pageItems = capped.slice((searchPage - 1) * ITEMS_PER_PAGE, searchPage * ITEMS_PER_PAGE);
                  return (
                  <>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                    Results · {capped.length}{capped.length < allFiltered.length ? ` of ${allFiltered.length}` : ""}
                  </div>
                  {pageItems.map(r => {
                    const isInPool = poolRestaurants.some(p => p.name.toLowerCase() === r.name.toLowerCase()) || visitedRestaurants.some(p => p.name.toLowerCase() === r.name.toLowerCase());
                    return (
                    <div key={r.id} style={{ ...S.card, margin:"0 0 10px", cursor:"pointer", padding:0, overflow:"hidden" }}
                      onClick={() => openRestaurantDetail(r)}>
                      {/* Restaurant photo */}
                      {r.photoRefs && r.photoRefs.length > 0 && (
                        <RestaurantPhotoStrip photoRefs={r.photoRefs} fetchPhotoUrl={fetchPhotoUrl} />
                      )}
                      <div style={{ padding:"12px 14px" }}>
                        {isInPool && (
                          <div style={{ display:"inline-block", fontSize:"10px", color:"#7a9e7e", background:"rgba(122,158,126,0.12)", border:"1px solid rgba(122,158,126,0.25)", borderRadius:"6px", padding:"3px 8px", marginBottom:"8px", fontWeight:"600", letterSpacing:"0.5px" }}>
                            ✓ Already in your pool
                          </div>
                        )}
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
                    </div>
                    );
                  })}
                  {totalPages > 1 && (
                    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"16px", padding:"16px 0 8px" }}>
                      <button onClick={() => setSearchPage(p => Math.max(1, p - 1))} disabled={searchPage <= 1}
                        style={{ background:"none", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"10px", padding:"10px 16px", color: searchPage <= 1 ? "#3d2010" : "#c9956a", cursor: searchPage <= 1 ? "default" : "pointer", fontSize:"13px", fontFamily:"Georgia,serif", opacity: searchPage <= 1 ? 0.4 : 1 }}>
                        ← Prev
                      </button>
                      <span style={{ fontSize:"12px", color:"#7a5a40" }}>{searchPage} / {totalPages}</span>
                      <button onClick={() => setSearchPage(p => Math.min(totalPages, p + 1))} disabled={searchPage >= totalPages}
                        style={{ background:"none", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"10px", padding:"10px 16px", color: searchPage >= totalPages ? "#3d2010" : "#c9956a", cursor: searchPage >= totalPages ? "default" : "pointer", fontSize:"13px", fontFamily:"Georgia,serif", opacity: searchPage >= totalPages ? 0.4 : 1 }}>
                        Next →
                      </button>
                    </div>
                  )}
                  {gpNextPageToken && searchPage >= totalPages && (
                    <div style={{ display:"flex", justifyContent:"center", padding:"12px 0" }}>
                      <button
                        disabled={gpLoadingMore}
                        onClick={() => {
                          setGpLoadingMore(true);
                          searchGooglePlaces(gpLastSearchTerm, gpLastSearchCity, setGpResults, (b: boolean) => setGpLoadingMore(b), gpNextPageToken);
                        }}
                        style={{ ...S.primaryBtn, opacity: gpLoadingMore ? 0.6 : 1, fontSize:"13px", padding:"10px 24px" }}>
                        {gpLoadingMore ? "Loading..." : "Load More Results"}
                      </button>
                    </div>
                  )}
                  </>
                  );
                })()
              )}
            </div>
          )}


          {exploreView === "community" && (
            selectedPublicR ? (
              (() => {
                // selectedPublicR is used as review ID for detail view
                const rev = allCommunityReviews.find(r => r.id === selectedPublicR);
                if (!rev) return (
                  <div style={{ padding:"16px" }}>
                    <button onClick={() => setSelectedPublicR(null)} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"14px", cursor:"pointer", padding:0, marginBottom:"16px" }}>← Back</button>
                    <div style={{ color:"#7a5a40" }}>Review not found.</div>
                  </div>
                );
                return (
                  <div style={{ padding:"16px 16px 0" }}>
                    <button onClick={() => setSelectedPublicR(null)} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"14px", cursor:"pointer", padding:0, marginBottom:"20px" }}>← All Reviews</button>
                    
                    {/* Full Review Detail */}
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
                      <div onClick={(e) => { e.stopPropagation(); if (rev.user_id === user.id) setShowProfile(true); else setViewingMemberUserId(rev.user_id); }} style={{ width:"44px", height:"44px", borderRadius:"50%", background: rev.reviewerAvatarUrl ? `url(${rev.reviewerAvatarUrl}) center/cover no-repeat` : rev.reviewerColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", color:"#fff", fontWeight:"700", border:"2px solid rgba(201,149,106,0.3)", flexShrink:0, cursor:"pointer", overflow:"hidden" }}>
                        {!rev.reviewerAvatarUrl && rev.reviewer.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize:"16px", color:"#f5e6d3", fontWeight:"600" }}>{rev.reviewer}</div>
                        <div style={{ fontSize:"12px", color:"#7a5a40" }}>{rev.group}</div>
                      </div>
                    </div>

                    <div style={{ background:"rgba(201,149,106,0.06)", borderRadius:"14px", padding:"18px", marginBottom:"16px", border:"1px solid rgba(201,149,106,0.1)", cursor:"pointer" }}
                      onClick={(e) => { e.stopPropagation(); const rest: Restaurant = { id:Date.now(), name:rev.restaurant, cuisine:rev.cuisine||"—", city:rev.city, price:3, visited:false, visitedDate:null, visitedRating:null }; openRestaurantDetail(rest); }}>
                      <div style={{ fontSize:"20px", color:"#c9956a", fontWeight:"500", marginBottom:"4px", textDecoration:"underline", textDecorationColor:"rgba(201,149,106,0.3)", textUnderlineOffset:"3px" }}>{rev.restaurant}</div>
                      <div style={{ fontSize:"13px", color:"#7a5a40" }}>{rev.cuisine ? `${rev.cuisine} · ` : ""}{rev.city}</div>
                      <div style={{ fontSize:"11px", color:"#c9956a", marginTop:"6px" }}>View restaurant details →</div>
                    </div>

                    {/* Star Rating */}
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
                      <div style={{ display:"flex", gap:"3px" }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize:"20px", color: s <= rev.rating ? "#c9956a" : "#3d2010" }}>★</span>
                        ))}
                      </div>
                      <span style={{ fontSize:"16px", color:"#c9956a", fontWeight:"700" }}>{rev.rating.toFixed(1)}</span>
                    </div>

                    {/* Photo */}
                    {rev.photo_url && (
                      <div style={{ marginBottom:"16px", borderRadius:"12px", overflow:"hidden" }}>
                        <img src={rev.photo_url} alt="Review photo" style={{ width:"100%", height:"auto", objectFit:"cover", borderRadius:"12px", maxHeight:"280px" }} />
                      </div>
                    )}

                    {/* Review Text */}
                    {rev.review && (
                      <div style={{ fontSize:"15px", color:"#d4b896", lineHeight:"1.7", marginBottom:"16px" }}>
                        "{rev.review}"
                      </div>
                    )}

                    {/* Meta details */}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"16px" }}>
                      {rev.mealType && (
                        <div style={{ fontSize:"11px", color:"#c9956a", background:"rgba(201,149,106,0.08)", border:"1px solid rgba(201,149,106,0.15)", borderRadius:"8px", padding:"4px 10px" }}>{rev.mealType}</div>
                      )}
                      {rev.returnChoice && (
                        <div style={{ fontSize:"11px", color:"#7a9e7e", background:"rgba(122,158,126,0.08)", border:"1px solid rgba(122,158,126,0.15)", borderRadius:"8px", padding:"4px 10px" }}>
                          {rev.returnChoice === "yes" ? "Would return" : rev.returnChoice === "no" ? "Would not return" : rev.returnChoice}
                        </div>
                      )}
                      {rev.bestDish && (
                        <div style={{ fontSize:"11px", color:"#9b7ec8", background:"rgba(155,126,200,0.08)", border:"1px solid rgba(155,126,200,0.15)", borderRadius:"8px", padding:"4px 10px" }}>
                          Best dish: {rev.bestDish}
                        </div>
                      )}
                    </div>

                    <div style={{ fontSize:"12px", color:"#5a3a25", marginBottom:"16px" }}>{rev.date}</div>

                    <button style={{ ...S.primaryBtn, marginTop:"4px" }} onClick={() => {
                      const restaurant: Restaurant = { id:Date.now(), name:rev.restaurant, cuisine: rev.cuisine || "—", suggested_by:"Community", city: rev.city, price:3, visited:false, visitedDate:null, visitedRating:null };
                      setAddToGroupPicker({ restaurant, visible: true });
                      setAddToGroupSelected([activeGroup.id]);
                    }}>Add {rev.restaurant} to Pool</button>
                  </div>
                );
              })()
            ) : (
              <div style={{ padding:"16px 16px 0" }}>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                  Discover restaurants through other Supper Club members' reviews — search any city worldwide.
                </div>

                {/* Search Input */}
                <label style={S.label}>Search by City, Restaurant, or Cuisine</label>
                <input
                  style={S.input}
                  placeholder="e.g. Tokyo, Sushi, Le Bernardin..."
                  value={communitySearchQuery}
                  onChange={e => { setCommunitySearchQuery(e.target.value); setCommunityPage(1); }}
                />

                {/* Sort */}
                <div style={{ display:"flex", gap:"8px", marginBottom:"16px" }}>
                  {([["date","Most Recent"],["rating","Highest Rated"]] as const).map(([id,label]) => (
                    <div key={id} style={chip(visitedSort===id)} onClick={() => setVisitedSort(id)}>{label}</div>
                  ))}
                </div>

                {(() => {
                  const query = communitySearchQuery.toLowerCase().trim();
                  let filtered = [...allCommunityReviews];
                  if (query) {
                    filtered = filtered.filter(r =>
                      r.city.toLowerCase().includes(query) ||
                      r.restaurant.toLowerCase().includes(query) ||
                      (r.cuisine || "").toLowerCase().includes(query) ||
                      r.reviewer.toLowerCase().includes(query) ||
                      r.group.toLowerCase().includes(query)
                    );
                  }
                  if (visitedSort === "rating") {
                    filtered.sort((a, b) => b.rating - a.rating);
                  }

                  if (filtered.length === 0) {
                    return (
                      <div style={{ textAlign:"center", padding:"40px 20px" }}>
                        <div style={{ fontSize:"24px", color:"#4a2e18", marginBottom:"12px" }}>◈</div>
                        <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic", marginBottom:"4px" }}>
                          {query ? `No reviews found for "${exploreCuisineFilter}"` : "No community reviews yet."}
                        </div>
                        <div style={{ fontSize:"12px", color:"#5a3a25" }}>
                          {query ? "Try a different city, restaurant name, or cuisine." : "Be the first to review a restaurant and it'll appear here for all Supper Club members."}
                        </div>
                      </div>
                    );
                  }

                  const capped = filtered.slice(0, MAX_ITEMS);
                  const totalPages = Math.ceil(capped.length / ITEMS_PER_PAGE);
                  const pageItems = capped.slice((communityPage - 1) * ITEMS_PER_PAGE, communityPage * ITEMS_PER_PAGE);

                  return (
                    <>
                      <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>
                        {capped.length} review{capped.length !== 1 ? "s" : ""}{query ? ` matching "${exploreCuisineFilter}"` : ""}{capped.length < filtered.length ? ` (showing ${capped.length} of ${filtered.length})` : ""}
                      </div>
                      {pageItems.map(rev => (
                      <div key={rev.id} onClick={() => setSelectedPublicR(rev.id)} style={{ ...S.card, margin:"0 0 12px", cursor:"pointer", padding:0, overflow:"hidden" }}>
                        {rev.photo_url && (
                          <div style={{ width:"100%", height:"140px", overflow:"hidden" }}>
                            <img src={rev.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy" />
                          </div>
                        )}
                        <div style={{ padding:"14px 16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                            <div onClick={(e) => { e.stopPropagation(); if (rev.user_id === user.id) setShowProfile(true); else setViewingMemberUserId(rev.user_id); }} style={{ width:"32px", height:"32px", borderRadius:"50%", background: rev.reviewerAvatarUrl ? `url(${rev.reviewerAvatarUrl}) center/cover no-repeat` : rev.reviewerColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#fff", fontWeight:"700", flexShrink:0, border:"1.5px solid rgba(201,149,106,0.25)", cursor:"pointer", overflow:"hidden" }}>
                              {!rev.reviewerAvatarUrl && rev.reviewer.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:"13px", color:"#f5e6d3", fontWeight:"600" }}>{rev.reviewer}</div>
                              <div style={{ fontSize:"11px", color:"#5a3a25" }}>{rev.group}</div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:"3px", flexShrink:0 }}>
                              {[1,2,3,4,5].map(s => (
                                <span key={s} style={{ fontSize:"12px", color: s <= rev.rating ? "#c9956a" : "#3d2010" }}>★</span>
                              ))}
                            </div>
                          </div>
                          <div style={{ fontSize:"15px", color:"#c9956a", fontWeight:"500", marginBottom:"2px", cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(201,149,106,0.3)", textUnderlineOffset:"2px" }}
                            onClick={(e) => { e.stopPropagation(); const rest: Restaurant = { id:Date.now(), name:rev.restaurant, cuisine:rev.cuisine||"—", city:rev.city, price:3, visited:false, visitedDate:null, visitedRating:null }; openRestaurantDetail(rest); }}>{rev.restaurant}</div>
                          <div style={{ fontSize:"11px", color:"#7a5a40", marginBottom:"8px" }}>{rev.cuisine ? `${rev.cuisine} · ` : ""}{rev.city}</div>
                          {rev.review && (
                            <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.5", fontStyle:"italic" }}>
                              "{rev.review.length > 120 ? rev.review.slice(0,120) + "..." : rev.review}"
                            </div>
                          )}
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"10px" }}>
                            <div style={{ fontSize:"11px", color:"#4a2e18" }}>{rev.date}</div>
                            <div style={{ fontSize:"11px", color:"#c9956a" }}>Read more →</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {totalPages > 1 && (
                      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"16px", padding:"16px 0 8px" }}>
                        <button onClick={() => setCommunityPage(p => Math.max(1, p - 1))} disabled={communityPage <= 1}
                          style={{ background:"none", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"10px", padding:"10px 16px", color: communityPage <= 1 ? "#3d2010" : "#c9956a", cursor: communityPage <= 1 ? "default" : "pointer", fontSize:"13px", fontFamily:"Georgia,serif", opacity: communityPage <= 1 ? 0.4 : 1 }}>
                          ← Prev
                        </button>
                        <span style={{ fontSize:"12px", color:"#7a5a40" }}>{communityPage} / {totalPages}</span>
                        <button onClick={() => setCommunityPage(p => Math.min(totalPages, p + 1))} disabled={communityPage >= totalPages}
                          style={{ background:"none", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"10px", padding:"10px 16px", color: communityPage >= totalPages ? "#3d2010" : "#c9956a", cursor: communityPage >= totalPages ? "default" : "pointer", fontSize:"13px", fontFamily:"Georgia,serif", opacity: communityPage >= totalPages ? 0.4 : 1 }}>
                          Next →
                        </button>
                      </div>
                    )}
                    </>
                  );
                })()}
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
                  <button style={{ ...S.primaryBtn, flex:1, marginBottom:0 }} onClick={async () => {
                    if (addToGroupSelected.length === 0) { showToast("Select at least one group."); return; }
                    await addToGroupPool(addToGroupPicker.restaurant, addToGroupSelected);
                    setAddToGroupPicker(prev => ({ ...prev, visible: false }));
                    setAddToGroupSelected([]);
                  }}>Add to {addToGroupSelected.length} Group{addToGroupSelected.length !== 1 ? "s" : ""}</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
      </div></div>
    );
  }

  // ── AVAILABILITY ──
  if (screen === "availability") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Availability" />;
    if (isSoloGroup) return <SoloPlaceholder feature="Scheduling" />;
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

          {/* ── Date Already Proposed Banner ── */}
          {dbData.dinnerStatus === "pending_confirm" && dbData.pendingDate && (
            <div style={{
              background:"linear-gradient(135deg, rgba(201,149,106,0.1), rgba(201,149,106,0.03))",
              border:"1px solid rgba(201,149,106,0.3)",
              borderRadius:"14px",
              padding:"16px 18px",
              marginBottom:"16px",
              textAlign:"center",
            }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"6px" }}>Date Already Proposed</div>
              <div style={{ fontSize:"18px", color:"#f5e6d3", marginBottom:"6px", fontWeight:"500" }}>{dbData.pendingDate}</div>
              <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", lineHeight:"1.6" }}>
                The host has picked a date. Head to the home screen to confirm your attendance — or submit your availability below for future dinners.
              </div>
              {!confirmationVotes["You"] && !dbData.isHost && (
                <button style={{ ...S.primaryBtn, marginTop:"14px", marginBottom:0, fontSize:"12px" }} onClick={async () => {
                  const newVotes = {...confirmationVotes, You: true};
                  setConfirmationVotes(newVotes);
                  showToast("Confirmed. You're in!");
                  const nonHostMembers = currentMembers.filter(m => m.name !== dbData.hostName);
                  const allNowVoted = nonHostMembers.every(m => newVotes[m.name]);
                  if (allNowVoted) {
                    await sendHostNotification("all_votes_in");
                  }
                }}>
                  Confirm — I'll Be There
                </button>
              )}
              {(confirmationVotes["You"] || dbData.isHost) && (
                <div style={{ marginTop:"10px", fontSize:"12px", color:"#7a9e7e", fontStyle:"italic" }}>✓ You're confirmed for this date</div>
              )}
            </div>
          )}

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
              <CalendarGrid selectedArr={selectedDates} setArr={setSelectedDates} weeks={3} cutoffDays={cutoffDays} showToast={showToast} otherGroupDates={otherGroupDates}/>
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
                          dbData.proposeDate(selectedDates[0]).then(async ok => {
                            if (ok) { await sendGroupNotification("date_proposed"); showToast("Date locked. Members not submitted marked as absent."); }
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
                        // Check if all members have now submitted availability
                        const nonHostMembers = currentMembers.filter(m => m.name !== dbData.hostName);
                        const submittedCount = nonHostMembers.filter(m => 
                          m.name === "You" ? true : (memberAvailability[m.name]?.length || 0) > 0
                        ).length;
                        if (submittedCount >= nonHostMembers.length) {
                          await sendHostNotification("all_availability_in");
                        }
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
      <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
    </div></div>
    );
  }

  // ── REVEAL TAB ──
  if (screen === "reveal") {
    if (!hasGroup) return <NoGroupPlaceholder feature="Reveal" />;
    if (isSoloGroup) return <SoloPlaceholder feature="Reveal" />;
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
          {hasScheduled ? (() => {
            const selectedRest = dbData.selectedRestaurantData;
            const isRevealed = dbData.activeReservation?.status === "revealed";
            const restaurantKnown = !!selectedRest;

            return (
            <>
              {/* Non-host: restaurant revealed, not yet seen animation */}
              {!hostIsYou && isRevealed && restaurantKnown && !hasSeenReveal && (
                <div style={{ ...S.revealBox, margin:"20px 16px" }}>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Next Dinner</div>
                  <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"8px" }}>{ag.nextDinner}</div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>7:30 PM</div>
                  <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 20px" }}/>
                  <div style={{
                    width:"80px", height:"80px", borderRadius:"50%", margin:"0 auto 20px",
                    background:"radial-gradient(circle, rgba(201,149,106,0.15) 0%, transparent 70%)",
                    border:"2px solid rgba(201,149,106,0.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:"28px", color:"#c9956a",
                    animation:"sealPulseInline 2s ease-in-out infinite",
                  }}>◈</div>
                  <div style={{ fontSize:"15px", color:"#f5e6d3", marginBottom:"8px" }}>The secret is ready.</div>
                  <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", marginBottom:"24px" }}>The host has chosen your destination.</div>
                  <button style={{ ...S.primaryBtn, background:"linear-gradient(135deg, #c9956a, #9a6040)", maxWidth:"240px", margin:"0 auto" }} onClick={() => setShowRevealAnimation(true)}>
                    Unveil the Destination
                  </button>
                  <style>{`@keyframes sealPulseInline { 0%,100%{box-shadow:0 0 20px rgba(201,149,106,0.1);transform:scale(1)} 50%{box-shadow:0 0 40px rgba(201,149,106,0.25);transform:scale(1.05)} }`}</style>
                  <div style={{ marginTop:"20px", textAlign:"center" }}>
                    <span onClick={() => {
                      if (!confirm("Bail on this dinner? The host and group will be notified.")) return;
                      showToast("You've bailed. The group has been notified. Your chair will sit empty.");
                    }} style={{ fontSize:"10px", color:"#4a2e18", cursor:"pointer", letterSpacing:"1px" }}>
                      I can't make it anymore
                    </span>
                  </div>
                </div>
              )}

              {/* Non-host: not yet revealed */}
              {!hostIsYou && !isRevealed && (
                <div style={{ ...S.revealBox, margin:"20px 16px" }}>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Next Dinner</div>
                  <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"8px" }}>{ag.nextDinner}</div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>7:30 PM</div>
                  <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 20px" }}/>
                  <div style={{ fontSize:"40px", color:"#c9956a", marginBottom:"16px" }}>?</div>
                  <div style={{ fontSize:"15px", color:"#f5e6d3", marginBottom:"8px" }}>Destination Unknown</div>
                  <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic" }}>Only the host knows where you're going.</div>
                  <div style={{ marginTop:"20px", padding:"12px 16px", background:"rgba(201,149,106,0.07)", borderRadius:"12px", fontSize:"12px", color:"#c9956a" }}>
                    Restaurant revealed at 8 AM on dinner day
                  </div>
                  {/* Bail option for non-host */}
                  <div style={{ marginTop:"20px", textAlign:"center" }}>
                    <span onClick={() => {
                      if (!confirm("Bail on this dinner? The host and group will be notified.")) return;
                      showToast("You've bailed. The group has been notified. Shame.");
                    }} style={{ fontSize:"10px", color:"#4a2e18", cursor:"pointer", letterSpacing:"1px" }}>
                      I can't make it anymore
                    </span>
                  </div>
                </div>
              )}

              {/* Non-host: already seen reveal */}
              {!hostIsYou && hasSeenReveal && restaurantKnown && (
                <div style={{ ...S.revealBox, margin:"20px 16px" }}>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Your Destination</div>
                  <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"8px" }}>{selectedRest!.name}</div>
                  <div style={{ fontSize:"14px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px" }}>{selectedRest!.cuisine} · {selectedRest!.city}</div>
                  <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 16px" }}/>
                  <div style={{ fontSize:"13px", color:"#7a5a40" }}>{ag.nextDinner} · 7:30 PM</div>
                  {/* Bail option */}
                  <div style={{ marginTop:"24px", textAlign:"center" }}>
                    <span onClick={() => {
                      if (!confirm("Bail on this dinner? The host and group will be notified.")) return;
                      showToast("You've bailed. The group has been notified. We'll miss you... maybe.");
                    }} style={{ fontSize:"10px", color:"#4a2e18", cursor:"pointer", letterSpacing:"1px" }}>
                      I can't make it anymore
                    </span>
                  </div>
                </div>
              )}

              {/* Host view */}
              {hostIsYou && (
                <div style={{ ...S.revealBox, margin:"20px 16px" }}>
                  <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"16px" }}>Next Dinner</div>
                  <div style={{ fontSize:"28px", color:"#f5e6d3", marginBottom:"8px" }}>{ag.nextDinner}</div>
                  <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>7:30 PM</div>
                  <div style={{ width:"60px", height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 auto 20px" }}/>
                  <div style={{ fontSize:"14px", color:"#c9956a", marginBottom:"8px", fontStyle:"italic" }}>You know the secret destination.</div>
                  <div style={{ fontSize:"12px", color:"#5a3a25", marginBottom:"24px" }}>The group will find out at 8 AM on dinner day.</div>
                  {/* Host actions */}
                  <div style={{ display:"flex", gap:"16px", justifyContent:"center" }}>
                    <span onClick={() => setScreen("host_select_restaurant")} style={{ fontSize:"10px", color:"#c9956a", cursor:"pointer", letterSpacing:"1px", opacity:0.7 }}>
                      Change restaurant
                    </span>
                    <span style={{ color:"rgba(201,149,106,0.2)" }}>·</span>
                    <span onClick={async () => {
                      if (!confirm("Cancel this dinner? The entire group will be notified.")) return;
                      const success = await dbData.cancelDinner();
                      if (success) {
                        showToast("Dinner cancelled. The group has been notified.");
                        setBookingLinks(null);
                      } else {
                        showToast("Failed to cancel. Try again.");
                      }
                    }} style={{ fontSize:"10px", color:"#c45c5c", cursor:"pointer", letterSpacing:"1px", opacity:0.7 }}>
                      Cancel reservation
                    </span>
                  </div>
                </div>
              )}

              {/* Group members */}
              <div style={{ ...S.card }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>The Table</div>
                {currentMembers.map(m => (
                  <div key={m.name} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"10px" }}>
                    <div style={{ width:"32px", height:"32px", borderRadius:"50%", background: m.avatar_url ? `url(${m.avatar_url}) center/cover no-repeat` : m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#1a0f0a", fontWeight:"700", overflow:"hidden" }}>{!m.avatar_url && m.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</div>
                      <div style={{ fontSize:"11px", color:"#5a3a25" }}>Confirmed</div>
                    </div>
                    <span style={{ fontSize:"11px", color:"#7a9e7e" }}>Ready</span>
                  </div>
                ))}
              </div>
            </>
            );
          })() : hasConfirmed ? (
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
        <NavBar activeTab={activeTab} onNavigate={onNavigate} hidebadges={isTemporaryGroup}/>
      </div></div>
    );
  }

  // ── NEW HOST SELECTED (Secret Reveal) — now uses cinematic HostReveal ──
  if (screen === "new_host_reveal") {
    return (
      <HostReveal
        isYouTheHost={true}
        groupName={activeGroup.name}
        onComplete={() => {
          setScreen("club_home");
          setActiveTab("home");
          showToast("You're officially the host. Keep the secret safe.");
        }}
      />
    );
  }

  // ── BADGES (hidden for temporary groups) ──
  if (screen === "badges") {
    if (isTemporaryGroup) {
      // Redirect — temp groups don't have a badges section
      setScreen("club_home");
      setActiveTab("home");
      return null;
    }
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

  // ── CINEMATIC RESTAURANT REVEAL ──
  if (showRevealAnimation && dbData.selectedRestaurantData) {
    const rest = dbData.selectedRestaurantData;
    return (
      <RestaurantReveal
        restaurantName={rest.name}
        cuisine={rest.cuisine}
        city={rest.city}
        dinnerDate={dbData.nextDinner || ""}
        onComplete={() => {
          setShowRevealAnimation(false);
          setHasSeenReveal(true);
        }}
      />
    );
  }

  // ── CINEMATIC HOST REVEAL ──
  if (showHostRevealAnimation) {
    const isNextHost = dbData.activeReservation?.next_host_id
      ? dbData.members.find(m => m.id === dbData.activeReservation?.next_host_id)?.user_id === user.id
      : dbData.isHost;
    return (
      <HostReveal
        isYouTheHost={isNextHost || false}
        groupName={activeGroup.name}
        onComplete={() => {
          setShowHostRevealAnimation(false);
          setHasSeenHostReveal(true);
        }}
      />
    );
  }

  return null;
}

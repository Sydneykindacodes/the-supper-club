import { useState, useCallback } from "react";
import {
  INDIVIDUAL_BADGES, GROUP_BADGES, MEMBERS, INITIAL_GROUPS,
  RESTAURANT_POOL, PREVIOUSLY_VISITED, PUBLIC_REVIEWS,
  WITTY_NO_DATE, MEAL_TYPES, PRICE_LABELS,
  Group, Restaurant,
} from "@/data/supper-club-data";
import { supabase } from "@/integrations/supabase/client";

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
  NavBar, CalendarGrid, MealTypeSelector, ShareRow,
} from "./shared";

export default function SupperClub() {
  const [screen, setScreen] = useState("welcome");
  const [groups, setGroups] = useState(INITIAL_GROUPS);
  const [activeGroup, setActiveGroup] = useState(INITIAL_GROUPS[0]);
  const [activeTab, setActiveTab] = useState("home");
  const [joinMode, setJoinMode] = useState<"create" | "join" | null>(null);
  const [badgeTab, setBadgeTab] = useState("individual");
  const [toast, setToast] = useState<string | null>(null);
  const [wittyIdx] = useState(Math.floor(Math.random() * WITTY_NO_DATE.length));

  const [poolRestaurants, setPoolRestaurants] = useState<Restaurant[]>(RESTAURANT_POOL);
  const [visitedRestaurants] = useState<Restaurant[]>(PREVIOUSLY_VISITED);
  const [poolView, setPoolView] = useState("pool");
  const [visitedSort, setVisitedSort] = useState("date");
  const [visitedFilter, setVisitedFilter] = useState("all");
  const [selectedPublicR, setSelectedPublicR] = useState<string | null>(null);
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

  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [photoSubmitted, setPhotoSubmitted] = useState(false);
  const [returnChoice, setReturnChoice] = useState<string | null>(null);
  const [bestDishMember, setBestDishMember] = useState<string | null>(null);

  const [revealUnlocked, setRevealUnlocked] = useState(false);

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
  const allConfirmed = confirmedCount === MEMBERS.length;

  const sortedVisited = [...visitedRestaurants].sort((a, b) => {
    if (visitedSort === "rating") return (b.visitedRating || 0) - (a.visitedRating || 0);
    if (visitedSort === "price") return b.price - a.price;
    return new Date(b.visitedDate || 0).getTime() - new Date(a.visitedDate || 0).getTime();
  });

  // ── WELCOME ──
  if (screen === "welcome") return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.welcomeBg}>
        <div style={S.orb}/>
        <div style={S.eyebrow}>Est. 2026</div>
        <div style={S.mainTitle}>The Supper Club</div>
        <div style={S.subtitle}>Dine together. Discover together.</div>
        <div style={S.ornament}>— · —</div>
        <button style={S.primaryBtn} onClick={() => { setJoinMode("create"); setScreen("join_create"); }}>Create a Club</button>
        <button style={S.secondaryBtn} onClick={() => { setJoinMode("join"); setScreen("join_create"); }}>Join with Invite Code</button>
        <div style={{ marginTop:"36px", fontSize:"11px", color:"#3d2010", letterSpacing:"1px", textAlign:"center" }}>A private dining experience for you &amp; your people</div>
      </div>
    </div></div>
  );

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
            <input style={S.input} defaultValue="The Golden Table"/>
            <label style={S.label}>Your Name</label>
            <input style={S.input} defaultValue="Marisol"/>
            <label style={S.label}>City</label>
            <input style={S.input} defaultValue="New York, NY"/>
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
            <button style={S.primaryBtn} onClick={() => { setScreen("club_home"); setActiveTab("home"); }}>Create &amp; Get Invite Code</button>
          </>) : (<>
            <div style={{ ...S.mainTitle, fontSize:"34px", textAlign:"left", marginBottom:"6px" }}>Join a Club</div>
            <div style={{ ...S.subtitle, textAlign:"left", marginBottom:"28px" }}>Enter your invite code</div>
            <label style={S.label}>Invite Code</label>
            <input style={S.input} placeholder="e.g. SUPR-4829"/>
            <label style={S.label}>Your Name</label>
            <input style={S.input} placeholder="Your name"/>
            <div style={{ height:"12px" }}/>
            <button style={S.primaryBtn} onClick={() => { setScreen("club_home"); setActiveTab("home"); }}>Join Club</button>
          </>)}
        </div>
      </div>
    </div></div>
  );

  // ── CLUB HOME ──
  if (screen === "club_home") {
    const ag = activeGroup;
    const noDate = ag.dinnerStatus === "no_date";
    const pending = ag.dinnerStatus === "pending_confirm";
    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <div style={{ padding:"52px 24px 16px", background:"linear-gradient(180deg,#2d1208 0%,transparent 100%)" }}>
            <div style={{ fontSize:"28px", color:"#f5e6d3", fontWeight:"400" }}>Good evening.</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", marginTop:"4px", fontStyle:"italic" }}>
              {noDate ? WITTY_NO_DATE[wittyIdx] : pending ? "Your group has a proposed date. Waiting on confirmations." : "Your next supper is coming. Try not to look up the restaurant."}
            </div>
          </div>

          <div style={{ ...S.card, background:"linear-gradient(135deg,rgba(201,149,106,0.1),rgba(201,149,106,0.03))", border:"1px solid rgba(201,149,106,0.25)", cursor:"pointer" }}
            onClick={() => { navigator.clipboard.writeText(ag.code); showToast("Invite code copied!"); }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>Invite Code — {ag.name}</div>
            <div style={{ fontSize:"28px", color:"#f5e6d3", letterSpacing:"8px", fontWeight:"700", marginBottom:"6px" }}>{ag.code}</div>
            <div style={{ fontSize:"12px", color:"#7a5a40" }}>Tap to copy · Share to invite members</div>
          </div>

          {ag.dinnerStatus === "scheduled" && (
            <div style={{ ...S.card, border:"1px solid rgba(201,149,106,0.18)" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Next Dinner</div>
              <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>Destination Unknown</div>
              <div style={{ fontSize:"13px", color:"#7a5a40" }}>{ag.nextDinner} · 7:30 PM</div>
              <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"3px", fontStyle:"italic" }}>Reservation secured. You're welcome.</div>
              <div style={{ marginTop:"14px", padding:"10px 14px", background:"rgba(201,149,106,0.07)", borderRadius:"10px", fontSize:"12px", color:"#c9956a", textAlign:"center" }}>Restaurant revealed the morning of your dinner</div>
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
            <div style={{ ...S.card, border:"1px dashed rgba(201,149,106,0.2)", textAlign:"center", padding:"28px 20px" }}>
              <div style={{ fontSize:"14px", color:"#7a5a40", marginBottom:"16px", lineHeight:"1.6" }}>No dinner scheduled. Submit your availability and the app will handle the rest.</div>
              <button style={{ ...S.primaryBtn, marginBottom:0 }} onClick={() => { setActiveTab("schedule"); setScreen("availability"); }}>Submit Availability</button>
            </div>
          )}

          <div style={{ padding:"8px 16px 4px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"14px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase" }}>Members · {MEMBERS.length}</div>
              <div onClick={() => setScreen("group_settings")} style={{ fontSize:"11px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>Settings ›</div>
            </div>
            <div style={{ display:"flex", gap:"14px" }}>
              {MEMBERS.map(m => (
                <div key={m.name} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" }}>
                  <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", color:"#fff", fontWeight:"700", border:"2px solid rgba(201,149,106,0.25)" }}>{m.avatar}</div>
                  <div style={{ fontSize:"11px", color:"#7a5a40" }}>{m.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:"22px 16px 0" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Past Dinners</div>
            {visitedRestaurants.slice(0,2).map((d) => (
              <div key={d.id} style={{ ...S.card, margin:"0 0 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={S.cardTitle}>{d.name}</div>
                  <div style={S.cardSub}>{d.visitedDate} · {d.cuisine}</div>
                </div>
                <RatingBadge restaurant={d} large/>
              </div>
            ))}
          </div>

          <div style={{ padding:"8px 16px 4px" }}>
            <button style={{ ...S.primaryBtn, fontSize:"12px", padding:"14px", marginBottom:"8px" }} onClick={() => setScreen("post_dinner")}>Submit Last Dinner Review</button>
            <button style={{ ...S.ghostBtn, fontSize:"12px", padding:"12px" }} onClick={() => setScreen("free_review")}>Log a Personal Restaurant Review</button>
          </div>
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── GROUP SETTINGS ──
  if (screen === "group_settings") return (
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

          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", margin:"20px 0 14px" }}>Members</div>
          <div style={S.card}>
            {MEMBERS.map(m => (
              <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                  <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
                </div>
                {m.name !== "You" ? <span style={{ fontSize:"11px", color:"#4a2e18", letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer" }}>Remove</span> : <span style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic" }}>Admin</span>}
              </div>
            ))}
            <div style={{ paddingTop:"14px" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px" }}>Invite Code</div>
              <div style={{ fontSize:"20px", color:"#f5e6d3", letterSpacing:"6px", fontWeight:"700" }}>{activeGroup.code}</div>
            </div>
          </div>

          <div style={{ height:"16px" }}/>
          <button style={S.primaryBtn} onClick={() => { showToast("Settings saved."); setTimeout(() => setScreen("club_home"), 800); }}>Save Settings</button>
        </div>
      </div>
    </div></div>
  );

  // ── RESTAURANT POOL ──
  if (screen === "restaurant_pool") {
    const uniqueRestaurants = [...new Set(PUBLIC_REVIEWS.map(r => r.restaurant))];

    return (
      <div style={S.app}><div style={S.phone}>
        {toast && <div style={S.toast}>{toast}</div>}
        <div style={S.screen}>
          <div style={S.header}>
            <div style={S.headerEye}>{activeGroup.name}</div>
            <div style={S.headerTitle}>Restaurants</div>
          </div>

          <div style={{ display:"flex", gap:"4px", margin:"16px 16px 0", padding:"4px", background:"rgba(255,255,255,0.03)", borderRadius:"12px", border:"1px solid rgba(201,149,106,0.08)" }}>
            {([["pool","Pool"],["visited","Visited"],["public","Community"]] as const).map(([id,label]) => (
              <div key={id} style={{ ...tabPill(poolView===id), flex:1 }} onClick={() => { setPoolView(id); setSelectedPublicR(null); }}>{label}</div>
            ))}
          </div>

          {poolView === "pool" && (<>
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>Search for a restaurant to add to your group's pool.</div>
              <label style={S.label}>Search Restaurants</label>
              <div style={{ position:"relative" }}>
                <input style={S.input} placeholder="e.g. Le Bernardin, sushi, Italian..." value={rName}
                  onChange={e => { setRName(e.target.value); searchGooglePlaces(e.target.value, rCity || activeGroup.city, setGpResults, setGpLoading); }}
                />
                {gpLoading && <div style={{ fontSize:"11px", color:"#c9956a", padding:"4px 0" }}>Searching nearby restaurants…</div>}
                {gpResults.length > 0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:10, background:"#2a1a10", border:"1px solid rgba(201,149,106,0.2)", borderRadius:"10px", marginTop:"4px", maxHeight:"240px", overflowY:"auto" }}>
                    {gpResults.map(r => (
                      <div key={r.id} style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid rgba(201,149,106,0.06)" }}
                        onClick={() => {
                          setRName(r.name); setRCuisine(r.cuisine); setRCity(r.city); setRPrice(r.price);
                          setGpResults([]);
                          // Auto-add with Google data
                          setPoolRestaurants(p => [...p, {
                            id: p.length + 100, name: r.name, cuisine: r.cuisine, suggested_by: "You",
                            city: r.city, price: r.price, visited: false, visitedDate: null, visitedRating: null,
                            googleRating: r.googleRating, googleReviewCount: r.googleReviewCount, scRating: null, scReviewCount: 0,
                          }]);
                          setRName(""); setRCuisine(""); setRCity(""); setRPrice(3);
                          showToast(`${r.name} added to the pool.`);
                        }}>
                        <div style={{ fontSize:"13px", color:"#f5e6d3", fontWeight:600 }}>{r.name}</div>
                        <div style={{ fontSize:"11px", color:"#7a5a40", marginTop:"2px" }}>
                          {r.cuisine} · {r.address?.split(',').slice(0,2).join(',') || r.city}
                          {r.googleRating && <span style={{ color:"#7a9e7e", marginLeft:"6px" }}>★ {r.googleRating}</span>}
                          {r.price && <span style={{ marginLeft:"6px" }}>{PRICE_LABELS[r.price]}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", marginBottom:"12px" }}>
                Searching within {searchRadius} mi of {activeGroup.city}
              </div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"8px", marginTop:"16px" }}>Or add manually</div>
              <label style={S.label}>Restaurant Name</label>
              <input style={S.input} placeholder="e.g. Le Bernardin" value={rName} onChange={e => setRName(e.target.value)}/>
              <label style={S.label}>Cuisine Type</label>
              <input style={S.input} placeholder="e.g. French, Italian..." value={rCuisine} onChange={e => setRCuisine(e.target.value)}/>
              <label style={S.label}>City</label>
              <input style={S.input} placeholder="e.g. New York, NY" value={rCity} onChange={e => setRCity(e.target.value)}/>
              <label style={S.label}>Price Range</label>
              <div style={{ display:"flex", gap:"8px", marginBottom:"14px" }}>
                {[1,2,3,4].map(n => (
                  <div key={n} onClick={() => setRPrice(n)} style={{ ...chip(rPrice===n), padding:"9px 14px" }}>{PRICE_LABELS[n]}</div>
                ))}
              </div>
              <button style={S.primaryBtn} onClick={() => {
                if (rName) {
                  setPoolRestaurants(p => [...p, { id:p.length+10, name:rName, cuisine:rCuisine||"—", suggested_by:"You", city:rCity||"—", price:rPrice, visited:false, visitedDate:null, visitedRating:null }]);
                  setRName(""); setRCuisine(""); setRCity(""); setRPrice(3);
                  showToast("Added to the pool.");
                }
              }}>Add Manually</button>
            </div>
            <div style={{ padding:"0 16px 0" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Active Pool · {poolRestaurants.length}</div>
              {poolRestaurants.map(r => (
                <div key={r.id} style={{ ...S.card, margin:"0 0 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={S.cardTitle}>{r.name}</div>
                    <div style={S.cardSub}>{r.cuisine} · {r.city}</div>
                    <div style={{ fontSize:"11px", color:"#4a2e18", marginTop:"3px" }}>suggested by {r.suggested_by}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"4px" }}>
                    <PriceTag price={r.price}/>
                    <RatingBadge restaurant={r}/>
                  </div>
                </div>
              ))}
            </div>
          </>)}

          {poolView === "visited" && (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                Every restaurant your group has dined at. Use the archive to revisit favorites — if your settings allow it.
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
                <div key={r.id} style={{ ...S.card, margin:"0 0 10px" }}>
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
                  {!noRepeats && (
                    <button onClick={() => {
                      setPoolRestaurants(p => [...p, { ...r, visited:false, visitedDate:null, visitedRating:null, suggested_by:"You" }]);
                      showToast(`${r.name} returned to the pool.`);
                    }} style={{ ...S.ghostBtn, marginTop:"12px", fontSize:"11px", padding:"10px" }}>
                      Return to Pool
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {poolView === "public" && (
            selectedPublicR ? (
              <div style={{ padding:"16px 16px 0" }}>
                <button onClick={() => setSelectedPublicR(null)} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"14px", cursor:"pointer", padding:0, marginBottom:"16px" }}>← All Restaurants</button>
                <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"4px" }}>{selectedPublicR}</div>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"20px" }}>New York, NY</div>
                {PUBLIC_REVIEWS.filter(r => r.restaurant === selectedPublicR).map((rev, i) => (
                  <div key={i} style={{ ...S.card, margin:"0 0 10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px" }}>
                      <div style={{ fontSize:"14px", color:"#f5e6d3", fontWeight:"600" }}>{rev.group}</div>
                      <div style={{ fontSize:"14px", color:"#c9956a", fontWeight:"700" }}>{rev.rating}</div>
                    </div>
                    <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.5", fontStyle:"italic" }}>"{rev.review}"</div>
                    <div style={{ fontSize:"11px", color:"#4a2e18", marginTop:"8px" }}>{rev.date}</div>
                  </div>
                ))}
                <button style={{ ...S.primaryBtn, marginTop:"8px" }} onClick={() => {
                  setPoolRestaurants(p => [...p, { id:p.length+20, name:selectedPublicR, cuisine:"—", suggested_by:"Community", city:"New York, NY", price:3, visited:false, visitedDate:null, visitedRating:null }]);
                  showToast(`${selectedPublicR} added to your pool.`);
                }}>Add to Our Pool</button>
              </div>
            ) : (
              <div style={{ padding:"16px 16px 0" }}>
                <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"16px", fontStyle:"italic", lineHeight:"1.6" }}>
                  Reviews from other Supper Club groups. Browse, discover, add to your own pool.
                </div>
                {uniqueRestaurants.map(name => {
                  const reviews = PUBLIC_REVIEWS.filter(r => r.restaurant === name);
                  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
                  return (
                    <div key={name} onClick={() => setSelectedPublicR(name)} style={{ ...S.card, margin:"0 0 10px", cursor:"pointer" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                        <div style={S.cardTitle}>{name}</div>
                        <div style={{ fontSize:"16px", color:"#c9956a", fontWeight:"700" }}>{avg}</div>
                      </div>
                      <div style={S.cardSub}>New York, NY · {reviews.length} review{reviews.length > 1 ? "s" : ""}</div>
                      <div style={{ fontSize:"13px", color:"#9a7a60", lineHeight:"1.5", fontStyle:"italic", marginTop:"8px" }}>"{reviews[0].review.slice(0,80)}..."</div>
                      <div style={{ fontSize:"11px", color:"#4a2e18", marginTop:"8px" }}>{reviews[0].group} · {reviews[0].date}</div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  // ── AVAILABILITY ──
  if (screen === "availability") return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={S.header}>
          <div style={S.headerEye}>{activeGroup.name}</div>
          <div style={S.headerTitle}>Set Availability</div>
        </div>
        <div style={{ padding:"16px 16px 0" }}>
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
          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Group Status</div>
          {MEMBERS.map(m => (
            <div key={m.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{m.name}</span>
              </div>
              <span style={{ fontSize:"12px", fontStyle:"italic", color:m.name === "You" ? "#c9956a" : "#7a9e7e" }}>
                {m.name === "You" ? (selectedDates.length > 0 ? `${selectedDates.length} dates` : "Not yet set") : "Submitted"}
              </span>
            </div>
          ))}
          <div style={{ height:"18px" }}/>
          <button style={S.primaryBtn} onClick={() => { if (selectedDates.length > 0) { showToast("Availability saved."); updateGroup(activeGroup.id, { dinnerStatus:"pending_confirm", pendingDate:"April 4, 2026" }); } }}>
            Submit Availability
          </button>
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
  );

  // ── REVEAL ──
  if (screen === "reveal") return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={S.header}>
          <div style={S.headerEye}>{activeGroup.name}</div>
          <div style={S.headerTitle}>Tonight's Dinner</div>
        </div>
        {!revealUnlocked ? (<>
          <div style={S.revealBox}>
            <div style={{ width:"72px", height:"72px", borderRadius:"50%", border:"1.5px solid rgba(201,149,106,0.3)", margin:"0 auto 24px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:"46px", height:"46px", borderRadius:"50%", border:"1px solid rgba(201,149,106,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", color:"#c9956a" }}>S</div>
            </div>
            <div style={{ fontSize:"22px", color:"#f5e6d3", marginBottom:"10px" }}>The Secret Awaits</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", lineHeight:"1.7", marginBottom:"28px", fontStyle:"italic" }}>Your destination is sealed until the day of the dinner. Good things come to those who don't Google it.</div>
            <div style={{ background:"rgba(201,149,106,0.07)", borderRadius:"12px", padding:"16px", marginBottom:"24px", textAlign:"left" }}>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Reservation Status</div>
              <div style={{ fontSize:"13px", color:"#7a9e7e", marginBottom:"4px" }}>Secured via Resy · {cutoffDays}+ days in advance</div>
              <div style={{ fontSize:"13px", color:"#7a5a40" }}>7:30 PM · Table for {MEMBERS.length}</div>
              <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"6px", fontStyle:"italic" }}>Placed by Supper Club AI. Yes, it actually called.</div>
            </div>
            <button style={{ ...S.primaryBtn, background:"transparent", color:"#c9956a", border:"1px solid rgba(201,149,106,0.35)", marginBottom:0 }}
              onClick={() => { showToast("Reveal unlocked."); setTimeout(() => setRevealUnlocked(true), 700); }}>
              Preview Reveal (Demo)
            </button>
          </div>
          <div style={S.card}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Reservation Platform</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", lineHeight:"2.1" }}>
              <div>Attempted via Resy first, OpenTable as fallback</div>
              <div>Booked {cutoffDays}+ days in advance</div>
              <div>Confirmation sent to all members</div>
              <div>Dietary notes submitted automatically</div>
            </div>
          </div>
        </>) : (<>
          <div style={{ ...S.revealBox, border:"1px solid rgba(201,149,106,0.4)" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"4px", textTransform:"uppercase", marginBottom:"10px" }}>The wait is finally over...</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"6px" }}>You've been very patient. Mostly.</div>
            <div style={{ height:"1px", background:"rgba(201,149,106,0.2)", margin:"20px 0" }}/>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"14px" }}>Tonight you're dining at</div>
            <div style={{ fontSize:"38px", color:"#f5e6d3", fontWeight:"400", marginBottom:"6px" }}>Osteria Morini</div>
            <div style={{ fontSize:"15px", color:"#7a5a40", marginBottom:"4px", fontStyle:"italic" }}>Northern Italian · $$$$</div>
            <div style={{ fontSize:"13px", color:"#7a9e7e", marginBottom:"24px" }}>218 Lafayette St, New York</div>
            <div style={{ height:"1px", background:"rgba(201,149,106,0.2)", margin:"0 0 20px" }}/>
            <div style={{ fontSize:"13px", color:"#c9956a" }}>7:30 PM · Reservation under "{activeGroup.name}"</div>
            <div style={{ fontSize:"12px", color:"#5a3a25", marginTop:"8px", fontStyle:"italic" }}>Dress accordingly. They'll know if you don't.</div>
          </div>
          <div style={{ padding:"0 16px" }}>
            <button style={S.primaryBtn} onClick={() => setScreen("post_dinner")}>After Dinner — Submit Review</button>
          </div>
        </>)}
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
  );

  // ── POST DINNER ──
  if (screen === "post_dinner") return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={S.header}>
          <div style={S.headerEye}>Osteria Morini · Tonight</div>
          <div style={S.headerTitle}>Dinner Review</div>
        </div>
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>Tell us everything. Your cruelest critiques are welcome here.</div>

          <div style={{ ...S.card, textAlign:"center", padding:"28px", cursor:"pointer", background:photoSubmitted?"rgba(122,158,126,0.07)":"rgba(255,255,255,0.03)", border:photoSubmitted?"1px solid rgba(122,158,126,0.25)":"1px solid rgba(201,149,106,0.1)" }}
            onClick={() => { setPhotoSubmitted(true); showToast("Photo added."); }}>
            {photoSubmitted ? (<>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"1.5px solid #7a9e7e", margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", color:"#7a9e7e" }}>✓</div>
              <div style={{ fontSize:"13px", color:"#7a9e7e" }}>Photo submitted</div>
            </>) : (<>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"1.5px solid rgba(201,149,106,0.35)", margin:"0 auto 10px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", color:"#c9956a" }}>+</div>
              <div style={{ fontSize:"13px", color:"#7a5a40" }}>Tap to add food photos</div>
            </>)}
          </div>

          <div style={{ marginBottom:"22px" }}>
            <label style={S.label}>Overall Rating</label>
            <StarRating value={reviewRating} onChange={setReviewRating}/>
          </div>

          <label style={S.label}>Your Experience</label>
          <textarea style={{ ...S.input, height:"100px", resize:"none" }} placeholder="The ambience, the dishes, the moment Priya ordered the wrong thing..." value={reviewText} onChange={e => setReviewText(e.target.value)}/>

          <label style={S.label}>Dishes You Tried</label>
          <input style={S.input} placeholder="e.g. Pasta al Forno, Tiramisu..."/>

          <div style={{ marginBottom:"20px" }}>
            <label style={S.label}>Who Ordered the Best Dish?</label>
            <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", marginBottom:"12px", lineHeight:"1.5" }}>Choose wisely. The winner earns the Best Dish badge — and the right to never let you forget it.</div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {MEMBERS.map(m => (
                <div key={m.name} onClick={() => setBestDishMember(m.name)} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 14px", borderRadius:"12px", cursor:"pointer", background:bestDishMember===m.name?"rgba(201,149,106,0.15)":"rgba(255,255,255,0.03)", border:bestDishMember===m.name?"1px solid rgba(201,149,106,0.5)":"1px solid rgba(201,149,106,0.1)", transition:"all 0.15s" }}>
                  <div style={{ width:"28px", height:"28px", borderRadius:"50%", background:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", color:"#fff", fontWeight:"700" }}>{m.avatar}</div>
                  <span style={{ fontSize:"13px", color:bestDishMember===m.name?"#c9956a":"#7a5a40" }}>{m.name}</span>
                </div>
              ))}
            </div>
            {bestDishMember && <div style={{ marginTop:"10px", fontSize:"12px", color:"#7a9e7e", fontStyle:"italic" }}>{bestDishMember==="You"?"Bold choice. We respect it.":`${bestDishMember} wins the Best Dish honor.`}</div>}
          </div>

          <label style={S.label}>Would You Return?</label>
          <div style={{ display:"flex", gap:"8px", marginBottom:"24px" }}>
            {["Absolutely","Maybe","Probably Not"].map(opt => (
              <button key={opt} onClick={() => setReturnChoice(opt)} style={{ flex:1, padding:"11px 4px", borderRadius:"10px", fontSize:"11px", letterSpacing:"0.5px", background:returnChoice===opt?"rgba(201,149,106,0.15)":"rgba(255,255,255,0.03)", border:returnChoice===opt?"1px solid rgba(201,149,106,0.5)":"1px solid rgba(201,149,106,0.1)", color:returnChoice===opt?"#c9956a":"#7a5a40", cursor:"pointer", fontFamily:"Georgia,serif", transition:"all 0.15s" }}>{opt}</button>
            ))}
          </div>

          <div style={{ ...S.card, margin:"0 0 16px", padding:"24px" }}>
            <div style={{ fontSize:"14px", color:"#f5e6d3", fontWeight:"600", marginBottom:"6px" }}>Plan the Next Dinner</div>
            <div style={{ fontSize:"12px", color:"#7a5a40", fontStyle:"italic", marginBottom:"16px", lineHeight:"1.6" }}>While the evening is still fresh — pick your next available dates. No pressure. But also, yes pressure.</div>
            <MealTypeSelector selected={selectedMealTypes} onToggle={(t) => toggleMealType(t, selectedMealTypes, setSelectedMealTypes)} label="I'm open to"/>
            <CalendarGrid selectedArr={postDinnerDates} setArr={setPostDinnerDates} weeks={3} cutoffDays={cutoffDays} showToast={showToast}/>
            {postDinnerDates.length > 0 && (
              <div style={{ background:"rgba(201,149,106,0.07)", borderRadius:"10px", padding:"10px 14px", marginBottom:"12px", fontSize:"12px", color:"#c9956a", textAlign:"center" }}>
                {postDinnerDates.length} evening{postDinnerDates.length > 1 ? "s" : ""} selected
              </div>
            )}
            <div style={{ fontSize:"11px", color:"#5a3a25", fontStyle:"italic", lineHeight:"1.5" }}>
              {postDinnerDates.length > 0 ? "Dates submitted with review. The app will propose as soon as everyone's in." : "Skip this and submit dates later from the Dates tab. No judgement. Well, a little."}
            </div>
          </div>

          <button style={S.primaryBtn} onClick={() => {
            showToast(bestDishMember ? `Review submitted. ${bestDishMember} gets the Best Dish badge.` : "Review submitted.");
            if (postDinnerDates.length > 0) updateGroup(activeGroup.id, { dinnerStatus:"pending_confirm", pendingDate:"April 11, 2026" });
            setTimeout(() => setScreen("club_home"), 2000);
          }}>Submit Review</button>

          <div style={{ marginBottom:"16px" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px", textAlign:"center" }}>Share Your Review</div>
            <div style={{ display:"flex", gap:"8px", justifyContent:"center", flexWrap:"wrap" }}>
              {[
                { name:"Instagram", icon:"📸", color:"#E1306C" },
                { name:"TikTok", icon:"🎵", color:"#00f2ea" },
                { name:"Snapchat", icon:"👻", color:"#FFFC00" },
                { name:"Facebook", icon:"📘", color:"#1877F2" },
                { name:"X", icon:"𝕏", color:"#f5e6d3" },
              ].map(p => (
                <div key={p.name} onClick={() => showToast(`Opening ${p.name}…`)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", cursor:"pointer", padding:"10px 12px", borderRadius:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(201,149,106,0.1)", minWidth:"56px", transition:"all 0.15s" }}>
                  <span style={{ fontSize:"20px" }}>{p.icon}</span>
                  <span style={{ fontSize:"9px", color:"#7a5a40", letterSpacing:"0.5px" }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button style={{ ...S.ghostBtn, marginBottom:"16px" }} onClick={() => { showToast("Review submitted."); setTimeout(() => setScreen("club_home"), 1800); }}>Submit Without Next Dates</button>
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
  );

  // ── FREE REVIEW ──
  if (screen === "free_review") return (
    <div style={S.app}><div style={S.phone}>
      {toast && <div style={S.toast}>{toast}</div>}
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
            <button onClick={() => setScreen("club_home")} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
            <div style={S.headerEye}>Personal Log</div>
          </div>
          <div style={S.headerTitle}>Log a Review</div>
        </div>
        <div style={{ padding:"20px 16px 0" }}>
          <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic", marginBottom:"20px", lineHeight:"1.6" }}>
            Dined somewhere outside the club? Log it here. Your personal reviews are yours alone — share them with the community or keep them private.
          </div>
          <label style={S.label}>Restaurant Name</label>
          <div style={{ position:"relative" }}>
            <input style={S.input} placeholder="e.g. Don Angie" value={freeReviewRestaurant}
              onChange={e => {
                setFreeReviewRestaurant(e.target.value);
                setFreeReviewShowSuggestions(true);
                searchGooglePlaces(e.target.value, freeReviewCity || activeGroup.city, setGpFreeResults, setGpFreeLoading);
              }}
              onFocus={() => setFreeReviewShowSuggestions(true)}
              onBlur={() => setTimeout(() => setFreeReviewShowSuggestions(false), 200)}
            />
            {gpFreeLoading && <div style={{ fontSize:"11px", color:"#c9956a", padding:"4px 0" }}>Searching…</div>}
            {freeReviewShowSuggestions && (gpFreeResults.length > 0 || restaurantSuggestions.length > 0) && (
              <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:10, background:"#2a1a10", border:"1px solid rgba(201,149,106,0.2)", borderRadius:"10px", marginTop:"4px", maxHeight:"240px", overflowY:"auto" }}>
                {restaurantSuggestions.map(r => (
                  <div key={r.id} style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid rgba(201,149,106,0.06)", fontSize:"13px", color:"#f5e6d3" }}
                    onMouseDown={() => {
                      setFreeReviewRestaurant(r.name);
                      setFreeReviewCity(r.city);
                      setFreeReviewCuisine(r.cuisine);
                      setRPrice(r.price);
                      setFreeReviewShowSuggestions(false);
                      setGpFreeResults([]);
                    }}>
                    <span style={{ fontWeight:600 }}>{r.name}</span>
                    <span style={{ color:"#7a5a40", marginLeft:"8px" }}>{r.cuisine} · {r.city}</span>
                    <span style={{ color:"#c9956a", marginLeft:"6px", fontSize:"10px" }}>In pool</span>
                  </div>
                ))}
                {gpFreeResults.filter(g => !restaurantSuggestions.some(r => r.name === g.name)).map(r => (
                  <div key={r.id} style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid rgba(201,149,106,0.06)" }}
                    onMouseDown={() => {
                      setFreeReviewRestaurant(r.name);
                      setFreeReviewCity(r.city);
                      setFreeReviewCuisine(r.cuisine);
                      setRPrice(r.price);
                      setFreeReviewShowSuggestions(false);
                      setGpFreeResults([]);
                    }}>
                    <div style={{ fontSize:"13px", color:"#f5e6d3", fontWeight:600 }}>{r.name}</div>
                    <div style={{ fontSize:"11px", color:"#7a5a40", marginTop:"2px" }}>
                      {r.cuisine} · {r.address?.split(',').slice(0,2).join(',') || r.city}
                      {r.googleRating && <span style={{ color:"#7a9e7e", marginLeft:"6px" }}>★ {r.googleRating}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label style={S.label}>City</label>
          <input style={S.input} placeholder="e.g. New York, NY" value={freeReviewCity} onChange={e => setFreeReviewCity(e.target.value)}/>
          <label style={S.label}>Cuisine</label>
          <input style={S.input} placeholder="e.g. Italian, Korean..." value={freeReviewCuisine} onChange={e => setFreeReviewCuisine(e.target.value)}/>
          <div style={{ marginBottom:"16px" }}>
            <label style={S.label}>Price Range</label>
            <div style={{ display:"flex", gap:"8px" }}>
              {[1,2,3,4].map(n => (
                <div key={n} style={chip(rPrice===n)} onClick={() => setRPrice(n)}>{PRICE_LABELS[n]}</div>
              ))}
            </div>
          </div>
          <MealTypeSelector selected={[freeReviewMealType]} onToggle={(t) => setFreeReviewMealType(t)} label="Meal Type"/>
          <label style={S.label}>Date Visited</label>
          <input style={S.input} placeholder="e.g. March 5, 2026"/>

          <div style={{ ...S.card, textAlign:"center", padding:"24px", cursor:"pointer", margin:"0 0 16px", background:freeReviewPhoto?"rgba(122,158,126,0.07)":"rgba(255,255,255,0.03)", border:freeReviewPhoto?"1px solid rgba(122,158,126,0.25)":"1px solid rgba(201,149,106,0.1)" }}
            onClick={() => { setFreeReviewPhoto(true); showToast("Photo added."); }}>
            {freeReviewPhoto ? (<>
              <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"1.5px solid #7a9e7e", margin:"0 auto 8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:"#7a9e7e" }}>✓</div>
              <div style={{ fontSize:"13px", color:"#7a9e7e" }}>Photo added</div>
            </>) : (<>
              <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"1.5px solid rgba(201,149,106,0.35)", margin:"0 auto 8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", color:"#c9956a" }}>+</div>
              <div style={{ fontSize:"13px", color:"#7a5a40" }}>Add photos</div>
            </>)}
          </div>

          <div style={{ marginBottom:"18px" }}>
            <label style={S.label}>Your Rating</label>
            <StarRating value={freeReviewRating} onChange={setFreeReviewRating}/>
          </div>
          <label style={S.label}>Your Review</label>
          <textarea style={{ ...S.input, height:"110px", resize:"none" }} placeholder="What did you order? What was memorable? Would you bring the club here?" value={freeReviewText} onChange={e => setFreeReviewText(e.target.value)}/>
          <label style={S.label}>Dishes You Tried</label>
          <input style={S.input} placeholder="e.g. Beef tartare, Soufflé..."/>

          <div style={{ ...S.card, margin:"0 0 16px", padding:"16px" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"10px" }}>Reservation Platform</div>
            <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"12px", fontStyle:"italic" }}>Was this restaurant booked via a platform?</div>
            <div style={{ display:"flex", gap:"8px" }}>
              {["Resy","OpenTable","Walk-in","Other"].map(p => (
                <div key={p} style={{ ...chip(false), fontSize:"11px", padding:"8px 12px" }}>{p}</div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <Toggle on={false} onToggle={() => {}} label="Share to Community Rankings"/>
            <div style={{ fontSize:"12px", color:"#5a3a25", fontStyle:"italic", padding:"8px 0 4px", lineHeight:"1.5" }}>
              When on, your review will appear in the Community Rankings tab for other Supper Club groups to discover.
            </div>
          </div>

          <div style={{ height:"16px" }}/>
          <button style={S.primaryBtn} onClick={() => { showToast("Review logged."); setTimeout(() => setScreen("club_home"), 1500); }}>Save Review</button>

          <div style={{ marginBottom:"16px", marginTop:"12px" }}>
            <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px", textAlign:"center" }}>Share Your Review</div>
            <div style={{ display:"flex", gap:"8px", justifyContent:"center", flexWrap:"wrap" }}>
              {[
                { name:"Instagram", icon:"📸", color:"#E1306C" },
                { name:"TikTok", icon:"🎵", color:"#00f2ea" },
                { name:"Snapchat", icon:"👻", color:"#FFFC00" },
                { name:"Facebook", icon:"📘", color:"#1877F2" },
                { name:"X", icon:"𝕏", color:"#f5e6d3" },
              ].map(p => (
                <div key={p.name} onClick={() => showToast(`Opening ${p.name}…`)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", cursor:"pointer", padding:"10px 12px", borderRadius:"12px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(201,149,106,0.1)", minWidth:"56px", transition:"all 0.15s" }}>
                  <span style={{ fontSize:"20px" }}>{p.icon}</span>
                  <span style={{ fontSize:"9px", color:"#7a5a40", letterSpacing:"0.5px" }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button style={{ ...S.ghostBtn, marginBottom:"16px" }} onClick={() => setScreen("club_home")}>Cancel</button>
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
    </div></div>
  );

  // ── BADGES ──
  if (screen === "badges") {
    const BadgeList = ({ list, earned }: { list: typeof INDIVIDUAL_BADGES; earned: boolean }) => (
      <>
        {list.filter(b => b.earned === earned).map(b => (
          <div key={b.id} style={{ display:"flex", alignItems:"center", gap:"14px", background:earned?"rgba(255,255,255,0.035)":"rgba(255,255,255,0.015)", border:`1px solid rgba(201,149,106,${earned?"0.1":"0.05"})`, borderRadius:"16px", padding:"16px", marginBottom:"10px", opacity:earned?1:0.45 }}>
            <div style={{ ...S.badgeSymbol, ...(earned?{}:{ color:"#4a2e18", border:"1px solid rgba(201,149,106,0.08)" }) }}>{b.symbol}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"15px", color:earned?"#f5e6d3":"#7a5a40", fontWeight:earned?"600":"400" }}>{b.name}</div>
              <div style={{ fontSize:"12px", color:earned?"#7a5a40":"#4a2e18", marginTop:"3px" }}>{b.desc}</div>
            </div>
            {earned ? <div style={{ fontSize:"13px", color:"#c9956a" }}>✓</div> : <div style={{ width:"10px", height:"10px", borderRadius:"2px", border:"1.5px solid #4a2e18" }}/>}
          </div>
        ))}
      </>
    );

    return (
      <div style={S.app}><div style={S.phone}>
        <div style={S.screen}>
          <div style={S.header}>
            <div style={S.headerEye}>The Golden Table</div>
            <div style={S.headerTitle}>Badges</div>
          </div>
          <div style={{ display:"flex", gap:"6px", margin:"16px 16px 0", padding:"4px", background:"rgba(255,255,255,0.03)", borderRadius:"12px", border:"1px solid rgba(201,149,106,0.08)" }}>
            <div style={tabPill(badgeTab==="individual")} onClick={() => setBadgeTab("individual")}>Individual</div>
            <div style={tabPill(badgeTab==="group")} onClick={() => setBadgeTab("group")}>Group</div>
          </div>

          {badgeTab === "individual" ? (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ ...S.card, background:"linear-gradient(135deg,rgba(201,149,106,0.1),rgba(201,149,106,0.03))", textAlign:"center", marginBottom:"20px" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>Your Personal Collection</div>
                <div style={{ fontSize:"40px", color:"#f5e6d3", fontWeight:"700", lineHeight:"1" }}>{iEarned}<span style={{ fontSize:"18px", fontWeight:"400", color:"#7a5a40" }}> / {INDIVIDUAL_BADGES.length}</span></div>
                <div style={{ fontSize:"12px", color:"#7a5a40", marginTop:"6px", fontStyle:"italic" }}>Earned across all your groups</div>
                <div style={{ height:"3px", background:"rgba(201,149,106,0.12)", borderRadius:"2px", margin:"14px 0 0", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(iEarned/INDIVIDUAL_BADGES.length)*100}%`, background:"linear-gradient(90deg,#c9956a,#9a6040)", borderRadius:"2px" }}/>
                </div>
              </div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Earned</div>
              <BadgeList list={INDIVIDUAL_BADGES} earned={true}/>
              <div style={{ fontSize:"11px", color:"#4a2e18", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px", marginTop:"20px" }}>Locked</div>
              <BadgeList list={INDIVIDUAL_BADGES} earned={false}/>
            </div>
          ) : (
            <div style={{ padding:"16px 16px 0" }}>
              <div style={{ display:"flex", gap:"8px", overflowX:"auto", marginBottom:"16px" }}>
                {groups.map(g => (
                  <div key={g.id} onClick={() => setActiveGroup(g)} style={chip(activeGroup.id===g.id)}>{g.name}</div>
                ))}
              </div>
              <div style={{ ...S.card, background:"linear-gradient(135deg,rgba(201,149,106,0.1),rgba(201,149,106,0.03))", textAlign:"center", marginBottom:"20px" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"10px" }}>{activeGroup.name}</div>
                <div style={{ fontSize:"40px", color:"#f5e6d3", fontWeight:"700", lineHeight:"1" }}>{gEarned}<span style={{ fontSize:"18px", fontWeight:"400", color:"#7a5a40" }}> / {GROUP_BADGES.length}</span></div>
                <div style={{ fontSize:"12px", color:"#7a5a40", marginTop:"6px", fontStyle:"italic" }}>Earned together, or not at all.</div>
                <div style={{ height:"3px", background:"rgba(201,149,106,0.12)", borderRadius:"2px", margin:"14px 0 0", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(gEarned/GROUP_BADGES.length)*100}%`, background:"linear-gradient(90deg,#c9956a,#9a6040)", borderRadius:"2px" }}/>
                </div>
              </div>
              <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Earned</div>
              <BadgeList list={GROUP_BADGES} earned={true}/>
              <div style={{ fontSize:"11px", color:"#4a2e18", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px", marginTop:"20px" }}>Locked</div>
              <BadgeList list={GROUP_BADGES} earned={false}/>
            </div>
          )}
        </div>
        <NavBar activeTab={activeTab} onNavigate={onNavigate}/>
      </div></div>
    );
  }

  return null;
}

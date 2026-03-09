import React, { useState, type CSSProperties } from "react";
import { Restaurant, getRatingInfo, MEAL_TYPES, PRICE_LABELS } from "@/data/supper-club-data";
import { S, chip } from "./styles";

// ── Minimal SVG social icons ──
const SocialIcon = ({ type }: { type: string }) => {
  const s: CSSProperties = { width: 22, height: 22, display: "block" };
  const c = "rgba(212,205,196,0.85)";
  switch (type) {
    case "Instagram":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1" fill={c} stroke="none" />
        </svg>
      );
    case "TikTok":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
      );
    case "Snapchat":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C9 2 7 4.5 7 7.5v2.5c-1 .3-2 .7-2 1.2 0 .6 1.2.8 1.5 1 .3.2.3.5.1.9-.3.6-.8 1.3-1.4 1.7-.3.2-.2.5.1.7 1 .5 2 .5 2.5.7.2.1.2.4.2.7 0 .3.3.5.6.5.6 0 1.3-.4 2.4-.4s1.8.4 2.4.4c.3 0 .6-.2.6-.5 0-.3 0-.6.2-.7.5-.2 1.5-.2 2.5-.7.3-.2.4-.5.1-.7-.6-.4-1.1-1.1-1.4-1.7-.2-.4-.2-.7.1-.9.3-.2 1.5-.4 1.5-1 0-.5-1-.9-2-1.2V7.5C17 4.5 15 2 12 2z" />
        </svg>
      );
    case "Facebook":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "X":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.4L20 4h-2l-5.2 6.4L8 4H4z" />
        </svg>
      );
    default:
      return null;
  }
};

// ── ShareRow ──
export const ShareRow = ({ showToast }: { showToast: (msg: string) => void }) => (
  <div style={{ marginBottom: "16px" }}>
    <div style={{ fontSize: "11px", color: "#d4cdc4", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px", textAlign: "center" }}>
      Share Your Review
    </div>
    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
      {["Instagram", "TikTok", "Snapchat", "Facebook", "X"].map(name => (
        <div
          key={name}
          onClick={() => showToast(`Opening ${name}…`)}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
            cursor: "pointer", padding: "12px 10px", borderRadius: "14px",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,205,196,0.08)",
            minWidth: "52px", transition: "all 0.2s",
          }}
        >
          <SocialIcon type={name} />
          <span style={{ fontSize: "8px", color: "#565250", letterSpacing: "1px", textTransform: "uppercase" }}>{name}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── StarRating ──
export const StarRating = ({ value, onChange, small }: { value: number; onChange?: (n: number) => void; small?: boolean }) => (
  <div style={{ display:"flex", gap:small?"6px":"10px", alignItems:"center" }}>
    {[1,2,3,4,5].map(n => (
      <div key={n} onClick={() => onChange?.(n)} style={{
        width:small?"16px":"26px", height:small?"16px":"26px", borderRadius:"50%",
        border:value>=n?"none":"1.5px solid #565250",
        background:value>=n?"#d4cdc4":"transparent",
        cursor:onChange?"pointer":"default", flexShrink:0, transition:"all 0.15s",
      }}/>
    ))}
    {!small && value>0 && <span style={{ fontSize:"12px", color:"#8c8278", fontStyle:"italic" }}>{["","Poor","Fair","Good","Great","Exceptional"][value]}</span>}
  </div>
);

// ── Toggle ──
export const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid rgba(212,205,196,0.07)" }}>
    <span style={{ fontSize:"14px", color:"#e5ded5" }}>{label}</span>
    <div onClick={onToggle} style={{ width:"44px", height:"24px", borderRadius:"12px", background:on?"linear-gradient(135deg,#d4cdc4,#a49a8e)":"rgba(255,255,255,0.08)", border:on?"none":"1px solid rgba(212,205,196,0.2)", position:"relative", cursor:"pointer", transition:"all 0.2s" }}>
      <div style={{ position:"absolute", top:"3px", left:on?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:on?"#2a2a2a":"#565250", transition:"left 0.2s" }}/>
    </div>
  </div>
);

// ── PriceTag ──
export const PriceTag = ({ price }: { price: number }) => (
  <span style={{ fontSize:"12px", color:"#d4cdc4", letterSpacing:"1px" }}>
    {PRICE_LABELS[price] || "—"}
  </span>
);

// ── RatingBadge ──
export const RatingBadge = ({ restaurant, large }: { restaurant: Restaurant; large?: boolean }) => {
  const [showTip, setShowTip] = useState(false);
  const info = getRatingInfo(restaurant);
  if (!info) return null;
  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:"5px" }}>
      <span style={{ fontSize: large ? "18px" : "14px", fontWeight:"700", color: info.color }}>{info.rating}</span>
      <span
        onClick={() => setShowTip(p => !p)}
        style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.5px", color:"#2a2a2a", background: info.source==="SC" ? "#d4cdc4" : "#7a9e7e", borderRadius:"4px", padding:"2px 5px", cursor:"pointer", userSelect:"none" }}
      >{info.source}</span>
      {showTip && (
        <div onClick={() => setShowTip(false)} style={{ position:"absolute", bottom:"calc(100% + 8px)", right:0, background:"#2e2e2e", border:"1px solid rgba(212,205,196,0.3)", borderRadius:"10px", padding:"10px 12px", fontSize:"11px", color:"#e5ded5", whiteSpace:"nowrap", zIndex:50, lineHeight:"1.5", boxShadow:"0 4px 20px rgba(0,0,0,0.6)" }}>
          {info.tip}
          <div style={{ fontSize:"10px", color:"#8c8278", marginTop:"4px" }}>Tap to dismiss</div>
        </div>
      )}
    </div>
  );
};

// ── GlobalGroupSwitcher ──
export const GlobalGroupSwitcher = ({
  groups,
  activeGroup,
  setActiveGroup,
  onNewClub,
  onJoinClub,
  onGroupSelect,
  maxGroups = 15,
}: {
  groups: { id: number; name: string }[];
  activeGroup: { id: number; name: string };
  setActiveGroup: (g: any) => void;
  onNewClub: () => void;
  onJoinClub: () => void;
  onGroupSelect?: (g: any) => void;
  maxGroups?: number;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div style={{ padding: "12px 0 0", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 16px", overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", msOverflowStyle: "none" }}>
        {groups.map(g => {
          const active = g.id === activeGroup.id;
          return (
            <div key={g.id} onClick={() => { setActiveGroup(g); onGroupSelect?.(g); }}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: "16px", cursor: "pointer",
                background: active ? "linear-gradient(135deg,rgba(212,205,196,0.15),rgba(212,205,196,0.06))" : "rgba(255,255,255,0.02)",
                border: active ? "1px solid rgba(212,205,196,0.35)" : "1px solid rgba(212,205,196,0.08)",
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: "11px", fontWeight: active ? "600" : "400", color: active ? "#e5ded5" : "#565250", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{g.name}</div>
            </div>
          );
        })}
        {groups.length < maxGroups && (
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(p => !p)}
              style={{
                flexShrink: 0, padding: "8px 12px", borderRadius: "16px", cursor: "pointer",
                background: showMenu ? "rgba(212,205,196,0.1)" : "transparent",
                border: "1px dashed rgba(212,205,196,0.2)", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "5px",
              }}>
              <span style={{ fontSize: "12px", color: "#d4cdc4", lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "10px", color: "#8c8278", whiteSpace: "nowrap" }}>New</span>
            </div>
          </div>
        )}
      </div>
      {/* Menu rendered outside the scrollable container to avoid clipping */}
      {showMenu && groups.length < maxGroups && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: "16px", zIndex: 100,
            background: "#2e2e2e", border: "1px solid rgba(212,205,196,0.3)",
            borderRadius: "12px", padding: "6px", minWidth: "160px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div onClick={() => { setShowMenu(false); onNewClub(); }}
              style={{
                padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,205,196,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: "13px", color: "#e5ded5", marginBottom: "2px" }}>Create a Club</div>
              <div style={{ fontSize: "10px", color: "#8c8278" }}>Start a new dining circle</div>
            </div>
            <div onClick={() => { setShowMenu(false); onJoinClub(); }}
              style={{
                padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,205,196,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: "13px", color: "#e5ded5", marginBottom: "2px" }}>Join with Code</div>
              <div style={{ fontSize: "10px", color: "#8c8278" }}>Enter an invite code</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
// ── Hand-drawn nav icons ──
const NavIcon = ({ id, active }: { id: string; active: boolean }) => {
  const c = active ? "#d4cdc4" : "#4a4a4a";
  const sw = "2.2";
  const props = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "home": return (
      <svg {...props}>
        <path d="M3 10.5 C3 10.5 12 3 12 3 C12 3 21 10.5 21 10.5" />
        <path d="M5 9.5V19C5 19.6 5.4 20 6 20H9.5V14.5H14.5V20H18C18.6 20 19 19.6 19 19V9.5" />
      </svg>
    );
    case "explore": return (
      <svg {...props}>
        <circle cx="11" cy="11" r="7" />
        <path d="M15.5 15.5L20 20" />
        <path d="M8.5 9.5C9 8.5 10 7.8 11 7.8" strokeWidth="1.8" />
      </svg>
    );
    case "schedule": return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M3 10H21" />
        <path d="M8 3V6" />
        <path d="M16 3V6" />
        <circle cx="8.5" cy="14.5" r="1" fill={c} stroke="none" />
        <circle cx="12" cy="14.5" r="1" fill={c} stroke="none" />
        <circle cx="15.5" cy="14.5" r="1" fill={c} stroke="none" />
      </svg>
    );
    case "reveal": return (
      <svg {...props}>
        <path d="M12 4C12 4 8 7 5 9.5C3.5 10.7 2 12 2 12C2 12 3.5 13.3 5 14.5C8 17 12 20 12 20C12 20 16 17 19 14.5C20.5 13.3 22 12 22 12C22 12 20.5 10.7 19 9.5C16 7 12 4 12 4Z" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="12" cy="12" r="1.2" fill={c} stroke="none" />
      </svg>
    );
    case "badges": return (
      <svg {...props}>
        <circle cx="12" cy="9.5" r="6.5" />
        <path d="M8.5 15L7 22L12 19.5L17 22L15.5 15" />
        <path d="M12 6.5V12.5" strokeWidth="1.8" />
        <path d="M9.5 9.5H14.5" strokeWidth="1.8" />
      </svg>
    );
    default: return null;
  }
};

// ── NavBar ──
export const NavBar = ({ activeTab, onNavigate, hidebadges }: { activeTab: string; onNavigate: (tab: string, screen: string) => void; hidebadges?: boolean }) => (
  <div style={S.bottomNav}>
    {[
      { id:"home",        screen:"club_home" },
      { id:"explore",     screen:"explore" },
      { id:"schedule",    screen:"availability" },
      { id:"reveal",      screen:"reveal" },
      { id:"badges",      screen:"badges" },
    ].filter(item => !(hidebadges && item.id === "badges")).map(item => (
      <div key={item.id} style={S.navItem} onClick={() => onNavigate(item.id, item.screen)}>
        <NavIcon id={item.id} active={activeTab===item.id} />
      </div>
    ))}
  </div>
);

// ── Helpers for date:meal encoding ──
export const parseDateMeal = (entry: string): { date: string; meal: string } => {
  const idx = entry.indexOf(":");
  if (idx === -1) return { date: entry, meal: "Dinner" }; // backward compat
  return { date: entry.substring(0, idx), meal: entry.substring(idx + 1) };
};

export const encodeDateMeal = (date: string, meal: string) => `${date}:${meal}`;

export const getUniqueDates = (entries: string[]): string[] => {
  const dates = new Set(entries.map(e => parseDateMeal(e).date));
  return Array.from(dates);
};

export const getMealsForDate = (entries: string[], date: string): string[] => {
  return entries.filter(e => parseDateMeal(e).date === date).map(e => parseDateMeal(e).meal);
};

// Sleek monochrome SVG icons for meal types
const MealIcon = ({ type, size = 14, color = "currentColor" }: { type: string; size?: number; color?: string }) => {
  const s = size;
  switch (type) {
    case "Breakfast":
      // Sunrise icon
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v2" /><path d="M3.17 5.17l1.42 1.42" /><path d="M12.83 5.17l-1.42 1.42" /><path d="M2 11h12" /><path d="M4 11a4 4 0 0 1 8 0" />
        </svg>
      );
    case "Brunch":
      // Champagne glass icon
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 2l-1 6a3 3 0 0 0 3 3v0a3 3 0 0 0 3-3L9 2" /><path d="M7 11v3" /><path d="M5 14h4" />
        </svg>
      );
    case "Lunch":
      // Coffee cup icon
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h8v5a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5z" /><path d="M11 7h1.5a1.5 1.5 0 0 1 0 3H11" /><path d="M5 3v1" /><path d="M7 2v2" /><path d="M9 3v1" />
        </svg>
      );
    case "Dinner":
      // Moon/crescent icon
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 9A5 5 0 1 1 7 3a4 4 0 0 0 6 6z" />
        </svg>
      );
    default:
      return null;
  }
};
const MEAL_COLORS: Record<string, string> = { Breakfast: "#c9956a", Brunch: "#c9956a", Lunch: "#c9956a", Dinner: "#c9956a" };

// ── CalendarGrid with per-date meal selection ──
export const CalendarGrid = ({ selectedArr, setArr, weeks = 3, cutoffDays, showToast, otherGroupDates = [] }: {
  selectedArr: string[];
  setArr: React.Dispatch<React.SetStateAction<string[]>>;
  weeks?: number;
  cutoffDays: number;
  showToast: (msg: string) => void;
  otherGroupDates?: string[];
}) => {
  const [expandedDate, setExpandedDate] = React.useState<string | null>(null);
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setDate(today.getDate() + cutoffDays);

  const dates: Date[] = [];
  for (let i = 1; i <= weeks * 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  const formatDate = (d: Date) => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return { day: days[d.getDay()], date: d.getDate(), month: months[d.getMonth()], isPast: d < cutoffDate };
  };

  const CONFLICT_QUIPS = [
    "Two-timing your supper clubs? Bold move.",
    "Playing both sides of the dinner table, are we?",
    "You've already pledged this evening to another crew. Double-book anyway?",
    "Your other club called dibs on this night. Feeling rebellious?",
    "Careful — you're flirting with a scheduling love triangle.",
    "This date's spoken for by another club. Risk the drama?",
  ];

  const toggleDate = (key: string, isPast: boolean) => {
    if (isPast) { showToast("Cutoff has passed for this date."); return; }
    
    const existingMeals = getMealsForDate(selectedArr, key);
    
    if (existingMeals.length > 0 && expandedDate === key) {
      // If already expanded and has meals, collapse — clicking again removes all meals for this date
      setArr(p => p.filter(e => parseDateMeal(e).date !== key));
      setExpandedDate(null);
    } else {
      // Check for cross-group conflicts
      const otherDates = otherGroupDates.map(e => parseDateMeal(e).date);
      if (existingMeals.length === 0 && otherDates.includes(key)) {
        const quip = CONFLICT_QUIPS[Math.floor(Math.random() * CONFLICT_QUIPS.length)];
        if (!confirm(quip)) return;
      }
      
      if (existingMeals.length === 0) {
        // First tap: add "Dinner" by default and expand
        setArr(p => [...p, encodeDateMeal(key, "Dinner")]);
      }
      setExpandedDate(key);
    }
  };

  const toggleMealForDate = (date: string, meal: string) => {
    const entry = encodeDateMeal(date, meal);
    const has = selectedArr.includes(entry);
    if (has) {
      // Don't allow removing the last meal — instead remove the whole date
      const mealsForDate = getMealsForDate(selectedArr, date);
      if (mealsForDate.length <= 1) {
        setArr(p => p.filter(e => parseDateMeal(e).date !== date));
        setExpandedDate(null);
        return;
      }
      setArr(p => p.filter(e => e !== entry));
    } else {
      setArr(p => [...p, entry]);
    }
  };

  const uniqueSelectedDates = getUniqueDates(selectedArr);

  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px", marginBottom: "6px" }}>
        {dates.map(d => {
          const fd = formatDate(d);
          const key = d.toISOString().split("T")[0];
          const mealsSelected = getMealsForDate(selectedArr, key);
          const sel = mealsSelected.length > 0;
          const isExpanded = expandedDate === key;
          const inOtherGroup = otherGroupDates.map(e => parseDateMeal(e).date).includes(key);
          return (
            <div key={key} onClick={() => toggleDate(key, fd.isPast)} style={{
              borderRadius:"10px", padding:"8px 4px", textAlign:"center",
              cursor:fd.isPast?"not-allowed":"pointer",
              background: isExpanded ? "linear-gradient(135deg,#c9956a,#a47a50)" : sel?"linear-gradient(135deg,#d4cdc4,#a49a8e)":fd.isPast?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",
              border: isExpanded ? "none" : sel?"none":`1px solid rgba(212,205,196,${fd.isPast?"0.04":"0.1"})`,
              opacity:fd.isPast?0.3:1, transition:"all 0.15s",
              position:"relative",
            }}>
              <div style={{ fontSize:"9px", color:sel?"#2a2a2a":"#8c8278", marginBottom:"2px" }}>{fd.day}</div>
              <div style={{ fontSize:"15px", fontWeight:"700", color:sel?"#2a2a2a":"#e5ded5" }}>{fd.date}</div>
              <div style={{ fontSize:"8px", color:sel?"#2a2a2a":"#3d3d3d" }}>{fd.month}</div>
              {/* Meal dots */}
              {sel && !isExpanded && (
                <div style={{ display:"flex", justifyContent:"center", gap:"2px", marginTop:"3px" }}>
                  {mealsSelected.map(m => (
                    <div key={m} style={{ width:"4px", height:"4px", borderRadius:"50%", background: MEAL_COLORS[m] || "#c9956a" }} />
                  ))}
                </div>
              )}
              {inOtherGroup && !fd.isPast && (
                <div style={{
                  position:"absolute", top:"3px", right:"3px",
                  width:"6px", height:"6px", borderRadius:"50%",
                  background:"#9b7ec8",
                  border: sel ? "1px solid #2a2a2a" : "1px solid rgba(155,126,200,0.4)",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Per-date meal type picker */}
      {expandedDate && (
        <div style={{
          background:"rgba(201,149,106,0.08)", border:"1px solid rgba(201,149,106,0.2)",
          borderRadius:"12px", padding:"12px 14px", marginBottom:"6px",
        }}>
          <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"1px", marginBottom:"10px" }}>
            {new Date(expandedDate + "T12:00:00").toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })} — pick meal types:
          </div>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            {["Breakfast","Brunch","Lunch","Dinner"].map(meal => {
              const active = getMealsForDate(selectedArr, expandedDate).includes(meal);
              return (
                <div key={meal} onClick={(e) => { e.stopPropagation(); toggleMealForDate(expandedDate, meal); }}
                  style={{
                    ...chip(active),
                    display:"flex", alignItems:"center", gap:"5px",
                  }}>
                  <MealIcon type={meal} size={13} color={active ? "#1a0f0a" : "#c9956a"} /> {meal}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize:"10px", color:"#5a3a25", fontStyle:"italic", marginTop:"8px" }}>
            Tap a meal to toggle. Removing all meals removes the date.
          </div>
        </div>
      )}

      {otherGroupDates.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"10px", fontSize:"10px", color:"#8c8278" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#9b7ec8", flexShrink:0 }} />
          Available in another club
        </div>
      )}

      {/* Legend */}
      {uniqueSelectedDates.length > 0 && (
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"10px", fontSize:"10px", color:"#8c8278" }}>
          {Object.entries(MEAL_COLORS).map(([meal, color]) => (
            <div key={meal} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background: color }} />
              {meal}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// ── MealTypeSelector (kept for settings) ──
export const MealTypeSelector = ({ selected, onToggle, label = "Meal Type" }: {
  selected: string[];
  onToggle: (type: string) => void;
  label?: string;
}) => (
  <div style={{ marginBottom:"18px" }}>
    <label style={S.label}>{label}</label>
    <div style={{ display:"flex", gap:"8px" }}>
      {MEAL_TYPES.map(t => (
        <div key={t} style={chip(selected.includes(t))} onClick={() => onToggle(t)}>
          {t}
        </div>
      ))}
    </div>
  </div>
);
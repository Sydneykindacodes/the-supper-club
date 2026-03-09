import { useState, type CSSProperties } from "react";
import { Restaurant, getRatingInfo, MEAL_TYPES, PRICE_LABELS } from "@/data/supper-club-data";
import { S, chip } from "./styles";

// ── Minimal SVG social icons ──
const SocialIcon = ({ type }: { type: string }) => {
  const s: CSSProperties = { width: 22, height: 22, display: "block" };
  const c = "rgba(201,149,106,0.85)";
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
    <div style={{ fontSize: "11px", color: "#c9956a", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px", textAlign: "center" }}>
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
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,149,106,0.08)",
            minWidth: "52px", transition: "all 0.2s",
          }}
        >
          <SocialIcon type={name} />
          <span style={{ fontSize: "8px", color: "#5a3a25", letterSpacing: "1px", textTransform: "uppercase" }}>{name}</span>
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
        border:value>=n?"none":"1.5px solid #5a3a25",
        background:value>=n?"#c9956a":"transparent",
        cursor:onChange?"pointer":"default", flexShrink:0, transition:"all 0.15s",
      }}/>
    ))}
    {!small && value>0 && <span style={{ fontSize:"12px", color:"#9a7a60", fontStyle:"italic" }}>{["","Poor","Fair","Good","Great","Exceptional"][value]}</span>}
  </div>
);

// ── Toggle ──
export const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid rgba(201,149,106,0.07)" }}>
    <span style={{ fontSize:"14px", color:"#f5e6d3" }}>{label}</span>
    <div onClick={onToggle} style={{ width:"44px", height:"24px", borderRadius:"12px", background:on?"linear-gradient(135deg,#c9956a,#9a6040)":"rgba(255,255,255,0.08)", border:on?"none":"1px solid rgba(201,149,106,0.2)", position:"relative", cursor:"pointer", transition:"all 0.2s" }}>
      <div style={{ position:"absolute", top:"3px", left:on?"22px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:on?"#1a0f0a":"#5a3a25", transition:"left 0.2s" }}/>
    </div>
  </div>
);

// ── PriceTag ──
export const PriceTag = ({ price }: { price: number }) => (
  <span style={{ fontSize:"12px", color:"#c9956a", letterSpacing:"1px" }}>
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
        style={{ fontSize:"9px", fontWeight:"700", letterSpacing:"0.5px", color:"#1a0f0a", background: info.source==="SC" ? "#c9956a" : "#7a9e7e", borderRadius:"4px", padding:"2px 5px", cursor:"pointer", userSelect:"none" }}
      >{info.source}</span>
      {showTip && (
        <div onClick={() => setShowTip(false)} style={{ position:"absolute", bottom:"calc(100% + 8px)", right:0, background:"#2d1208", border:"1px solid rgba(201,149,106,0.3)", borderRadius:"10px", padding:"10px 12px", fontSize:"11px", color:"#f5e6d3", whiteSpace:"nowrap", zIndex:50, lineHeight:"1.5", boxShadow:"0 4px 20px rgba(0,0,0,0.6)" }}>
          {info.tip}
          <div style={{ fontSize:"10px", color:"#7a5a40", marginTop:"4px" }}>Tap to dismiss</div>
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
  maxGroups = 15,
}: {
  groups: { id: number; name: string }[];
  activeGroup: { id: number; name: string };
  setActiveGroup: (g: any) => void;
  onNewClub: () => void;
  onJoinClub: () => void;
  maxGroups?: number;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div style={{ padding: "12px 0 0", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "0 16px", overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", msOverflowStyle: "none" }}>
        {groups.map(g => {
          const active = g.id === activeGroup.id;
          return (
            <div key={g.id} onClick={() => setActiveGroup(g)}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: "16px", cursor: "pointer",
                background: active ? "linear-gradient(135deg,rgba(201,149,106,0.2),rgba(201,149,106,0.08))" : "rgba(255,255,255,0.02)",
                border: active ? "1px solid rgba(201,149,106,0.4)" : "1px solid rgba(201,149,106,0.08)",
                transition: "all 0.2s",
              }}>
              <div style={{ fontSize: "11px", fontWeight: active ? "600" : "400", color: active ? "#f5e6d3" : "#5a3a25", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{g.name}</div>
            </div>
          );
        })}
        {groups.length < maxGroups && (
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(p => !p)}
              style={{
                flexShrink: 0, padding: "8px 12px", borderRadius: "16px", cursor: "pointer",
                background: showMenu ? "rgba(201,149,106,0.1)" : "transparent",
                border: "1px dashed rgba(201,149,106,0.2)", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "5px",
              }}>
              <span style={{ fontSize: "12px", color: "#c9956a", lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "10px", color: "#7a5a40", whiteSpace: "nowrap" }}>New</span>
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
            background: "#2d1208", border: "1px solid rgba(201,149,106,0.3)",
            borderRadius: "12px", padding: "6px", minWidth: "160px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            <div onClick={() => { setShowMenu(false); onNewClub(); }}
              style={{
                padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,149,106,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: "13px", color: "#f5e6d3", marginBottom: "2px" }}>Create a Club</div>
              <div style={{ fontSize: "10px", color: "#7a5a40" }}>Start a new dining circle</div>
            </div>
            <div onClick={() => { setShowMenu(false); onJoinClub(); }}
              style={{
                padding: "10px 14px", borderRadius: "8px", cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(201,149,106,0.1)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ fontSize: "13px", color: "#f5e6d3", marginBottom: "2px" }}>Join with Code</div>
              <div style={{ fontSize: "10px", color: "#7a5a40" }}>Enter an invite code</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
// ── NavBar ──
export const NavBar = ({ activeTab, onNavigate }: { activeTab: string; onNavigate: (tab: string, screen: string) => void }) => (
  <div style={S.bottomNav}>
    {[
      { id:"home",        label:"Home",    glyph:"⌂",  screen:"club_home" },
      { id:"explore",     label:"Explore", glyph:"◉",  screen:"explore" },
      { id:"schedule",    label:"Dates",   glyph:"◫",  screen:"availability" },
      { id:"reveal",      label:"Reveal",  glyph:"◎",  screen:"reveal" },
      { id:"badges",      label:"Badges",  glyph:"◈",  screen:"badges" },
    ].map(item => (
      <div key={item.id} style={S.navItem} onClick={() => onNavigate(item.id, item.screen)}>
        <span style={{ fontSize:"20px", color:activeTab===item.id?"#c9956a":"#3d2010" }}>{item.glyph}</span>
        <span style={{ fontSize:"9px", letterSpacing:"1.5px", textTransform:"uppercase", color:activeTab===item.id?"#c9956a":"#4a2e18" }}>{item.label}</span>
      </div>
    ))}
  </div>
);

// ── CalendarGrid ──
export const CalendarGrid = ({ selectedArr, setArr, weeks = 3, cutoffDays, showToast }: {
  selectedArr: string[];
  setArr: React.Dispatch<React.SetStateAction<string[]>>;
  weeks?: number;
  cutoffDays: number;
  showToast: (msg: string) => void;
}) => {
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

  const toggleDate = (key: string, isPast: boolean) => {
    if (isPast) { showToast("Cutoff has passed for this date."); return; }
    setArr(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key]);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px", marginBottom:"20px" }}>
      {dates.map(d => {
        const fd = formatDate(d);
        const key = d.toISOString().split("T")[0];
        const sel = selectedArr.includes(key);
        return (
          <div key={key} onClick={() => toggleDate(key, fd.isPast)} style={{
            borderRadius:"10px", padding:"8px 4px", textAlign:"center",
            cursor:fd.isPast?"not-allowed":"pointer",
            background:sel?"linear-gradient(135deg,#c9956a,#9a6040)":fd.isPast?"rgba(255,255,255,0.01)":"rgba(255,255,255,0.03)",
            border:sel?"none":`1px solid rgba(201,149,106,${fd.isPast?"0.04":"0.1"})`,
            opacity:fd.isPast?0.3:1, transition:"all 0.15s",
          }}>
            <div style={{ fontSize:"9px", color:sel?"#1a0f0a":"#7a5a40", marginBottom:"2px" }}>{fd.day}</div>
            <div style={{ fontSize:"15px", fontWeight:"700", color:sel?"#1a0f0a":"#f5e6d3" }}>{fd.date}</div>
            <div style={{ fontSize:"8px", color:sel?"#1a0f0a":"#4a2e18" }}>{fd.month}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── MealTypeSelector ──
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

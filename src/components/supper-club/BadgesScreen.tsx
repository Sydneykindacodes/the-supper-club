import { S } from "./styles";
import { NavBar } from "./shared";
import type { DBBadge } from "@/hooks/useSupperClubData";
import { GROUP_BADGE_DEFS, BADGE_ICONS } from "./badgeDefs";

interface BadgesScreenProps {
  userBadges: DBBadge[];
  activeGroupId: string | null;
  activeTab: string;
  onNavigate: (tab: string, screen: string) => void;
  groupName?: string;
}

export default function BadgesScreen({ userBadges, activeGroupId, activeTab, onNavigate, groupName }: BadgesScreenProps) {
  const earnedKeys = new Set(userBadges.map(b => b.badge_key));
  const defs = GROUP_BADGE_DEFS;
  const earned = defs.filter(d => earnedKeys.has(d.key)).length;

  return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ fontSize:"11px", color:"#d4cdc4", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"4px" }}>{groupName || "The Supper Club Social"}</div>
          <div style={{ fontSize:"30px", color:"#e5ded5", fontWeight:"400" }}>Group Badges</div>
        </div>
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ marginBottom:"16px" }}>
            <div style={{ fontSize:"13px", color:"#8c8278", fontStyle:"italic" }}>{earned} group badge{earned !== 1 ? "s" : ""} earned</div>
            <div style={{ fontSize:"11px", color:"#565250", marginTop:"4px" }}>Achievements unlocked together as a club. Individual badges are on your profile.</div>
          </div>
          {defs.map(badge => {
            const isEarned = earnedKeys.has(badge.key);
            const earnedBadge = userBadges.find(b => b.badge_key === badge.key);
            return (
              <div key={badge.key} style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px 0", borderBottom:"1px solid rgba(212,205,196,0.07)", opacity:isEarned?1:0.4 }}>
                <div style={{ ...S.badgeSymbol, background:isEarned?"linear-gradient(135deg,rgba(212,205,196,0.15),rgba(212,205,196,0.06))":"rgba(255,255,255,0.02)", border:isEarned?"1px solid rgba(212,205,196,0.35)":"1px solid rgba(212,205,196,0.1)", color:isEarned?"#ffffff":"#383838" }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.key] || "" }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"14px", color:isEarned?"#e5ded5":"#565250", fontWeight:"500", marginBottom:"2px" }}>{badge.name}</div>
                  <div style={{ fontSize:"12px", color:isEarned?"#8c8278":"#383838", lineHeight:"1.4" }}>{badge.desc}</div>
                  {isEarned && earnedBadge && <div style={{ fontSize:"10px", color:"#565250", marginTop:"3px" }}>Earned {new Date(earnedBadge.earned_at).toLocaleDateString("en-US", { month:"short", year:"numeric" })}</div>}
                </div>
                {isEarned && <div style={{ fontSize:"14px", color:"#d4cdc4" }}>*</div>}
              </div>
            );
          })}
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate} />
    </div></div>
  );
}
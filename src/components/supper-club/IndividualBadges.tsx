import { S } from "./styles";
import { INDIVIDUAL_BADGE_DEFS, BADGE_ICONS } from "./badgeDefs";

interface BadgeData { badge_key: string; earned_at: string; }
interface IndividualBadgesProps { badges: BadgeData[]; isOwnProfile?: boolean; displayName?: string; }

export default function IndividualBadges({ badges, isOwnProfile, displayName }: IndividualBadgesProps) {
  const earnedKeys = new Set(badges.map(b => b.badge_key));
  const earned = INDIVIDUAL_BADGE_DEFS.filter(d => earnedKeys.has(d.key)).length;
  if (earned === 0 && !isOwnProfile) return null;

  return (
    <div style={{ marginTop:"24px" }}>
      <div style={{ fontSize:"11px", color:"#d4cdc4", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"4px" }}>{isOwnProfile ? "Your Badges" : `${displayName || "Member"}'s Badges`}</div>
      <div style={{ fontSize:"12px", color:"#565250", marginBottom:"14px" }}>{earned} badge{earned !== 1 ? "s" : ""} earned</div>
      {INDIVIDUAL_BADGE_DEFS.map(badge => {
        const isEarned = earnedKeys.has(badge.key);
        const earnedBadge = badges.find(b => b.badge_key === badge.key);
        if (!isEarned && !isOwnProfile) return null;
        return (
          <div key={badge.key} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"10px 0", borderBottom:"1px solid rgba(212,205,196,0.07)", opacity:isEarned?1:0.35 }}>
            <div style={{ ...S.badgeSymbol, width:"36px", height:"36px", background:isEarned?"linear-gradient(135deg,rgba(212,205,196,0.15),rgba(212,205,196,0.06))":"rgba(255,255,255,0.02)", border:isEarned?"1px solid rgba(212,205,196,0.35)":"1px solid rgba(212,205,196,0.1)", color:isEarned?"#ffffff":"#383838" }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.key] || "" }} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"13px", color:isEarned?"#e5ded5":"#565250", fontWeight:"500" }}>{badge.name}</div>
              <div style={{ fontSize:"11px", color:isEarned?"#8c8278":"#383838", lineHeight:"1.4" }}>{badge.desc}</div>
              {isEarned && earnedBadge && <div style={{ fontSize:"10px", color:"#565250", marginTop:"2px" }}>{new Date(earnedBadge.earned_at).toLocaleDateString("en-US", { month:"short", year:"numeric" })}</div>}
            </div>
            {isEarned && <div style={{ fontSize:"12px", color:"#d4cdc4" }}>✦</div>}
          </div>
        );
      })}
    </div>
  );
}
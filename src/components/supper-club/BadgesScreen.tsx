import { S, tabPill } from "./styles";
import { NavBar } from "./shared";
import type { DBBadge } from "@/hooks/useSupperClubData";
import { useState } from "react";

// Badge definitions with keys matching DB badge_key
const BADGE_DEFS = {
  individual: [
    { key: "first_supper", symbol: "I", name: "First Supper", desc: "Attended your first club dinner" },
    { key: "first_review", symbol: "II", name: "Critic's Eye", desc: "Submitted your first review" },
    { key: "five_reviews", symbol: "III", name: "Seasoned Critic", desc: "Submitted 5 detailed reviews" },
    { key: "ten_restaurants", symbol: "IV", name: "Connoisseur", desc: "Dined at 10 different restaurants" },
    { key: "five_streak", symbol: "V", name: "On a Roll", desc: "Attended 5 dinners in a row" },
    { key: "first_photo", symbol: "VI", name: "Food Photographer", desc: "Submitted your first food photo" },
    { key: "ten_photos", symbol: "VII", name: "Gallery Curator", desc: "Submitted 10 food photos" },
    { key: "first_host", symbol: "VIII", name: "Host Debut", desc: "Hosted your first dinner" },
    { key: "three_hosts", symbol: "IX", name: "Seasoned Host", desc: "Hosted 3 dinners" },
    { key: "best_dish", symbol: "X", name: "Best Dish", desc: "Voted best dish of the evening" },
    { key: "three_best_dish", symbol: "XI", name: "Top Palate", desc: "Won best dish 3 times" },
    { key: "early_bird", symbol: "XII", name: "Early Bird", desc: "First to submit availability" },
  ],
  group: [
    { key: "group_first_dinner", symbol: "I", name: "Inaugural Supper", desc: "Completed your group's first dinner" },
    { key: "group_five_dinners", symbol: "II", name: "Regulars", desc: "Completed 5 group dinners" },
    { key: "group_ten_dinners", symbol: "III", name: "Institution", desc: "Completed 10 group dinners" },
    { key: "group_five_cuisines", symbol: "IV", name: "World Tour", desc: "Visited 5 different cuisines as a group" },
    { key: "group_full_attendance", symbol: "V", name: "Full House", desc: "Full attendance at a dinner" },
    { key: "group_all_reviewed", symbol: "VI", name: "Critics Circle", desc: "Every member reviewed the same dinner" },
  ],
};

interface BadgesScreenProps {
  userBadges: DBBadge[];
  activeGroupId: string | null;
  activeTab: string;
  onNavigate: (tab: string, screen: string) => void;
  groupName?: string;
}

export default function BadgesScreen({ userBadges, activeGroupId, activeTab, onNavigate, groupName }: BadgesScreenProps) {
  const [tab, setTab] = useState<"individual" | "group">("individual");

  const earnedKeys = new Set(userBadges.map(b => b.badge_key));
  const defs = tab === "individual" ? BADGE_DEFS.individual : BADGE_DEFS.group;
  const earned = defs.filter(d => earnedKeys.has(d.key)).length;

  return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ fontSize: "11px", color: "#c9956a", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "4px" }}>
            {groupName || "The Supper Club"}
          </div>
          <div style={{ fontSize: "30px", color: "#f5e6d3", fontWeight: "400" }}>Badges</div>
        </div>

        <div style={{ display: "flex", gap: "4px", margin: "16px 16px 0", padding: "4px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(201,149,106,0.08)" }}>
          <div style={{ ...tabPill(tab === "individual"), flex: 1 }} onClick={() => setTab("individual")}>Individual</div>
          <div style={{ ...tabPill(tab === "group"), flex: 1 }} onClick={() => setTab("group")}>Group</div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", color: "#7a5a40", fontStyle: "italic" }}>
              {earned} of {defs.length} earned
            </div>
            <div style={{
              background: "rgba(201,149,106,0.1)",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "12px",
              color: "#c9956a",
              fontWeight: "600",
            }}>
              {Math.round((earned / defs.length) * 100)}%
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: "4px", background: "rgba(201,149,106,0.1)", borderRadius: "2px", marginBottom: "20px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(earned / defs.length) * 100}%`, background: "linear-gradient(135deg,#c9956a,#9a6040)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>

          {defs.map(badge => {
            const isEarned = earnedKeys.has(badge.key);
            const earnedBadge = userBadges.find(b => b.badge_key === badge.key);
            return (
              <div key={badge.key} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 0",
                borderBottom: "1px solid rgba(201,149,106,0.07)",
                opacity: isEarned ? 1 : 0.4,
              }}>
                <div style={{
                  ...S.badgeSymbol,
                  background: isEarned ? "linear-gradient(135deg,rgba(201,149,106,0.2),rgba(201,149,106,0.08))" : "rgba(255,255,255,0.02)",
                  border: isEarned ? "1px solid rgba(201,149,106,0.4)" : "1px solid rgba(201,149,106,0.1)",
                  color: isEarned ? "#c9956a" : "#3d2010",
                }}>
                  {badge.symbol}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: isEarned ? "#f5e6d3" : "#5a3a25", fontWeight: "500", marginBottom: "2px" }}>
                    {badge.name}
                  </div>
                  <div style={{ fontSize: "12px", color: isEarned ? "#7a5a40" : "#3d2010", lineHeight: "1.4" }}>
                    {badge.desc}
                  </div>
                  {isEarned && earnedBadge && (
                    <div style={{ fontSize: "10px", color: "#5a3a25", marginTop: "3px" }}>
                      Earned {new Date(earnedBadge.earned_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
                {isEarned && (
                  <div style={{ fontSize: "14px", color: "#c9956a" }}>*</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <NavBar activeTab={activeTab} onNavigate={onNavigate} />
    </div></div>
  );
}
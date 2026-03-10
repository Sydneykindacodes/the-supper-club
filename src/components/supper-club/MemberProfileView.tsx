import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { S } from "./styles";
import type { DBReview } from "@/hooks/useSupperClubData";
import IndividualBadges from "./IndividualBadges";

interface MemberProfileViewProps { userId: string; allReviews: DBReview[]; onClose: () => void; isOwnProfile?: boolean; }

export default function MemberProfileView({ userId, allReviews, onClose, isOwnProfile }: MemberProfileViewProps) {
  const [displayName, setDisplayName] = useState("...");
  const [avatarColor, setAvatarColor] = useState("#d4cdc4");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<{ badge_key: string; earned_at: string }[]>([]);

  useEffect(() => {
    const loadProfile = supabase.from("profiles").select("display_name, avatar_color, avatar_url, bio, city").eq("id", userId).maybeSingle();
    const loadBadges = supabase.from("user_badges").select("badge_key, earned_at").eq("user_id", userId).eq("badge_type", "individual");
    Promise.all([loadProfile, loadBadges]).then(([profileRes, badgesRes]) => {
      if (profileRes.data) { setDisplayName(profileRes.data.display_name || "Member"); setAvatarColor(profileRes.data.avatar_color || "#d4cdc4"); setAvatarUrl(profileRes.data.avatar_url || null); setBio(profileRes.data.bio || ""); setCity(profileRes.data.city || ""); }
      if (badgesRes.data) setBadges(badgesRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  const userReviews = allReviews.filter(r => r.user_id === userId);
  const avgRating = userReviews.length > 0 ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1) : "—";
  const uniqueRestaurants = new Set(userReviews.map(r => r.restaurant_name)).size;

  if (loading) return (
    <div style={S.app}><div style={S.phone}><div style={S.screen}>
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#d4cdc4", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
          <div style={S.headerEye}>Profile</div>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"center", padding:"60px" }}>
        <div style={{ width:"24px", height:"24px", border:"2px solid rgba(212,205,196,0.3)", borderTop:"2px solid #d4cdc4", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
      </div>
    </div></div></div>
  );

  return (
    <div style={S.app}><div style={S.phone}><div style={S.screen}>
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#d4cdc4", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
          <div style={S.headerEye}>{isOwnProfile ? "Your Profile" : "Member Profile"}</div>
        </div>
        <div style={S.headerTitle}>{displayName}</div>
      </div>
      <div style={{ padding:"24px 16px 0" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"20px" }}>
          <div style={{ width:"96px", height:"96px", borderRadius:"50%", background:avatarUrl?`url(${avatarUrl}) center/cover no-repeat`:avatarColor, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"32px", color:"#fff", fontWeight:"700", border:"3px solid rgba(212,205,196,0.25)", boxShadow:"0 4px 24px rgba(0,0,0,0.4)", overflow:"hidden" }}>{!avatarUrl && displayName.charAt(0).toUpperCase()}</div>
        </div>
        <div style={{ textAlign:"center", marginBottom:"24px" }}>
          <div style={{ fontSize:"22px", color:"#e5ded5", fontWeight:"500", marginBottom:"4px" }}>{displayName}</div>
          {city && <div style={{ fontSize:"13px", color:"#8c8278", marginBottom:"8px" }}>📍 {city}</div>}
          {bio ? <div style={{ fontSize:"14px", color:"#8c8278", fontStyle:"italic", lineHeight:"1.6", maxWidth:"280px", margin:"0 auto" }}>"{bio}"</div> : <div style={{ fontSize:"13px", color:"#3d3d3d", fontStyle:"italic" }}>No bio yet</div>}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:"32px", marginBottom:"24px", padding:"16px 0", borderTop:"1px solid rgba(212,205,196,0.08)", borderBottom:"1px solid rgba(212,205,196,0.08)" }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:"20px", color:"#e5ded5", fontWeight:"600" }}>{userReviews.length}</div><div style={{ fontSize:"10px", color:"#8c8278", letterSpacing:"1px", textTransform:"uppercase" }}>Reviews</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:"20px", color:"#e5ded5", fontWeight:"600" }}>{uniqueRestaurants}</div><div style={{ fontSize:"10px", color:"#8c8278", letterSpacing:"1px", textTransform:"uppercase" }}>Restaurants</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:"20px", color:"#e5ded5", fontWeight:"600" }}>{avgRating}</div><div style={{ fontSize:"10px", color:"#8c8278", letterSpacing:"1px", textTransform:"uppercase" }}>Avg Rating</div></div>
        </div>
        <IndividualBadges badges={badges} isOwnProfile={isOwnProfile} displayName={displayName} />
        <div style={{ marginTop:"24px" }}>
          <div style={{ fontSize:"11px", color:"#d4cdc4", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>{isOwnProfile ? "Your Reviews" : `${displayName}'s Reviews`}</div>
          {userReviews.length === 0 ? (
            <div style={{ textAlign:"center", padding:"32px 16px" }}>
              <div style={{ fontSize:"20px", color:"#3d3d3d", marginBottom:"8px" }}>◈</div>
              <div style={{ fontSize:"13px", color:"#8c8278", fontStyle:"italic" }}>No reviews yet.</div>
            </div>
          ) : userReviews.map(rev => (
            <div key={rev.id} style={{ ...S.card, margin:"0 0 10px", padding:0, overflow:"hidden" }}>
              {rev.photo_url && <div style={{ width:"100%", height:"120px", overflow:"hidden" }}><img src={rev.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy" /></div>}
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                  <div style={{ fontSize:"15px", color:"#e5ded5", fontWeight:"500" }}>{rev.restaurant_name}</div>
                  <div style={{ display:"flex", gap:"2px" }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:"12px", color:s<=rev.rating?"#d4cdc4":"#383838" }}>★</span>)}</div>
                </div>
                <div style={{ fontSize:"11px", color:"#8c8278", marginBottom:"6px" }}>{rev.cuisine ? `${rev.cuisine} · ` : ""}{rev.city || "Unknown"} · {new Date(rev.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}</div>
                {rev.review_text && <div style={{ fontSize:"13px", color:"#8c8278", fontStyle:"italic", lineHeight:"1.5" }}>"{rev.review_text.length > 100 ? rev.review_text.slice(0, 100) + "..." : rev.review_text}"</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div></div></div>
  );
}
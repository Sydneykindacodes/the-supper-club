import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { S, chip } from "./styles";
import type { User } from "@supabase/supabase-js";
import type { DBReview, DBBadge } from "@/hooks/useSupperClubData";
import IndividualBadges from "./IndividualBadges";

const AVATAR_COLORS = [
  "#c9956a", "#7a9e7e", "#9b7ec8", "#c45c5c", "#4a8bc2", "#c4a35c",
  "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f",
];

interface ProfileScreenProps {
  user: User;
  userReviews: DBReview[];
  onClose: () => void;
  showToast: (msg: string) => void;
  signOut: () => Promise<void>;
}

export default function ProfileScreen({ user, userReviews, onClose, showToast, signOut }: ProfileScreenProps) {
  const currentName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || "";
  const [displayName, setDisplayName] = useState(currentName);
  const [avatarColor, setAvatarColor] = useState(user.user_metadata?.avatar_color || "#c9956a");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from DB
  useEffect(() => {
    supabase.from("profiles").select("bio, city, avatar_url, avatar_color, display_name").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setBio(data.bio || "");
        setCity(data.city || "");
        setAvatarUrl(data.avatar_url || null);
        if (data.avatar_color) setAvatarColor(data.avatar_color);
        if (data.display_name) setDisplayName(data.display_name);
      }
    });
  }, [user.id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Photo must be under 5MB."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("review-photos").upload(path, file, { upsert: true });
    if (error) { showToast("Upload failed."); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("review-photos").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setAvatarUrl(url);
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploading(false);
    showToast("Photo updated!");
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.auth.updateUser({ data: { display_name: displayName, avatar_color: avatarColor } });
    await supabase.from("profiles").update({ display_name: displayName, avatar_color: avatarColor, bio, city, avatar_url: avatarUrl }).eq("id", user.id);
    await supabase.from("members").update({ name: displayName, avatar_color: avatarColor }).eq("user_id", user.id);
    setSaving(false);
    showToast("Profile updated!");
    setEditing(false);
  };

  const reviewCities = [...new Set(userReviews.map(r => r.city || "Unknown"))];
  const filteredReviews = reviewFilter === "all" ? userReviews : userReviews.filter(r => (r.city || "Unknown") === reviewFilter);

  return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#c9956a", fontSize:"18px", cursor:"pointer", padding:0 }}>←</button>
            <div style={S.headerEye}>Profile</div>
          </div>
          <div style={S.headerTitle}>{displayName}</div>
        </div>

        <div style={{ padding:"24px 16px 0" }}>
          {/* Avatar */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"20px" }}>
            <div style={{ position:"relative" }}>
              <div
                onClick={() => editing && fileInputRef.current?.click()}
                style={{
                  width:"96px", height:"96px", borderRadius:"50%",
                  background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : avatarColor,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:"32px", color:"#fff", fontWeight:"700",
                  border:"3px solid rgba(201,149,106,0.3)",
                  boxShadow:"0 4px 24px rgba(0,0,0,0.4)",
                  cursor: editing ? "pointer" : "default",
                  overflow:"hidden",
                }}
              >
                {!avatarUrl && displayName.charAt(0).toUpperCase()}
                {uploading && (
                  <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%" }}>
                    <div style={{ width:"20px", height:"20px", border:"2px solid rgba(201,149,106,0.3)", borderTop:"2px solid #c9956a", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
                  </div>
                )}
              </div>
              {editing && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ position:"absolute", bottom:0, right:0, width:"28px", height:"28px", borderRadius:"50%", background:"#c9956a", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:"2px solid #1a0f0a", fontSize:"14px", color:"#1a0f0a", fontWeight:"700" }}
                >+</div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload} />
            </div>
          </div>

          {!editing ? (
            /* ── View Mode ── */
            <>
              <div style={{ textAlign:"center", marginBottom:"24px" }}>
                <div style={{ fontSize:"22px", color:"#f5e6d3", fontWeight:"500", marginBottom:"4px" }}>{displayName}</div>
                {city && <div style={{ fontSize:"13px", color:"#7a5a40", marginBottom:"8px" }}>📍 {city}</div>}
                {bio ? (
                  <div style={{ fontSize:"14px", color:"#9a7a60", fontStyle:"italic", lineHeight:"1.6", maxWidth:"280px", margin:"0 auto" }}>"{bio}"</div>
                ) : (
                  <div style={{ fontSize:"13px", color:"#4a2e18", fontStyle:"italic" }}>No bio yet</div>
                )}
              </div>

              {/* Stats Row */}
              <div style={{ display:"flex", justifyContent:"center", gap:"32px", marginBottom:"24px", padding:"16px 0", borderTop:"1px solid rgba(201,149,106,0.08)", borderBottom:"1px solid rgba(201,149,106,0.08)" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"20px", color:"#f5e6d3", fontWeight:"600" }}>{userReviews.length}</div>
                  <div style={{ fontSize:"10px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase" }}>Reviews</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"20px", color:"#f5e6d3", fontWeight:"600" }}>{[...new Set(userReviews.map(r => r.restaurant_name))].length}</div>
                  <div style={{ fontSize:"10px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase" }}>Restaurants</div>
                </div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"20px", color:"#f5e6d3", fontWeight:"600" }}>{userReviews.length > 0 ? (userReviews.reduce((s, r) => s + r.rating, 0) / userReviews.length).toFixed(1) : "—"}</div>
                  <div style={{ fontSize:"10px", color:"#7a5a40", letterSpacing:"1px", textTransform:"uppercase" }}>Avg Rating</div>
                </div>
              </div>

              <button style={S.ghostBtn} onClick={() => setEditing(true)}>Edit Profile</button>

              {/* Reviews Section */}
              <div style={{ marginTop:"24px" }}>
                <div style={{ fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase", marginBottom:"12px" }}>Your Reviews</div>

                {reviewCities.length > 1 && (
                  <div style={{ display:"flex", gap:"6px", marginBottom:"14px", flexWrap:"wrap" }}>
                    <div style={chip(reviewFilter === "all")} onClick={() => setReviewFilter("all")}>All</div>
                    {reviewCities.map(c => (
                      <div key={c} style={chip(reviewFilter === c)} onClick={() => setReviewFilter(c)}>{c}</div>
                    ))}
                  </div>
                )}

                {filteredReviews.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"32px 16px" }}>
                    <div style={{ fontSize:"20px", color:"#4a2e18", marginBottom:"8px" }}>◈</div>
                    <div style={{ fontSize:"13px", color:"#7a5a40", fontStyle:"italic" }}>No reviews yet. Your culinary critiques will appear here.</div>
                  </div>
                ) : (
                  filteredReviews.map(rev => (
                    <div key={rev.id} style={{ ...S.card, margin:"0 0 10px", padding:0, overflow:"hidden" }}>
                      {rev.photo_url && (
                        <div style={{ width:"100%", height:"120px", overflow:"hidden" }}>
                          <img src={rev.photo_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy" />
                        </div>
                      )}
                      <div style={{ padding:"14px 16px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                          <div style={{ fontSize:"15px", color:"#f5e6d3", fontWeight:"500" }}>{rev.restaurant_name}</div>
                          <div style={{ display:"flex", gap:"2px" }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ fontSize:"12px", color: s <= rev.rating ? "#c9956a" : "#3d2010" }}>★</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize:"11px", color:"#7a5a40", marginBottom:"6px" }}>
                          {rev.cuisine ? `${rev.cuisine} · ` : ""}{rev.city || "Unknown"} · {new Date(rev.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                        </div>
                        {rev.review_text && (
                          <div style={{ fontSize:"13px", color:"#9a7a60", fontStyle:"italic", lineHeight:"1.5" }}>
                            "{rev.review_text.length > 100 ? rev.review_text.slice(0, 100) + "..." : rev.review_text}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sign Out */}
              <div style={{ marginTop:"32px", paddingBottom:"24px" }}>
                <button style={{ ...S.ghostBtn, color:"#c45c5c", borderColor:"rgba(197,92,92,0.3)" }} onClick={signOut}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            /* ── Edit Mode ── */
            <>
              {/* Avatar Color */}
              {!avatarUrl && (
                <div style={{ marginBottom:"20px" }}>
                  <label style={S.label}>Avatar Color</label>
                  <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
                    {AVATAR_COLORS.map(c => (
                      <div key={c} onClick={() => setAvatarColor(c)} style={{
                        width:"32px", height:"32px", borderRadius:"50%", background:c, cursor:"pointer",
                        border: avatarColor === c ? "3px solid #f5e6d3" : "2px solid rgba(201,149,106,0.15)",
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>First Name</label>
                <input style={S.input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>

              <div style={{ marginBottom:"16px" }}>
                <label style={S.label}>City / Location</label>
                <input style={S.input} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. New York, NY" />
              </div>

              <div style={{ marginBottom:"20px" }}>
                <label style={S.label}>Bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell us about your taste in food..."
                  maxLength={200}
                  style={{
                    ...S.input,
                    minHeight:"80px", resize:"vertical" as any,
                    fontFamily:"'Georgia',serif",
                  }}
                />
                <div style={{ fontSize:"10px", color:"#5a3a25", textAlign:"right", marginTop:"-8px" }}>{bio.length}/200</div>
              </div>

              <button style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button style={S.ghostBtn} onClick={() => setEditing(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>
    </div></div>
  );
}

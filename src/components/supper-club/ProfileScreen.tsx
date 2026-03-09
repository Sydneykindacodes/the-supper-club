import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { S, chip } from "./styles";
import type { User } from "@supabase/supabase-js";

const AVATAR_COLORS = [
  "#c9956a", "#7a9e7e", "#9b7ec8", "#c45c5c", "#4a8bc2", "#c4a35c",
  "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f",
];

interface ProfileScreenProps {
  user: User;
  onClose: () => void;
  showToast: (msg: string) => void;
  signOut: () => Promise<void>;
}

export default function ProfileScreen({ user, onClose, showToast, signOut }: ProfileScreenProps) {
  const currentName = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email || "";
  const [displayName, setDisplayName] = useState(currentName);
  const [avatarColor, setAvatarColor] = useState(user.user_metadata?.avatar_color || "#c9956a");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Update auth user metadata
    const { error: authErr } = await supabase.auth.updateUser({
      data: { display_name: displayName, avatar_color: avatarColor },
    });

    // Update profile table
    await supabase.from("profiles").update({
      display_name: displayName,
      avatar_color: avatarColor,
    }).eq("id", user.id);

    // Update all member records for this user
    await supabase.from("members").update({
      name: displayName,
      avatar_color: avatarColor,
    }).eq("user_id", user.id);

    setSaving(false);
    if (authErr) {
      showToast("Failed to update profile.");
    } else {
      showToast("Profile updated. Changes may appear on next login.");
      onClose();
    }
  };

  return (
    <div style={S.app}><div style={S.phone}>
      <div style={S.screen}>
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#c9956a", fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
            <div style={{ fontSize: "11px", color: "#c9956a", letterSpacing: "3px", textTransform: "uppercase" }}>Account</div>
          </div>
          <div style={{ fontSize: "30px", color: "#f5e6d3", fontWeight: "400" }}>Profile</div>
        </div>

        <div style={{ padding: "24px 16px 0" }}>
          {/* Avatar Preview */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              background: avatarColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px", color: "#fff", fontWeight: "700",
              border: "3px solid rgba(201,149,106,0.3)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Display Name */}
          <div style={{ marginBottom: "24px" }}>
            <label style={S.label}>Display Name</label>
            <input
              style={S.input}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Avatar Color */}
          <div style={{ marginBottom: "24px" }}>
            <label style={S.label}>Avatar Color</label>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: c, cursor: "pointer",
                    border: avatarColor === c ? "3px solid #f5e6d3" : "2px solid rgba(201,149,106,0.15)",
                    transition: "all 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Email (read-only) */}
          <div style={{ marginBottom: "24px" }}>
            <label style={S.label}>Email</label>
            <div style={{ fontSize: "14px", color: "#7a5a40", padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(201,149,106,0.1)" }}>
              {user.email}
            </div>
          </div>

          <button style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>

          <div style={{ height: "24px" }} />

          <button style={{ ...S.ghostBtn, color: "#c45c5c", borderColor: "rgba(197,92,92,0.3)" }} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>
    </div></div>
  );
}
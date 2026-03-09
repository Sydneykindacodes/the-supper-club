import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { S } from "./styles";

interface NotificationConsentProps {
  userId: string;
  onComplete: () => void;
}

export default function NotificationConsent({ userId, onComplete }: NotificationConsentProps) {
  const [phone, setPhone] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setSaving(true);
    setError(null);

    // Basic phone validation if provided
    const trimmedPhone = phone.trim();
    if (smsEnabled && !trimmedPhone) {
      setError("Please enter a phone number for SMS notifications.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        phone: trimmedPhone || null,
        sms_enabled: smsEnabled && !!trimmedPhone,
        push_enabled: pushEnabled,
      })
      .eq("id", userId);

    if (updateError) {
      setError("Something went wrong. Try again.");
      setSaving(false);
      return;
    }

    localStorage.setItem("sc_notif_consent", "1");
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem("sc_notif_consent", "1");
    onComplete();
  };

  return (
    <div style={S.app}>
      <div style={S.phone}>
        <div style={{
          ...S.welcomeBg,
          justifyContent: "space-between",
          paddingTop: "64px",
          paddingBottom: "48px",
        }}>
          <div style={S.orb} />

          {/* Top: skip */}
          <div style={{ width: "100%", zIndex: 1, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleSkip}
              style={{
                background: "none", border: "none", color: "#7a5a40",
                fontSize: "12px", letterSpacing: "1px", cursor: "pointer",
                fontFamily: "Georgia, serif", padding: "4px 8px",
              }}
            >
              Skip
            </button>
          </div>

          {/* Center: content */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", zIndex: 1,
            padding: "0 8px", width: "100%",
          }}>
            {/* Icon */}
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              background: "rgba(201,149,106,0.08)",
              border: "1px solid rgba(201,149,106,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "24px", color: "#c9956a",
              marginBottom: "28px",
            }}>
              ◎
            </div>

            <div style={{
              fontSize: "26px", color: "#f5e6d3", fontWeight: "400",
              lineHeight: "1.2", marginBottom: "10px",
            }}>
              Stay in the Loop
            </div>

            <div style={{
              fontSize: "14px", color: "#7a5a40", lineHeight: "1.8",
              fontStyle: "italic", maxWidth: "300px", marginBottom: "32px",
            }}>
              Get notified when it's your turn to host, when dates are picked, and when the restaurant is revealed.
            </div>

            {/* Phone input */}
            <div style={{ width: "100%", maxWidth: "300px", textAlign: "left" }}>
              <label style={S.label}>Phone Number</label>
              <input
                style={S.input}
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {/* SMS toggle */}
              <div
                onClick={() => setSmsEnabled(!smsEnabled)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 16px", marginBottom: "10px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(201,149,106,0.1)",
                  borderRadius: "12px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: smsEnabled ? "linear-gradient(135deg,#c9956a,#9a6040)" : "rgba(201,149,106,0.15)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: smsEnabled ? "#1a0f0a" : "#4a2e18",
                    position: "absolute", top: "2px",
                    left: smsEnabled ? "18px" : "2px",
                    transition: "left 0.2s",
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", color: "#f5e6d3", marginBottom: "2px" }}>SMS Notifications</div>
                  <div style={{ fontSize: "11px", color: "#7a5a40" }}>Texts for hosting duties & reveals</div>
                </div>
              </div>

              {/* Push toggle */}
              <div
                onClick={() => setPushEnabled(!pushEnabled)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "14px 16px", marginBottom: "16px",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(201,149,106,0.1)",
                  borderRadius: "12px", cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{
                  width: "36px", height: "20px", borderRadius: "10px",
                  background: pushEnabled ? "linear-gradient(135deg,#c9956a,#9a6040)" : "rgba(201,149,106,0.15)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}>
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "50%",
                    background: pushEnabled ? "#1a0f0a" : "#4a2e18",
                    position: "absolute", top: "2px",
                    left: pushEnabled ? "18px" : "2px",
                    transition: "left 0.2s",
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", color: "#f5e6d3", marginBottom: "2px" }}>Push Notifications</div>
                  <div style={{ fontSize: "11px", color: "#7a5a40" }}>In-app alerts & reminders</div>
                </div>
              </div>

              {/* Consent note */}
              <div style={{
                fontSize: "10px", color: "#4a2e18", lineHeight: "1.6",
                textAlign: "center", marginBottom: "20px", padding: "0 8px",
              }}>
                By continuing, you agree to receive SMS messages and push notifications from The Supper Club Social. Msg & data rates may apply. You can opt out anytime in settings.
              </div>

              {error && (
                <div style={{ fontSize: "12px", color: "#c45c5c", marginBottom: "12px", textAlign: "center" }}>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Bottom: button */}
          <div style={{ width: "100%", zIndex: 1 }}>
            <button
              style={{ ...S.primaryBtn, opacity: saving ? 0.6 : 1 }}
              onClick={handleContinue}
              disabled={saving}
            >
              {saving ? "..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

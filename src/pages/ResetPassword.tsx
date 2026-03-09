import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { S } from "@/components/supper-club/styles";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check hash for type=recovery
    if (window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Password updated! Redirecting…");
      setTimeout(() => navigate("/"), 1500);
    }
    setLoading(false);
  };

  return (
    <div style={S.app}>
      <div style={S.phone}>
        <div style={S.welcomeBg}>
          <div style={S.orb} />
          <div style={S.eyebrow}>Reset Password</div>
          <div style={{ ...S.mainTitle, fontSize: "36px" }}>New Password</div>
          <div style={S.subtitle}>Enter your new password below.</div>
          <div style={S.ornament}>— · —</div>

          <div style={{ width: "100%", maxWidth: "320px" }}>
            {!ready && !message && (
              <div style={{ fontSize: "13px", color: "#8c8278", textAlign: "center" }}>
                Verifying reset link…
              </div>
            )}

            {ready && !message && (
              <>
                <label style={S.label}>New Password</label>
                <input
                  style={S.input}
                  type="password"
                  placeholder="Enter new password (6+ chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <div style={{ fontSize: "12px", color: "#c45c5c", marginBottom: "12px", textAlign: "center" }}>
                    {error}
                  </div>
                )}

                <button
                  style={{ ...S.primaryBtn, opacity: loading ? 0.6 : 1 }}
                  onClick={handleReset}
                  disabled={loading}
                >
                  {loading ? "..." : "Update Password"}
                </button>
              </>
            )}

            {message && (
              <div style={{ fontSize: "13px", color: "#7a9e7e", textAlign: "center" }}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

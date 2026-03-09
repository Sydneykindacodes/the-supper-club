import { useState } from "react";
import { S } from "./styles";

const STEPS = [
  {
    icon: "◈",
    title: "Welcome to The Supper Club Social",
    body: "A private dining experience where your group takes turns hosting secret restaurant reservations. No one knows where you're going until the day arrives.",
  },
  {
    icon: "◆",
    title: "How It Works",
    body: "Each cycle, one member is chosen as the host. They secretly select a restaurant from the group's curated pool, make the reservation, and keep it under wraps until reveal day.",
  },
  {
    icon: "◇",
    title: "Submit Your Availability",
    body: "Every member selects the dates that work for them. The host picks the best overlap, books the table, and confirms the dinner — all without revealing the destination.",
  },
  {
    icon: "◎",
    title: "The Reveal",
    body: "On the morning of the dinner, the restaurant is revealed to the group. After dining, everyone rates the experience and votes on the best dish. Then the hosting torch passes on.",
  },
  {
    icon: "◉",
    title: "Explore and Discover",
    body: "Search for restaurants, build your group's pool, earn badges, and track your dining history. The more you dine, the more you unlock.",
  },
];

interface OnboardingProps {
  userName: string;
  onComplete: () => void;
}

export default function Onboarding({ userName, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleSkip = () => {
    localStorage.setItem("sc_onboarded", "1");
    onComplete();
  };

  const handleNext = () => {
    if (isLast) {
      handleSkip();
    } else {
      setStep(step + 1);
    }
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

          {/* Top: skip + progress */}
          <div style={{ width: "100%", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", color: "#5a3a25", letterSpacing: "1px" }}>
                {step + 1} of {STEPS.length}
              </div>
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
            {/* Progress bar */}
            <div style={{
              width: "100%", height: "2px",
              background: "rgba(201,149,106,0.12)", borderRadius: "1px",
              overflow: "hidden",
            }}>
              <div style={{
                height: "2px", background: "#c9956a", borderRadius: "1px",
                width: `${progress}%`,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>

          {/* Center: content */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            textAlign: "center", zIndex: 1,
            padding: "0 8px",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              background: "rgba(201,149,106,0.08)",
              border: "1px solid rgba(201,149,106,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px", color: "#c9956a",
              marginBottom: "28px",
            }}>
              {current.icon}
            </div>

            <div style={{
              fontSize: "28px", color: "#f5e6d3", fontWeight: "400",
              lineHeight: "1.2", marginBottom: "16px",
            }}>
              {step === 0 ? (
                <>Welcome, {userName}.</>
              ) : (
                current.title
              )}
            </div>

            <div style={{
              fontSize: "14px", color: "#7a5a40", lineHeight: "1.8",
              fontStyle: "italic", maxWidth: "300px",
            }}>
              {current.body}
            </div>
          </div>

          {/* Bottom: dots + button */}
          <div style={{ width: "100%", zIndex: 1 }}>
            {/* Dots */}
            <div style={{
              display: "flex", justifyContent: "center", gap: "8px",
              marginBottom: "24px",
            }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? "20px" : "6px",
                    height: "6px",
                    borderRadius: "3px",
                    background: i === step ? "#c9956a" : "rgba(201,149,106,0.2)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>

            <button style={S.primaryBtn} onClick={handleNext}>
              {isLast ? "Get Started" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

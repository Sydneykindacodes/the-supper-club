import { useState, useEffect, useCallback } from "react";
import { S } from "./styles";

interface RestaurantRevealProps {
  restaurantName: string;
  cuisine: string;
  city: string;
  dinnerDate: string;
  onComplete: () => void;
}

/**
 * Cinematic restaurant reveal — staged animation sequence:
 * 1. Darkness + "The moment has arrived" text
 * 2. Pulsing seal/wax stamp
 * 3. Seal breaks open
 * 4. Restaurant name types in letter by letter
 * 5. Full details fade in
 */
export default function RestaurantReveal({ restaurantName, cuisine, city, dinnerDate, onComplete }: RestaurantRevealProps) {
  const [stage, setStage] = useState(0);
  // 0: blackout + text
  // 1: seal pulse
  // 2: seal breaking / light burst
  // 3: restaurant name typewriter
  // 4: full reveal with details
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 1800));
    timers.push(setTimeout(() => setStage(2), 3400));
    timers.push(setTimeout(() => setStage(3), 4600));
    timers.push(setTimeout(() => setStage(4), 4600 + restaurantName.length * 80 + 600));
    return () => timers.forEach(clearTimeout);
  }, [restaurantName.length]);

  // Typewriter effect for restaurant name
  useEffect(() => {
    if (stage !== 3) return;
    if (typedChars >= restaurantName.length) return;
    const t = setTimeout(() => setTypedChars(c => c + 1), 75);
    return () => clearTimeout(t);
  }, [stage, typedChars, restaurantName.length]);

  const handleSkip = useCallback(() => {
    setStage(4);
    setTypedChars(restaurantName.length);
  }, [restaurantName.length]);

  return (
    <div style={S.app}>
      <div style={S.phone}>
        <div
          onClick={stage < 4 ? handleSkip : undefined}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            cursor: stage < 4 ? "pointer" : "default",
          }}
        >
          {/* Layered backgrounds */}
          {/* Base darkness */}
          <div style={{
            position: "absolute", inset: 0,
            background: "#060302",
            transition: "opacity 1.5s ease",
            opacity: stage >= 4 ? 0 : 1,
            zIndex: 0,
          }} />

          {/* Deep warm gradient that fades in at stage 2+ */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse at 50% 40%, rgba(201,149,106,0.12) 0%, rgba(10,6,3,0.98) 60%, #060302 100%)",
            transition: "opacity 1.8s ease",
            opacity: stage >= 2 ? 1 : 0,
            zIndex: 1,
          }} />

          {/* Final warm reveal bg */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, #1a0f0a 0%, #2d1208 50%, #1a0f0a 100%)",
            transition: "opacity 1s ease",
            opacity: stage >= 4 ? 1 : 0,
            zIndex: 2,
          }} />

          {/* Radial light burst at stage 2 */}
          <div style={{
            position: "absolute",
            top: "38%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: stage >= 2 ? "500px" : "0px",
            height: stage >= 2 ? "500px" : "0px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201,149,106,0.15) 0%, rgba(201,149,106,0.04) 40%, transparent 70%)",
            transition: "width 2s ease-out, height 2s ease-out, opacity 2s ease",
            opacity: stage >= 4 ? 0 : 1,
            zIndex: 3,
          }} />

          {/* Content layers */}
          <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 32px" }}>

            {/* Stage 0: Opening text */}
            <div style={{
              transition: "opacity 0.8s ease, transform 0.8s ease",
              opacity: stage === 0 ? 1 : 0,
              transform: stage === 0 ? "translateY(0)" : "translateY(-20px)",
              position: stage > 1 ? "absolute" : "relative",
              pointerEvents: "none",
            }}>
              <div style={{
                fontSize: "11px",
                color: "rgba(201,149,106,0.5)",
                letterSpacing: "8px",
                textTransform: "uppercase",
                marginBottom: "20px",
              }}>
                The Supper Club
              </div>
              <div style={{
                fontSize: "22px",
                color: "#f5e6d3",
                fontWeight: "400",
                lineHeight: "1.5",
                opacity: 0.9,
              }}>
                The moment<br />has arrived.
              </div>
            </div>

            {/* Stage 1-2: Wax seal */}
            <div style={{
              transition: "opacity 1s ease, transform 1.2s ease",
              opacity: stage >= 1 && stage < 4 ? 1 : 0,
              transform: stage >= 2 ? "scale(1.3) rotate(5deg)" : "scale(1) rotate(0deg)",
              position: stage >= 4 ? "absolute" : "relative",
              pointerEvents: "none",
            }}>
              <div style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                margin: "0 auto 24px",
                background: stage >= 2
                  ? "radial-gradient(circle, rgba(201,149,106,0.6) 0%, rgba(201,149,106,0.2) 50%, transparent 70%)"
                  : "radial-gradient(circle, rgba(201,149,106,0.15) 0%, rgba(201,149,106,0.05) 70%)",
                border: stage >= 2 ? "2px solid rgba(201,149,106,0.5)" : "2px solid rgba(201,149,106,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 1.2s ease",
                boxShadow: stage >= 2
                  ? "0 0 60px rgba(201,149,106,0.3), 0 0 120px rgba(201,149,106,0.1)"
                  : "0 0 30px rgba(201,149,106,0.1)",
                animation: stage === 1 ? "sealPulse 2s ease-in-out infinite" : "none",
              }}>
                <div style={{
                  fontSize: stage >= 2 ? "32px" : "24px",
                  color: "#c9956a",
                  transition: "all 1s ease",
                  opacity: stage >= 2 ? 0.3 : 0.8,
                }}>
                  {stage >= 2 ? "✧" : "◈"}
                </div>
              </div>
              {stage === 1 && (
                <div style={{
                  fontSize: "12px",
                  color: "rgba(201,149,106,0.4)",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  animation: "textPulse 2s ease-in-out infinite",
                }}>
                  Unsealing...
                </div>
              )}
            </div>

            {/* Stage 3: Typewriter restaurant name */}
            {stage >= 3 && (
              <div style={{
                transition: "opacity 0.6s ease",
                opacity: 1,
              }}>
                <div style={{
                  fontSize: "11px",
                  color: "rgba(201,149,106,0.6)",
                  letterSpacing: "6px",
                  textTransform: "uppercase",
                  marginBottom: "20px",
                  transition: "opacity 0.5s ease",
                  opacity: stage >= 3 ? 1 : 0,
                }}>
                  Your destination
                </div>
                <div style={{
                  fontSize: "32px",
                  color: "#f5e6d3",
                  fontWeight: "400",
                  lineHeight: "1.2",
                  minHeight: "44px",
                  marginBottom: "8px",
                }}>
                  {stage >= 4 ? restaurantName : (
                    <>
                      {restaurantName.slice(0, typedChars)}
                      <span style={{
                        display: "inline-block",
                        width: "2px",
                        height: "32px",
                        background: "#c9956a",
                        marginLeft: "2px",
                        verticalAlign: "text-bottom",
                        animation: "cursorBlink 0.6s step-end infinite",
                      }} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Stage 4: Full details */}
            {stage >= 4 && (
              <div style={{
                animation: "revealFadeUp 0.8s ease-out forwards",
              }}>
                <div style={{
                  fontSize: "14px",
                  color: "#7a5a40",
                  fontStyle: "italic",
                  marginBottom: "24px",
                }}>
                  {cuisine} · {city}
                </div>

                <div style={{
                  width: "60px",
                  height: "1px",
                  background: "linear-gradient(90deg, transparent, rgba(201,149,106,0.4), transparent)",
                  margin: "0 auto 24px",
                }} />

                <div style={{
                  fontSize: "13px",
                  color: "rgba(201,149,106,0.5)",
                  marginBottom: "8px",
                }}>
                  {dinnerDate}
                </div>

                <div style={{
                  marginTop: "40px",
                }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplete(); }}
                    style={{
                      ...S.primaryBtn,
                      maxWidth: "260px",
                      margin: "0 auto",
                    }}
                  >
                    View Details
                  </button>
                </div>

                <div style={{
                  marginTop: "16px",
                  fontSize: "11px",
                  color: "rgba(201,149,106,0.3)",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                }}>
                  The table awaits
                </div>
              </div>
            )}

            {/* Skip hint */}
            {stage < 4 && (
              <div style={{
                position: "fixed",
                bottom: "60px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "10px",
                color: "rgba(201,149,106,0.2)",
                letterSpacing: "2px",
                textTransform: "uppercase",
                animation: "textPulse 3s ease-in-out infinite",
              }}>
                Tap to skip
              </div>
            )}
          </div>
        </div>

        {/* Inline keyframe styles */}
        <style>{`
          @keyframes sealPulse {
            0%, 100% { box-shadow: 0 0 30px rgba(201,149,106,0.1); transform: scale(1); }
            50% { box-shadow: 0 0 50px rgba(201,149,106,0.25), 0 0 100px rgba(201,149,106,0.08); transform: scale(1.04); }
          }
          @keyframes textPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
          }
          @keyframes cursorBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
          @keyframes revealFadeUp {
            0% { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

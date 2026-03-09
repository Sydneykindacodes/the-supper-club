import { useState, useEffect, useCallback } from "react";
import { S } from "./styles";

interface RestaurantRevealProps {
  restaurantName: string;
  cuisine: string;
  city: string;
  dinnerDate: string;
  onComplete: () => void;
}

export default function RestaurantReveal({ restaurantName, cuisine, city, dinnerDate, onComplete }: RestaurantRevealProps) {
  const [stage, setStage] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 1800));
    timers.push(setTimeout(() => setStage(2), 3400));
    timers.push(setTimeout(() => setStage(3), 4600));
    timers.push(setTimeout(() => setStage(4), 4600 + restaurantName.length * 80 + 600));
    return () => timers.forEach(clearTimeout);
  }, [restaurantName.length]);

  useEffect(() => {
    if (stage !== 3) return;
    if (typedChars >= restaurantName.length) return;
    const t = setTimeout(() => setTypedChars(c => c + 1), 75);
    return () => clearTimeout(t);
  }, [stage, typedChars, restaurantName.length]);

  const handleSkip = useCallback(() => { setStage(4); setTypedChars(restaurantName.length); }, [restaurantName.length]);

  return (
    <div style={S.app}><div style={S.phone}>
      <div onClick={stage < 4 ? handleSkip : undefined} style={{ position:"absolute", inset:0, zIndex:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:stage<4?"pointer":"default" }}>
        <div style={{ position:"absolute", inset:0, background:"#181818", transition:"opacity 1.5s ease", opacity:stage>=4?0:1, zIndex:0 }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 40%, rgba(212,205,196,0.1) 0%, rgba(24,24,24,0.98) 60%, #181818 100%)", transition:"opacity 1.8s ease", opacity:stage>=2?1:0, zIndex:1 }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, #2a2a2a 0%, #2e2e2e 50%, #2a2a2a 100%)", transition:"opacity 1s ease", opacity:stage>=4?1:0, zIndex:2 }} />
        <div style={{ position:"absolute", top:"38%", left:"50%", transform:"translate(-50%, -50%)", width:stage>=2?"500px":"0px", height:stage>=2?"500px":"0px", borderRadius:"50%", background:"radial-gradient(circle, rgba(212,205,196,0.12) 0%, rgba(212,205,196,0.03) 40%, transparent 70%)", transition:"width 2s ease-out, height 2s ease-out, opacity 2s ease", opacity:stage>=4?0:1, zIndex:3 }} />

        <div style={{ position:"relative", zIndex:10, textAlign:"center", padding:"0 32px" }}>
          <div style={{ transition:"opacity 0.8s ease, transform 0.8s ease", opacity:stage===0?1:0, transform:stage===0?"translateY(0)":"translateY(-20px)", position:stage>1?"absolute":"relative", pointerEvents:"none" }}>
            <div style={{ fontSize:"11px", color:"rgba(212,205,196,0.5)", letterSpacing:"8px", textTransform:"uppercase", marginBottom:"20px" }}>The Supper Club</div>
            <div style={{ fontSize:"22px", color:"#e5ded5", fontWeight:"400", lineHeight:"1.5", opacity:0.9 }}>The moment<br />has arrived.</div>
          </div>

          <div style={{ transition:"opacity 1s ease, transform 1.2s ease", opacity:stage>=1&&stage<4?1:0, transform:stage>=2?"scale(1.3) rotate(5deg)":"scale(1) rotate(0deg)", position:stage>=4?"absolute":"relative", pointerEvents:"none" }}>
            <div style={{ width:"120px", height:"120px", borderRadius:"50%", margin:"0 auto 24px", background:stage>=2?"radial-gradient(circle, rgba(212,205,196,0.5) 0%, rgba(212,205,196,0.15) 50%, transparent 70%)":"radial-gradient(circle, rgba(212,205,196,0.12) 0%, rgba(212,205,196,0.04) 70%)", border:stage>=2?"2px solid rgba(212,205,196,0.4)":"2px solid rgba(212,205,196,0.15)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 1.2s ease", boxShadow:stage>=2?"0 0 60px rgba(212,205,196,0.2), 0 0 120px rgba(212,205,196,0.06)":"0 0 30px rgba(212,205,196,0.08)", animation:stage===1?"sealPulse 2s ease-in-out infinite":"none" }}>
              <div style={{ fontSize:stage>=2?"32px":"24px", color:"#d4cdc4", transition:"all 1s ease", opacity:stage>=2?0.3:0.8 }}>{stage>=2?"✧":"◈"}</div>
            </div>
            {stage===1 && <div style={{ fontSize:"12px", color:"rgba(212,205,196,0.4)", letterSpacing:"4px", textTransform:"uppercase", animation:"textPulse 2s ease-in-out infinite" }}>Unsealing...</div>}
          </div>

          {stage>=3 && (
            <div style={{ transition:"opacity 0.6s ease", opacity:1 }}>
              <div style={{ fontSize:"11px", color:"rgba(212,205,196,0.6)", letterSpacing:"6px", textTransform:"uppercase", marginBottom:"20px", transition:"opacity 0.5s ease", opacity:stage>=3?1:0 }}>Your destination</div>
              <div style={{ fontSize:"32px", color:"#e5ded5", fontWeight:"400", lineHeight:"1.2", minHeight:"44px", marginBottom:"8px" }}>
                {stage>=4 ? restaurantName : (
                  <>{restaurantName.slice(0, typedChars)}<span style={{ display:"inline-block", width:"2px", height:"32px", background:"#d4cdc4", marginLeft:"2px", verticalAlign:"text-bottom", animation:"cursorBlink 0.6s step-end infinite" }} /></>
                )}
              </div>
            </div>
          )}

          {stage>=4 && (
            <div style={{ animation:"revealFadeUp 0.8s ease-out forwards" }}>
              <div style={{ fontSize:"14px", color:"#8c8278", fontStyle:"italic", marginBottom:"24px" }}>{cuisine} · {city}</div>
              <div style={{ width:"60px", height:"1px", background:"linear-gradient(90deg, transparent, rgba(212,205,196,0.4), transparent)", margin:"0 auto 24px" }} />
              <div style={{ fontSize:"13px", color:"rgba(212,205,196,0.5)", marginBottom:"8px" }}>{dinnerDate}</div>
              <div style={{ marginTop:"40px" }}>
                <button onClick={(e) => { e.stopPropagation(); onComplete(); }} style={{ ...S.primaryBtn, maxWidth:"260px", margin:"0 auto" }}>View Details</button>
              </div>
              <div style={{ marginTop:"16px", fontSize:"11px", color:"rgba(212,205,196,0.3)", letterSpacing:"3px", textTransform:"uppercase" }}>The table awaits</div>
            </div>
          )}

          {stage<4 && <div style={{ position:"fixed", bottom:"60px", left:"50%", transform:"translateX(-50%)", fontSize:"10px", color:"rgba(212,205,196,0.2)", letterSpacing:"2px", textTransform:"uppercase", animation:"textPulse 3s ease-in-out infinite" }}>Tap to skip</div>}
        </div>
      </div>

      <style>{`
        @keyframes sealPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(212,205,196,0.08); transform: scale(1); }
          50% { box-shadow: 0 0 50px rgba(212,205,196,0.2), 0 0 100px rgba(212,205,196,0.06); transform: scale(1.04); }
        }
        @keyframes textPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.7; } }
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes revealFadeUp { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div></div>
  );
}
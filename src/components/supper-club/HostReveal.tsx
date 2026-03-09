import { useState, useEffect, useCallback } from "react";
import { S } from "./styles";

interface HostRevealProps {
  isYouTheHost: boolean;
  groupName: string;
  onComplete: () => void;
  onDecline?: () => void;
}

const CHOSEN_MESSAGES = [
  "The Supper Club has spoken. The torch is yours.",
  "From the shadows, a new leader emerges. It's you.",
  "The dice have been cast. Fortune favors... you.",
  "A secret ballot. A sealed envelope. Your name inside.",
  "The stars aligned. The universe chose wisely.",
];

const NOT_CHOSEN_MESSAGES = [
  "The torch passes... but not to you. Not this time.",
  "Another has been summoned. Your time will come.",
  "The fates have decided. You remain in the shadows — for now.",
  "Rest easy. Someone else bears the burden of secrecy tonight.",
  "You've been spared... or denied the honor. Depends how you look at it.",
];

const PRIVILEGE_MESSAGES = [
  "You choose the restaurant. They don't know where. Power tastes delicious.",
  "The group dines at your command. Choose wisely, or don't.",
  "You hold the secret. The restaurant. The reservation. Everything.",
];

export default function HostReveal({ isYouTheHost, groupName, onComplete }: HostRevealProps) {
  const [stage, setStage] = useState(0);
  const [chosenMsg] = useState(() =>
    isYouTheHost
      ? CHOSEN_MESSAGES[Math.floor(Math.random() * CHOSEN_MESSAGES.length)]
      : NOT_CHOSEN_MESSAGES[Math.floor(Math.random() * NOT_CHOSEN_MESSAGES.length)]
  );
  const [privilegeMsg] = useState(() =>
    PRIVILEGE_MESSAGES[Math.floor(Math.random() * PRIVILEGE_MESSAGES.length)]
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 2000));
    timers.push(setTimeout(() => setStage(2), 3800));
    timers.push(setTimeout(() => setStage(3), 5200));
    timers.push(setTimeout(() => setStage(4), 7000));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSkip = useCallback(() => { setStage(4); }, []);

  return (
    <div style={S.app}>
      <div style={S.phone}>
        <div onClick={stage < 4 ? handleSkip : undefined} style={{ position:"absolute", inset:0, zIndex:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden", cursor:stage<4?"pointer":"default" }}>
          <div style={{ position:"absolute", inset:0, background:"#181818", transition:"opacity 1.5s ease", opacity:stage>=4?0:1, zIndex:0 }} />
          <div style={{ position:"absolute", inset:0, background:isYouTheHost?"radial-gradient(ellipse at 50% 40%, rgba(212,205,196,0.1) 0%, rgba(24,24,24,0.98) 60%, #181818 100%)":"radial-gradient(ellipse at 50% 40%, rgba(120,140,180,0.08) 0%, rgba(24,24,24,0.98) 60%, #181818 100%)", transition:"opacity 1.8s ease", opacity:stage>=2?1:0, zIndex:1 }} />
          <div style={{ position:"absolute", inset:0, background:isYouTheHost?"linear-gradient(180deg, #2a2a2a 0%, #2e2e2e 50%, #2a2a2a 100%)":"linear-gradient(180deg, #1a1d22 0%, #22262e 50%, #1a1d22 100%)", transition:"opacity 1s ease", opacity:stage>=4?1:0, zIndex:2 }} />
          <div style={{ position:"absolute", top:"38%", left:"50%", transform:"translate(-50%, -50%)", width:stage>=2?"500px":"0px", height:stage>=2?"500px":"0px", borderRadius:"50%", background:isYouTheHost?"radial-gradient(circle, rgba(212,205,196,0.15) 0%, rgba(212,205,196,0.04) 40%, transparent 70%)":"radial-gradient(circle, rgba(120,140,180,0.12) 0%, rgba(120,140,180,0.03) 40%, transparent 70%)", transition:"width 2s ease-out, height 2s ease-out, opacity 2s ease", opacity:stage>=4?0:1, zIndex:3 }} />

          <div style={{ position:"relative", zIndex:10, textAlign:"center", padding:"0 32px" }}>
            <div style={{ transition:"opacity 0.8s ease, transform 0.8s ease", opacity:stage===0?1:0, transform:stage===0?"translateY(0)":"translateY(-20px)", position:stage>1?"absolute":"relative", pointerEvents:"none", width:"100%" }}>
              <div style={{ fontSize:"11px", color:"rgba(212,205,196,0.5)", letterSpacing:"8px", textTransform:"uppercase", marginBottom:"20px" }}>The Supper Club</div>
              <div style={{ fontSize:"22px", color:"#e5ded5", fontWeight:"400", lineHeight:"1.5", opacity:0.9 }}>A new host<br />has been chosen.</div>
            </div>

            <div style={{ transition:"opacity 1s ease, transform 1.2s ease", opacity:stage>=1&&stage<4?1:0, transform:stage>=2?"scale(1.3) rotate(8deg)":"scale(1) rotate(0deg)", position:stage>=4?"absolute":"relative", pointerEvents:"none" }}>
              <div style={{ width:"120px", height:"120px", borderRadius:"50%", margin:"0 auto 24px", background:stage>=2?"radial-gradient(circle, rgba(212,205,196,0.5) 0%, rgba(212,205,196,0.15) 50%, transparent 70%)":"radial-gradient(circle, rgba(212,205,196,0.12) 0%, rgba(212,205,196,0.04) 70%)", border:stage>=2?"2px solid rgba(212,205,196,0.4)":"2px solid rgba(212,205,196,0.15)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 1.2s ease", boxShadow:stage>=2?"0 0 60px rgba(212,205,196,0.2), 0 0 120px rgba(212,205,196,0.06)":"0 0 30px rgba(212,205,196,0.08)", animation:stage===1?"sealPulse 2s ease-in-out infinite":"none" }}>
                <div style={{ fontSize:stage>=2?"32px":"28px", transition:"all 1s ease", opacity:stage>=2?0.3:0.8 }}>{stage>=2?"✧":"✉"}</div>
              </div>
              {stage===1 && <div style={{ fontSize:"12px", color:"rgba(212,205,196,0.4)", letterSpacing:"4px", textTransform:"uppercase", animation:"textPulse 2s ease-in-out infinite" }}>Opening...</div>}
            </div>

            {stage>=3 && stage<4 && (
              <div style={{ animation:"revealFadeUp 0.8s ease-out forwards" }}>
                <div style={{ fontSize:"36px", color:isYouTheHost?"#e5ded5":"#a0b0c8", fontWeight:"400", lineHeight:"1.2" }}>{isYouTheHost?"It's you.":"Not you."}</div>
              </div>
            )}

            {stage>=4 && (
              <div style={{ animation:"revealFadeUp 0.8s ease-out forwards" }}>
                {isYouTheHost ? (
                  <>
                    <div style={{ fontSize:"11px", color:"#d4cdc4", letterSpacing:"6px", textTransform:"uppercase", marginBottom:"16px" }}>You've been chosen</div>
                    <div style={{ fontSize:"30px", color:"#e5ded5", fontWeight:"400", lineHeight:"1.3", marginBottom:"16px" }}>You Are The<br />Next Host</div>
                    <div style={{ fontSize:"14px", color:"#d4cdc4", fontStyle:"italic", lineHeight:"1.7", marginBottom:"24px", maxWidth:"280px", margin:"0 auto 24px" }}>{chosenMsg}</div>
                    <div style={{ background:"rgba(212,205,196,0.06)", borderRadius:"16px", padding:"20px", marginBottom:"24px", border:"1px solid rgba(212,205,196,0.15)" }}>
                      <div style={{ fontSize:"12px", color:"#e5ded5", marginBottom:"8px", fontWeight:"600" }}>Host of {groupName}</div>
                      <div style={{ fontSize:"12px", color:"#8c8278", fontStyle:"italic", lineHeight:"1.6" }}>{privilegeMsg}</div>
                    </div>
                    <div style={{ fontSize:"12px", color:"#8c8278", lineHeight:"1.7", marginBottom:"28px" }}>When the group schedules the next dinner, you'll choose the restaurant — and they won't know where until you reveal it.</div>
                    <button onClick={(e) => { e.stopPropagation(); onComplete(); }} style={{ ...S.primaryBtn, maxWidth:"260px", margin:"0 auto 12px" }}>Accept the Responsibility</button>
                    <div style={{ fontSize:"11px", color:"#565250", fontStyle:"italic" }}>Keep it secret. Keep it safe.</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:"11px", color:"rgba(120,140,180,0.6)", letterSpacing:"6px", textTransform:"uppercase", marginBottom:"16px" }}>The envelope is open</div>
                    <div style={{ fontSize:"28px", color:"#a0b0c8", fontWeight:"400", lineHeight:"1.3", marginBottom:"16px" }}>You Are Not<br />The Next Host</div>
                    <div style={{ fontSize:"14px", color:"rgba(120,140,180,0.7)", fontStyle:"italic", lineHeight:"1.7", marginBottom:"24px", maxWidth:"280px", margin:"0 auto 24px" }}>{chosenMsg}</div>
                    <div style={{ background:"rgba(120,140,180,0.06)", borderRadius:"16px", padding:"20px", marginBottom:"24px", border:"1px solid rgba(120,140,180,0.15)" }}>
                      <div style={{ fontSize:"13px", color:"#a0b0c8", marginBottom:"8px" }}>Someone else holds the secret now.</div>
                      <div style={{ fontSize:"12px", color:"rgba(120,140,180,0.5)", fontStyle:"italic", lineHeight:"1.6" }}>Submit your availability and let the mystery unfold.</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onComplete(); }} style={{ ...S.primaryBtn, maxWidth:"260px", margin:"0 auto" }}>Continue</button>
                  </>
                )}
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
          @keyframes textPulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.7; }
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
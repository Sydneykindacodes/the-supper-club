import { CSSProperties } from "react";

export const S: Record<string, CSSProperties> = {
  app:   { fontFamily:"'Georgia','Times New Roman',serif", background:"#120a06", minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" },
  phone: { width:"390px", minHeight:"844px", background:"#1a0f0a", borderRadius:"44px", overflow:"hidden", position:"relative", boxShadow:"0 0 0 2px #3d2010, 0 30px 80px rgba(0,0,0,0.9), inset 0 0 40px rgba(200,100,50,0.04)", display:"flex", flexDirection:"column" },
  screen:{ flex:1, overflowY:"auto", paddingBottom:"88px" },
  welcomeBg: { background:"linear-gradient(160deg,#1a0f0a 0%,#2d1208 45%,#1a0f0a 100%)", minHeight:"844px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 32px", position:"relative", overflow:"hidden" },
  orb:   { position:"absolute", width:"320px", height:"320px", borderRadius:"50%", background:"radial-gradient(circle,rgba(201,108,30,0.13) 0%,transparent 70%)", top:"40%", left:"50%", transform:"translate(-50%,-60%)", pointerEvents:"none" as const },
  eyebrow:   { fontSize:"11px", letterSpacing:"6px", color:"#c9956a", textTransform:"uppercase" as const, marginBottom:"14px", opacity:0.75 },
  mainTitle: { fontSize:"50px", color:"#f5e6d3", fontWeight:"400", textAlign:"center" as const, lineHeight:"1.1", marginBottom:"10px" },
  subtitle:  { fontSize:"15px", color:"#7a5a40", textAlign:"center" as const, fontStyle:"italic", marginBottom:"52px" },
  ornament:  { fontSize:"14px", color:"#4a2e18", letterSpacing:"8px", marginBottom:"40px", textAlign:"center" as const },
  primaryBtn:   { background:"linear-gradient(135deg,#c9956a,#9a6040)", color:"#1a0f0a", border:"none", borderRadius:"14px", padding:"17px 32px", fontSize:"13px", fontWeight:"700", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", marginBottom:"12px", fontFamily:"'Georgia',serif" },
  secondaryBtn: { background:"transparent", color:"#c9956a", border:"1.5px solid rgba(201,149,106,0.5)", borderRadius:"14px", padding:"15px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:"'Georgia',serif" },
  ghostBtn:     { background:"transparent", color:"#7a5a40", border:"1px solid rgba(201,149,106,0.2)", borderRadius:"14px", padding:"14px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:"'Georgia',serif" },
  header:    { padding:"54px 24px 20px", borderBottom:"1px solid rgba(201,149,106,0.1)" },
  headerEye: { fontSize:"11px", color:"#c9956a", letterSpacing:"3px", textTransform:"uppercase" as const, marginBottom:"4px" },
  headerTitle:{ fontSize:"30px", color:"#f5e6d3", fontWeight:"400" },
  card:      { background:"rgba(255,255,255,0.035)", border:"1px solid rgba(201,149,106,0.1)", borderRadius:"18px", padding:"20px", margin:"0 16px 12px" },
  cardTitle: { fontSize:"16px", color:"#f5e6d3", fontWeight:"600", marginBottom:"3px" },
  cardSub:   { fontSize:"13px", color:"#7a5a40" },
  input:     { background:"rgba(255,255,255,0.05)", border:"1px solid rgba(201,149,106,0.2)", borderRadius:"12px", padding:"14px 16px", fontSize:"15px", color:"#f5e6d3", width:"100%", boxSizing:"border-box" as const, fontFamily:"'Georgia',serif", outline:"none", marginBottom:"12px" },
  label:     { fontSize:"11px", color:"#c9956a", letterSpacing:"2px", textTransform:"uppercase" as const, marginBottom:"7px", display:"block" },
  toast:     { position:"absolute" as const, top:"62px", left:"50%", transform:"translateX(-50%)", background:"rgba(30,18,10,0.92)", color:"#c9956a", padding:"9px 20px", borderRadius:"20px", fontSize:"12px", fontWeight:"500", zIndex:100, whiteSpace:"nowrap" as const, letterSpacing:"0.3px", border:"1px solid rgba(201,149,106,0.2)", backdropFilter:"blur(8px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" },
  bottomNav: { position:"absolute" as const, bottom:0, left:0, right:0, background:"rgba(20,10,5,0.97)", borderTop:"1px solid rgba(201,149,106,0.12)", display:"flex", padding:"12px 0 28px" },
  navItem:   { flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"5px", cursor:"pointer" },
  revealBox: { margin:"20px 16px", background:"linear-gradient(140deg,#2d1208,#1a0f0a)", border:"1px solid rgba(201,149,106,0.2)", borderRadius:"24px", padding:"36px 24px", textAlign:"center" as const },
  badgeSymbol:{ width:"48px", height:"48px", borderRadius:"12px", background:"rgba(201,149,106,0.08)", border:"1px solid rgba(201,149,106,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:"#c9956a", letterSpacing:"1px", fontWeight:"700", flexShrink:0 },
};

export const tabPill = (active: boolean): CSSProperties => ({
  flex:1, padding:"9px 0", textAlign:"center", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase",
  cursor:"pointer", borderRadius:"10px",
  background:active?"rgba(201,149,106,0.15)":"transparent",
  color:active?"#c9956a":"#4a2e18",
  border:active?"1px solid rgba(201,149,106,0.3)":"1px solid transparent",
  transition:"all 0.15s",
});

export const chip = (active: boolean): CSSProperties => ({
  padding:"7px 14px", borderRadius:"16px", cursor:"pointer", flexShrink:0,
  background:active?"linear-gradient(135deg,#c9956a,#9a6040)":"rgba(255,255,255,0.04)",
  border:active?"none":"1px solid rgba(201,149,106,0.15)",
  fontSize:"12px", color:active?"#1a0f0a":"#7a5a40",
  fontWeight:active?"700":"400", letterSpacing:"0.5px", transition:"all 0.15s",
});

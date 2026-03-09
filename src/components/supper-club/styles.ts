import { CSSProperties } from "react";

/* ── Charcoal & Cream palette ── */
const BG       = "#242424";
const BG_PHONE = "#2a2a2a";
const BG_WARM  = "#2e2e2e";
const FG       = "#e5ded5";
const CREAM    = "#d4cdc4";
const MUTED    = "#8c8278";
const FAINT    = "#3d3d3d";
const BORDER   = "rgba(212,205,196,0.10)";
const BORDER2  = "rgba(212,205,196,0.15)";
const BORDER3  = "rgba(212,205,196,0.20)";

export const S: Record<string, CSSProperties> = {
  app:   { fontFamily:"'Georgia','Times New Roman',serif", background:BG, minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" },
  phone: { width:"390px", minHeight:"844px", background:BG_PHONE, borderRadius:"44px", overflow:"hidden", position:"relative", boxShadow:`0 0 0 2px ${FAINT}, 0 30px 80px rgba(0,0,0,0.7), inset 0 0 40px rgba(212,205,196,0.02)`, display:"flex", flexDirection:"column" },
  screen:{ flex:1, overflowY:"auto", paddingBottom:"88px" },
  welcomeBg: { background:`linear-gradient(160deg,${BG_PHONE} 0%,${BG_WARM} 45%,${BG_PHONE} 100%)`, minHeight:"844px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 32px", position:"relative", overflow:"hidden" },
  orb:   { position:"absolute", width:"320px", height:"320px", borderRadius:"50%", background:"radial-gradient(circle,rgba(212,205,196,0.06) 0%,transparent 70%)", top:"40%", left:"50%", transform:"translate(-50%,-60%)", pointerEvents:"none" as const },
  eyebrow:   { fontSize:"11px", letterSpacing:"6px", color:CREAM, textTransform:"uppercase" as const, marginBottom:"14px", opacity:0.6 },
  mainTitle: { fontSize:"50px", color:FG, fontWeight:"400", textAlign:"center" as const, lineHeight:"1.1", marginBottom:"10px" },
  subtitle:  { fontSize:"15px", color:MUTED, textAlign:"center" as const, fontStyle:"italic", marginBottom:"52px" },
  ornament:  { fontSize:"14px", color:FAINT, letterSpacing:"8px", marginBottom:"40px", textAlign:"center" as const },
  primaryBtn:   { background:`linear-gradient(135deg,${CREAM},#a49a8e)`, color:BG_PHONE, border:"none", borderRadius:"14px", padding:"17px 32px", fontSize:"13px", fontWeight:"700", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", marginBottom:"12px", fontFamily:"'Georgia',serif" },
  secondaryBtn: { background:"transparent", color:CREAM, border:`1.5px solid rgba(212,205,196,0.35)`, borderRadius:"14px", padding:"15px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:"'Georgia',serif" },
  ghostBtn:     { background:"transparent", color:MUTED, border:`1px solid ${BORDER3}`, borderRadius:"14px", padding:"14px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:"'Georgia',serif" },
  header:    { padding:"54px 24px 20px", borderBottom:`1px solid ${BORDER}` },
  headerEye: { fontSize:"11px", color:CREAM, letterSpacing:"3px", textTransform:"uppercase" as const, marginBottom:"4px" },
  headerTitle:{ fontSize:"30px", color:FG, fontWeight:"400" },
  card:      { background:"rgba(255,255,255,0.035)", border:`1px solid ${BORDER}`, borderRadius:"18px", padding:"20px", margin:"0 16px 12px" },
  cardTitle: { fontSize:"16px", color:FG, fontWeight:"600", marginBottom:"3px" },
  cardSub:   { fontSize:"13px", color:MUTED },
  input:     { background:"rgba(255,255,255,0.05)", border:`1px solid ${BORDER3}`, borderRadius:"12px", padding:"14px 16px", fontSize:"15px", color:FG, width:"100%", boxSizing:"border-box" as const, fontFamily:"'Georgia',serif", outline:"none", marginBottom:"12px" },
  label:     { fontSize:"11px", color:CREAM, letterSpacing:"2px", textTransform:"uppercase" as const, marginBottom:"7px", display:"block" },
  toast:     { position:"absolute" as const, top:"62px", left:"50%", transform:"translateX(-50%)", background:"rgba(36,36,36,0.94)", color:CREAM, padding:"9px 20px", borderRadius:"20px", fontSize:"12px", fontWeight:"500", zIndex:100, whiteSpace:"nowrap" as const, letterSpacing:"0.3px", border:`1px solid ${BORDER2}`, backdropFilter:"blur(8px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)" },
  bottomNav: { position:"absolute" as const, bottom:0, left:0, right:0, background:"rgba(36,36,36,0.97)", borderTop:`1px solid ${BORDER}`, display:"flex", padding:"12px 0 28px" },
  navItem:   { flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"5px", cursor:"pointer" },
  revealBox: { margin:"20px 16px", background:`linear-gradient(140deg,${BG_WARM},${BG_PHONE})`, border:`1px solid ${BORDER2}`, borderRadius:"24px", padding:"36px 24px", textAlign:"center" as const },
  badgeSymbol:{ width:"48px", height:"48px", borderRadius:"12px", background:"rgba(212,205,196,0.06)", border:`1px solid ${BORDER2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:CREAM, letterSpacing:"1px", fontWeight:"700", flexShrink:0 },
};

export const tabPill = (active: boolean): CSSProperties => ({
  flex:1, padding:"9px 0", textAlign:"center", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase",
  cursor:"pointer", borderRadius:"10px",
  background:active?"rgba(212,205,196,0.12)":"transparent",
  color:active?CREAM:FAINT,
  border:active?`1px solid rgba(212,205,196,0.25)`:"1px solid transparent",
  transition:"all 0.15s",
});

export const chip = (active: boolean): CSSProperties => ({
  padding:"7px 14px", borderRadius:"16px", cursor:"pointer", flexShrink:0,
  background:active?`linear-gradient(135deg,${CREAM},#a49a8e)`:"rgba(255,255,255,0.04)",
  border:active?"none":`1px solid ${BORDER2}`,
  fontSize:"12px", color:active?BG_PHONE:MUTED,
  fontWeight:active?"700":"400", letterSpacing:"0.5px", transition:"all 0.15s",
});

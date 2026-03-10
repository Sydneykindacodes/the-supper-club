import { CSSProperties } from "react";

/* ── Charcoal & Cream palette (dark / default) ── */
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

/* ── Host light-mode palette ── */
const H_BG       = "#f0ebe4";
const H_BG_PHONE = "#f5f0e8";
const H_BG_WARM  = "#ebe5dc";
const H_FG       = "#2a2520";
const H_CREAM    = "#3d352d";
const H_MUTED    = "#7a7068";
const H_FAINT    = "#d4cdc4";
const H_BORDER   = "rgba(42,37,32,0.08)";
const H_BORDER2  = "rgba(42,37,32,0.12)";
const H_BORDER3  = "rgba(42,37,32,0.18)";

/* ── Font families ── */
const FONT_DISPLAY = "'Bristol', cursive";
const FONT_BODY    = "'Montserrat', sans-serif";
const FONT_ACCENT  = "'Cormorant Garamond', serif";

export const S: Record<string, CSSProperties> = {
  app:   { fontFamily:FONT_BODY, background:BG, minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center" },
  phone: { width:"390px", minHeight:"844px", background:BG_PHONE, borderRadius:"44px", overflow:"hidden", position:"relative", boxShadow:`0 0 0 2px ${FAINT}, 0 30px 80px rgba(0,0,0,0.7), inset 0 0 40px rgba(212,205,196,0.02)`, display:"flex", flexDirection:"column" },
  screen:{ flex:1, overflowY:"auto", paddingBottom:"88px" },
  welcomeBg: { background:`linear-gradient(160deg,${BG_PHONE} 0%,${BG_WARM} 45%,${BG_PHONE} 100%)`, minHeight:"844px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 32px", position:"relative", overflow:"hidden" },
  orb:   { position:"absolute", width:"320px", height:"320px", borderRadius:"50%", background:"radial-gradient(circle,rgba(212,205,196,0.06) 0%,transparent 70%)", top:"40%", left:"50%", transform:"translate(-50%,-60%)", pointerEvents:"none" as const },
  eyebrow:   { fontSize:"11px", letterSpacing:"6px", color:CREAM, textTransform:"uppercase" as const, marginBottom:"14px", opacity:0.6, fontFamily:FONT_BODY, fontWeight:"500" },
  mainTitle: { fontSize:"50px", color:FG, fontWeight:"400", textAlign:"center" as const, lineHeight:"1.1", marginBottom:"10px", fontFamily:FONT_DISPLAY },
  subtitle:  { fontSize:"15px", color:MUTED, textAlign:"center" as const, fontStyle:"italic", marginBottom:"52px", fontFamily:FONT_ACCENT },
  ornament:  { fontSize:"14px", color:FAINT, letterSpacing:"8px", marginBottom:"40px", textAlign:"center" as const },
  primaryBtn:   { background:`linear-gradient(135deg,${CREAM},#a49a8e)`, color:BG_PHONE, border:"none", borderRadius:"14px", padding:"17px 32px", fontSize:"13px", fontWeight:"700", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", marginBottom:"12px", fontFamily:FONT_BODY },
  secondaryBtn: { background:"transparent", color:CREAM, border:`1.5px solid rgba(212,205,196,0.35)`, borderRadius:"14px", padding:"15px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:FONT_BODY },
  ghostBtn:     { background:"transparent", color:MUTED, border:`1px solid ${BORDER3}`, borderRadius:"14px", padding:"14px 32px", fontSize:"13px", letterSpacing:"2px", textTransform:"uppercase" as const, cursor:"pointer", width:"100%", fontFamily:FONT_BODY },
  header:    { padding:"54px 24px 20px", borderBottom:`1px solid ${BORDER}` },
  headerEye: { fontSize:"11px", color:CREAM, letterSpacing:"3px", textTransform:"uppercase" as const, marginBottom:"4px", fontFamily:FONT_BODY, fontWeight:"500" },
  headerTitle:{ fontSize:"30px", color:FG, fontWeight:"400", fontFamily:FONT_DISPLAY },
  card:      { background:"rgba(255,255,255,0.035)", border:`1px solid ${BORDER}`, borderRadius:"18px", padding:"20px", margin:"0 16px 12px" },
  cardTitle: { fontSize:"16px", color:FG, fontWeight:"600", marginBottom:"3px", fontFamily:FONT_BODY },
  cardSub:   { fontSize:"13px", color:MUTED, fontFamily:FONT_BODY },
  input:     { background:"rgba(255,255,255,0.05)", border:`1px solid ${BORDER3}`, borderRadius:"12px", padding:"14px 16px", fontSize:"15px", color:FG, width:"100%", boxSizing:"border-box" as const, fontFamily:FONT_BODY, outline:"none", marginBottom:"12px" },
  label:     { fontSize:"11px", color:CREAM, letterSpacing:"2px", textTransform:"uppercase" as const, marginBottom:"7px", display:"block", fontFamily:FONT_BODY, fontWeight:"500" },
  toast:     { position:"absolute" as const, top:"62px", left:"50%", transform:"translateX(-50%)", background:"rgba(36,36,36,0.94)", color:CREAM, padding:"9px 20px", borderRadius:"20px", fontSize:"12px", fontWeight:"500", zIndex:100, whiteSpace:"nowrap" as const, letterSpacing:"0.3px", border:`1px solid ${BORDER2}`, backdropFilter:"blur(8px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)", fontFamily:FONT_BODY },
  bottomNav: { position:"absolute" as const, bottom:0, left:0, right:0, background:"rgba(36,36,36,0.97)", borderTop:`1px solid ${BORDER}`, display:"flex", padding:"12px 0 28px" },
  navItem:   { flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:"5px", cursor:"pointer", fontFamily:FONT_BODY },
  revealBox: { margin:"20px 16px", background:`linear-gradient(140deg,${BG_WARM},${BG_PHONE})`, border:`1px solid ${BORDER2}`, borderRadius:"24px", padding:"36px 24px", textAlign:"center" as const },
  badgeSymbol:{ width:"48px", height:"48px", borderRadius:"12px", background:"rgba(212,205,196,0.06)", border:`1px solid ${BORDER2}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", color:CREAM, letterSpacing:"1px", fontWeight:"700", flexShrink:0, fontFamily:FONT_BODY },
};

/* ── Host light-mode overrides ── */
export const SHost: Record<string, CSSProperties> = {
  ...S,
  app:   { ...S.app, background:H_BG },
  phone: { ...S.phone, background:H_BG_PHONE, boxShadow:`0 0 0 2px ${H_FAINT}, 0 30px 80px rgba(0,0,0,0.15), inset 0 0 40px rgba(42,37,32,0.02)` },
  screen:{ ...S.screen },
  header:    { ...S.header, borderBottom:`1px solid ${H_BORDER}` },
  headerEye: { ...S.headerEye, color:H_CREAM },
  headerTitle:{ ...S.headerTitle, color:H_FG },
  card:      { ...S.card, background:"rgba(42,37,32,0.04)", border:`1px solid ${H_BORDER}` },
  cardTitle: { ...S.cardTitle, color:H_FG },
  cardSub:   { ...S.cardSub, color:H_MUTED },
  primaryBtn:   { ...S.primaryBtn, background:`linear-gradient(135deg,${H_CREAM},#5a4f44)`, color:H_BG_PHONE },
  secondaryBtn: { ...S.secondaryBtn, color:H_CREAM, border:`1.5px solid rgba(42,37,32,0.25)` },
  ghostBtn:     { ...S.ghostBtn, color:H_MUTED, border:`1px solid ${H_BORDER3}` },
  input:     { ...S.input, background:"rgba(42,37,32,0.05)", border:`1px solid ${H_BORDER3}`, color:H_FG },
  label:     { ...S.label, color:H_CREAM },
  toast:     { ...S.toast, background:"rgba(245,240,232,0.94)", color:H_CREAM, border:`1px solid ${H_BORDER2}`, boxShadow:"0 4px 16px rgba(0,0,0,0.08)" },
  bottomNav: { ...S.bottomNav, background:"rgba(245,240,232,0.97)", borderTop:`1px solid ${H_BORDER}` },
  revealBox: { ...S.revealBox, background:`linear-gradient(140deg,${H_BG_WARM},${H_BG_PHONE})`, border:`1px solid ${H_BORDER2}` },
  badgeSymbol:{ ...S.badgeSymbol, background:"rgba(42,37,32,0.06)", border:`1px solid ${H_BORDER2}`, color:H_CREAM },
};

export const FONT_DISPLAY_FAMILY = FONT_DISPLAY;
export const FONT_BODY_FAMILY = FONT_BODY;
export const FONT_ACCENT_FAMILY = FONT_ACCENT;

export const tabPill = (active: boolean, hostMode = false): CSSProperties => ({
  flex:1, padding:"9px 0", textAlign:"center", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase",
  cursor:"pointer", borderRadius:"10px",
  background: active
    ? (hostMode ? "rgba(42,37,32,0.1)" : "rgba(212,205,196,0.12)")
    : "transparent",
  color: active
    ? (hostMode ? H_CREAM : CREAM)
    : (hostMode ? H_FAINT : FAINT),
  border: active
    ? `1px solid ${hostMode ? "rgba(42,37,32,0.2)" : "rgba(212,205,196,0.25)"}`
    : "1px solid transparent",
  transition:"all 0.15s",
  fontFamily:FONT_BODY,
});

export const chip = (active: boolean, hostMode = false): CSSProperties => ({
  padding:"7px 14px", borderRadius:"16px", cursor:"pointer", flexShrink:0,
  background: active
    ? (hostMode ? `linear-gradient(135deg,${H_CREAM},#5a4f44)` : `linear-gradient(135deg,${CREAM},#a49a8e)`)
    : (hostMode ? "rgba(42,37,32,0.04)" : "rgba(255,255,255,0.04)"),
  border: active ? "none" : `1px solid ${hostMode ? H_BORDER2 : BORDER2}`,
  fontSize:"12px",
  color: active
    ? (hostMode ? H_BG_PHONE : BG_PHONE)
    : (hostMode ? H_MUTED : MUTED),
  fontWeight:active?"700":"400", letterSpacing:"0.5px", transition:"all 0.15s",
  fontFamily:FONT_BODY,
});

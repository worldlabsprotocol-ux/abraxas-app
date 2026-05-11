// FILE: components/BottomNav.tsx
// 2-tab bottom nav: Terminal (home + arena unified) · Vaults
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSystemState } from "@/lib/systemState";

<<<<<<< HEAD
const TABS = [
  {
    key: "terminal",
    label: "Terminal",
    href: "/",
    matches: (p: string) => p === "/" || p === "/dashboard",
    color: "#6b8cff",
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.28)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3-3 3M13 14h4"/>
=======


// New ontology: Studio · Markets · Capital (Vaults)
// Arena/Games accessible within Markets tab as utility — not primary nav
type TabId = "studio"|"markets"|"vaults";

const TABS: Array<{
  key: TabId; label: string; sublabel: string; href?: string; isInPage?: string;
  matches: (p:string)=>boolean; color: string;
  icon: (active:boolean,color:string)=>React.ReactNode;
}> = [
  {
    key:"studio", label:"III · Studio", sublabel:"Tokenize · Issue",
    href:"/", isInPage:"studio",
    matches:p=>p==="/",
    color:"#14F195",
    icon:(a,c)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.25)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
    ),
  },
  {
    key:"markets", label:"II · Markets", sublabel:"Listings · Activity",
    href:"/", isInPage:"markets",
    matches:()=>false,
    color:"#6b8cff",
    icon:(a,c)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.25)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
>>>>>>> 053617e... arch: Studio/Markets/Capital ontology + IssuanceEngine 7-step flow
      </svg>
    ),
  },
  {
<<<<<<< HEAD
    key: "vaults",
    label: "Vaults",
    href: "/protect",
    matches: (p: string) =>
      p.startsWith("/protect") || p.startsWith("/vault") || p.startsWith("/circuit"),
    color: "#14F195",
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.28)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
=======
    key:"vaults", label:"I · Capital", sublabel:"Vaults · Borrow",
    href:"/protect",
    matches:p=>p.startsWith("/protect"),
    color:"#C8A96E",
    icon:(a,c)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.25)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
>>>>>>> 053617e... arch: Studio/Markets/Capital ontology + IssuanceEngine 7-step flow
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { systemState } = useSystemState();
  const atRisk   = systemState === "AT_RISK" || systemState === "CIRCUIT_TRIGGERED";

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      height: "68px",
      display: "flex", alignItems: "center",
      background: "rgba(2,3,10,0.94)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}>
      {TABS.map((tab) => {
        const active     = tab.matches(pathname);
        const showAlert  = tab.key === "vaults" && atRisk;

        return (
          <Link key={tab.key} href={tab.href}
            onClick={() => { window.scrollTo({ top:0, behavior:"smooth" }); }}
            style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", position: "relative", padding: "0.375rem 0" }}>

            {/* Active bar */}
            {active && (
              <span style={{ position:"absolute", top:0, left:"25%", right:"25%", height:"2px", borderRadius:"0 0 2px 2px", background:tab.color, boxShadow:`0 0 8px ${tab.color}` }} />
            )}

            {/* Alert dot */}
            {showAlert && (
              <span style={{ position:"absolute", top:"6px", right:"calc(50% - 16px)", width:"6px", height:"6px", borderRadius:"50%", background:"#f26b6b", boxShadow:"0 0 5px rgba(242,107,107,0.8)", animation:"pulse 1s ease-in-out infinite" }} />
            )}
<<<<<<< HEAD

            {tab.icon(active, tab.color)}
=======
            {/* Icon with glow when active */}
            <div style={{ position:"relative",filter:active?`drop-shadow(0 0 6px ${tab.color})`:"none",transition:"filter 0.2s" }}>
              {tab.icon(active, tab.color)}
            </div>
            {/* Label */}
            <span style={{ fontSize:"0.5rem", fontWeight:active?800:400, color:active?tab.color:"rgba(255,255,255,0.25)", letterSpacing:"0.04em", lineHeight:1, fontFamily:"'JetBrains Mono',monospace", transition:"color 0.2s" }}>{tab.label}</span>
            <span style={{ fontSize:"0.36rem", color:active?`${tab.color}70`:"rgba(255,255,255,0.15)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>{tab.sublabel}</span>
          </>
        );

        const sharedStyle: React.CSSProperties = {
          flex:1, display:"flex", flexDirection:"column", alignItems:"center",
          justifyContent:"center", gap:"0.22rem", position:"relative",
          padding:"0.375rem 0", cursor:"pointer", transition:"background 0.15s",
          background:active?`${tab.color}07`:"transparent",
          borderRight:"1px solid rgba(255,255,255,0.03)",
          textDecoration:"none",
        };

        if (tab.isInPage) {
          return (
            <div key={tab.key} onClick={()=>{
              setActiveInPage(tab.isInPage!);
              if(typeof window!=="undefined"){
                if(pathname!=="/") { window.location.href="/"; return; }
                window.dispatchEvent(new CustomEvent("abraxas-tab",{detail:tab.isInPage}));
                window.scrollTo({top:0,behavior:"smooth"});
              }
            }} style={sharedStyle}>
              {content}
            </div>
          );
        }
>>>>>>> 053617e... arch: Studio/Markets/Capital ontology + IssuanceEngine 7-step flow

            <span style={{
              fontSize: "0.62rem", fontWeight: active ? 700 : 400,
              color: active ? tab.color : "rgba(255,255,255,0.28)",
              letterSpacing: "0.03em", lineHeight: 1,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
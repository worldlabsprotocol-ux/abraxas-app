// FILE: components/BottomNav.tsx
// 4-tab fixed bottom nav: Terminal · Markets · Game Modes · Vaults
// Premium neon design with active glow + alert indicators
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSystemState } from "@/lib/systemState";
import { useState } from "react";

type TabId = "terminal"|"markets"|"game_modes"|"vaults";

const TABS: Array<{
  key: TabId; label: string; href?: string; isInPage?: string;
  matches: (p:string)=>boolean; color: string;
  icon: (active:boolean,color:string)=>React.ReactNode;
}> = [
  {
    key:"terminal", label:"Terminal", href:"/",
    matches:p=>p==="/",
    color:"#6b8cff",
    icon:(a,c)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.28)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l3 3-3 3M13 14h4"/>
      </svg>
    ),
  },
  {
    key:"markets", label:"Markets", href:"/", isInPage:"markets",
    matches:()=>false,
    color:"#14F195",
    icon:(a,c)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.28)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    key:"game_modes", label:"Games", href:"/", isInPage:"game_modes",
    matches:()=>false,
    color:"#FBBF24",
    icon:(a,c)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.28)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    key:"vaults", label:"Vaults", href:"/protect",
    matches:p=>p.startsWith("/protect")||p.startsWith("/vault"),
    color:"#C8A96E",
    icon:(a,c)=>(
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?c:"rgba(255,255,255,0.28)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
] as const;

// Global tab dispatcher — lets BottomNav drive in-page tab state
// We use a URL hash approach for simplicity without shared state
function navigateToTab(tab: TabId, href?: string, inPage?: string) {
  if (inPage) {
    // Navigate to home then dispatch
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/");
      window.dispatchEvent(new CustomEvent("abraxas-tab", { detail: inPage }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const { systemState } = useSystemState();
  const atRisk = systemState === "AT_RISK" || systemState === "CIRCUIT_TRIGGERED";
  const [activeInPage, setActiveInPage] = useState<string>("");

  return (
    <nav style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:50,
      height:"72px",
      display:"flex", alignItems:"stretch",
      background:"rgba(2,3,10,0.96)",
      backdropFilter:"blur(24px)",
      WebkitBackdropFilter:"blur(24px)",
      borderTop:"1px solid rgba(255,255,255,0.06)",
      paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      {TABS.map(tab=>{
        const isPathActive = tab.matches(pathname);
        const isInPageActive = !!tab.isInPage && activeInPage===tab.isInPage;
        const active = isPathActive || isInPageActive;
        const showAlert = tab.key==="vaults" && atRisk;

        const content = (
          <>
            {/* Active glow bar top */}
            {active&&(
              <div style={{ position:"absolute",top:0,left:"20%",right:"20%",height:"2px",background:tab.color,boxShadow:`0 0 10px ${tab.color},0 0 20px ${tab.color}55`,borderRadius:"0 0 2px 2px" }} />
            )}
            {/* Alert dot */}
            {showAlert&&(
              <div style={{ position:"absolute",top:"8px",right:"calc(50% - 18px)",width:"7px",height:"7px",borderRadius:"50%",background:"#f26b6b",boxShadow:"0 0 6px rgba(242,107,107,0.9)",animation:"pulse 1s ease-in-out infinite" }} />
            )}
            {/* Icon with glow when active */}
            <div style={{ position:"relative",filter:active?`drop-shadow(0 0 6px ${tab.color})`:"none",transition:"filter 0.2s" }}>
              {tab.icon(active, tab.color)}
            </div>
            {/* Label */}
            <span style={{
              fontSize:"0.58rem", fontWeight:active?800:400,
              color:active?tab.color:"rgba(255,255,255,0.28)",
              letterSpacing:"0.04em", lineHeight:1,
              fontFamily:"'JetBrains Mono',monospace",
              transition:"color 0.2s",
            }}>{tab.label}</span>
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
                const layerMap: Record<string,string> = {markets:"capital",game_modes:"arena",terminal:"capital"};
              window.dispatchEvent(new CustomEvent("abraxas-tab",{detail:layerMap[tab.isInPage!]??tab.isInPage}));
                window.scrollTo({top:0,behavior:"smooth"});
              }
            }} style={sharedStyle}>
              {content}
            </div>
          );
        }

        return (
          <Link key={tab.key} href={tab.href!}
            onClick={()=>{setActiveInPage(""); window.scrollTo({top:0,behavior:"smooth"});}}
            style={sharedStyle}>
            {content}
          </Link>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </nav>
  );
}
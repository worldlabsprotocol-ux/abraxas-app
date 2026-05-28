// FILE: app/terminal/page.tsx
// Main terminal — Genesis Asset at top, Asset Terminal toggle.
// No auth wall. Mobile-first nav.
"use client";
import { useState }           from "react";
import { FlagshipAssetPage }  from "@/components/assets/FlagshipAssetPage";
import { TerminalLayout }     from "@/components/terminal/TerminalLayout";
import { CompactWallet }      from "@/components/CompactWallet";
import { LanguageSelector }   from "@/components/LanguageSelector";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

type View = "flagship" | "terminal";

export default function TerminalPage() {
  const [view, setView] = useState<View>("flagship");

  return (
    <div style={{ background:"#0C0E12", minHeight:"100vh" }}>

      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <div style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(12,14,18,0.97)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #1F2937",
        display:"flex", alignItems:"center",
        padding:"0 clamp(0.75rem,2.5vw,1.25rem)",
        height:"clamp(44px,6vw,52px)", gap:"clamp(0.375rem,1.5vw,0.625rem)",
        flexWrap:"nowrap", overflowX:"auto",
      }}>
        {/* Brand */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                       flexShrink:0, marginRight:"clamp(0.25rem,1vw,0.75rem)" }}>
          <span style={{ color:"#10B981", fontSize:"clamp(0.7rem,2vw,0.9rem)", lineHeight:1 }}>◈</span>
          <span style={{ fontFamily:M, fontSize:"clamp(0.52rem,1.6vw,0.72rem)",
                          fontWeight:900, color:"#f0f0f0", letterSpacing:"0.1em" }}>
            ABRAXAS
          </span>
        </div>

        {/* View tabs */}
        {([
          { id:"flagship" as View, label:"GENESIS ASSET" },
          { id:"terminal" as View, label:"ASSET TERMINAL" },
        ]).map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:"0.2rem clamp(0.4rem,1.5vw,0.75rem)",
            borderRadius:"3px",
            border:"1px solid " + (view === v.id ? "#3182CE" : "#1F2937"),
            background: view === v.id ? "rgba(49,130,206,0.12)" : "transparent",
            color: view === v.id ? "#3182CE" : "rgba(255,255,255,0.3)",
            fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)",
            fontWeight:700, cursor:"pointer",
            textTransform:"uppercase", letterSpacing:"0.1em",
            whiteSpace:"nowrap", flexShrink:0,
            transition:"all 0.15s",
          }}>{v.label}</button>
        ))}

        <div style={{ flex:1 }}/>

        {/* Right controls */}
        <LanguageSelector />

        <a href="/auth/signin" style={{
          fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)",
          color:"rgba(255,255,255,0.2)", textDecoration:"none",
          textTransform:"uppercase", letterSpacing:"0.1em",
          whiteSpace:"nowrap", flexShrink:0,
          padding:"0.2rem 0.4rem", borderRadius:"3px",
          border:"1px solid rgba(255,255,255,0.06)",
        }}>SIGN IN</a>

        <CompactWallet />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {view === "flagship" && <FlagshipAssetPage />}
      {view === "terminal" && <TerminalLayout />}
    </div>
  );
}

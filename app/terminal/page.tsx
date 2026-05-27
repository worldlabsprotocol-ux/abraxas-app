"use client";
// FILE: app/terminal/page.tsx
// Main terminal view — publicly accessible (no auth required for demo)
import { useState }            from "react";
import { TerminalLayout }      from "@/components/terminal/TerminalLayout";
import { FlagshipAssetPage }   from "@/components/assets/FlagshipAssetPage";

export default function TerminalPage() {
  const [view, setView] = useState<"terminal" | "flagship">("flagship");

  return (
    <>
      {/* Quick nav between views */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        height:40, background:"#0C0E12",
        borderBottom:"1px solid #1F2937",
        display:"flex", alignItems:"center",
        padding:"0 1rem", gap:"0.5rem",
        fontFamily:"'JetBrains Mono',monospace",
      }}>
        <span style={{ color:"#10B981", fontSize:"0.56rem", fontWeight:900,
                         letterSpacing:"0.12em", marginRight:"0.75rem" }}>
          ◈ ABRAXAS
        </span>
        {[
          { id:"flagship", label:"GENESIS ASSET" },
          { id:"terminal", label:"ASSET TERMINAL" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id as any)} style={{
            padding:"0.2rem 0.625rem", borderRadius:"3px",
            border:`1px solid ${view===v.id ? "#3182CE" : "#1F2937"}`,
            background: view===v.id ? "rgba(49,130,206,0.12)" : "transparent",
            color: view===v.id ? "#3182CE" : "rgba(255,255,255,0.3)",
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:"0.3rem", fontWeight:700, cursor:"pointer",
            textTransform:"uppercase", letterSpacing:"0.1em",
          }}>{v.label}</button>
        ))}
        <div style={{ flex:1 }}/>
        <a href="/auth/signin" style={{
          fontSize:"0.32rem", color:"rgba(255,255,255,0.2)",
          fontFamily:"'JetBrains Mono',monospace",
          textDecoration:"none", textTransform:"uppercase", letterSpacing:"0.1em",
        }}>SIGN IN →</a>
      </div>

      <div style={{ paddingTop:40 }}>
        {view === "flagship" && <FlagshipAssetPage />}
        {view === "terminal" && <TerminalLayout />}
      </div>
    </>
  );
}

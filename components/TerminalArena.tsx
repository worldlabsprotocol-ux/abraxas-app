// FILE: components/TerminalArena.tsx
// Main shell. ONE auth point (CompactWallet handles all states).
// Mobile-first header. LanguageSelector + Train always visible.
"use client";

import { useState, useEffect }  from "react";
import { PortfolioTab }         from "@/components/PortfolioTab";
import { BorrowPage }           from "@/components/BorrowPage";
import { IntroScreen }          from "@/components/IntroScreen";
import { CompactWallet }        from "@/components/CompactWallet";
import { LanguageSelector }     from "@/components/LanguageSelector";

const MONO      = "'JetBrains Mono',monospace";
const SESSION_KEY = "abraxas_intro_v3";
type Tab = "portfolio" | "borrow";

export function TerminalArena() {
  const [tab,       setTab]       = useState<Tab>("portfolio");
  const [showIntro, setShowIntro] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!sessionStorage.getItem(SESSION_KEY)) setShowIntro(true);
  }, []);

  return (
    <>
      {showIntro && (
        <IntroScreen onComplete={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setShowIntro(false);
        }} />
      )}

      <div style={{ minHeight:"100vh", background:"#070a14", display:"flex", flexDirection:"column" }}>

        {/* ── Header ───────────────────────────────────────────────── */}
        <header style={{
          height:"auto", minHeight:52,
          padding:"0.5rem 1rem",
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          flexWrap:"wrap", gap:"0.5rem",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          position:"sticky", top:0, zIndex:100,
          background:"rgba(7,10,20,0.97)", backdropFilter:"blur(16px)",
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexShrink:0 }}>
            <div style={{
              width:28, height:28, borderRadius:"6px",
              background:"linear-gradient(135deg, #7c3aed 0%, #C8A96E 100%)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:"0.7rem", fontWeight:900, color:"#fff", flexShrink:0,
            }}>A</div>
            <div>
              <div style={{ fontSize:"clamp(0.72rem, 2.5vw, 0.96rem)", fontWeight:900,
                             color:"#f0f0f0", fontFamily:MONO, letterSpacing:"0.1em",
                             lineHeight:1 }}>
                ABRAXAS
              </div>
              <div style={{ fontSize:"clamp(0.24rem, 0.8vw, 0.3rem)",
                             color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                             letterSpacing:"0.18em", textTransform:"uppercase" }}>
                Verification Protocol · Solana
              </div>
            </div>
          </div>

          {/* Right controls — single row on mobile, no duplicates */}
          <div style={{ display:"flex", alignItems:"center",
                        gap:"clamp(0.25rem, 1vw, 0.5rem)", flexShrink:0 }}>
            {mounted && <LanguageSelector />}

            <a href="/train" style={{
              fontSize:"clamp(0.32rem, 1vw, 0.44rem)", fontWeight:700,
              color:"rgba(107,140,255,0.55)", fontFamily:MONO,
              textDecoration:"none", letterSpacing:"0.1em",
              textTransform:"uppercase",
              padding:"0.25rem clamp(0.3rem, 1vw, 0.5rem)",
              border:"1px solid rgba(107,140,255,0.12)", borderRadius:"4px",
              whiteSpace:"nowrap",
            }}>Train</a>

            {/* ONE auth point — CompactWallet handles connect/signin/signout */}
            {mounted && <CompactWallet />}
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:960, margin:"0 auto",
                        padding:"1.5rem clamp(0.75rem, 3vw, 1.5rem) 5.5rem" }}>
            {tab === "portfolio" && <PortfolioTab />}
            {tab === "borrow"    && <BorrowPage />}
          </div>
        </main>

        {/* ── Bottom nav ───────────────────────────────────────────── */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0,
          height:"clamp(46px, 7vw, 52px)",
          display:"flex", borderTop:"1px solid rgba(255,255,255,0.07)",
          background:"rgba(7,10,20,0.97)", backdropFilter:"blur(16px)", zIndex:100,
        }}>
          {(["portfolio","borrow"] as Tab[]).map(id => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, height:"100%", border:"none", cursor:"pointer",
                fontFamily:MONO,
                fontSize:"clamp(0.44rem, 1.5vw, 0.56rem)",
                fontWeight: active ? 800 : 400,
                letterSpacing:"0.08em", textTransform:"uppercase",
                background: active ? "rgba(124,58,237,0.08)" : "transparent",
                color: active ? "#f0f0f0" : "rgba(255,255,255,0.22)",
                borderTop: active ? "2px solid #7c3aed" : "2px solid transparent",
                transition:"all 0.15s",
              }}>
                {id === "portfolio" ? "Portfolio" : "Borrow"}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

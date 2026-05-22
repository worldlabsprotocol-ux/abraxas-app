"use client";
// FILE: components/TerminalArena.tsx
// Main application shell. Header + tabs + bottom nav.
// LanguageSelector, CompactWallet, Auth link, Train all visible.
import { useState, useEffect }  from "react";
import { PortfolioTab }         from "@/components/PortfolioTab";
import { BorrowPage }           from "@/components/BorrowPage";
import { IntroScreen }          from "@/components/IntroScreen";
import { CompactWallet }        from "@/components/CompactWallet";
import { LanguageSelector }     from "@/components/LanguageSelector";
import { useWallet }            from "@solana/wallet-adapter-react";
import { useSession }           from "next-auth/react";

const MONO = "'JetBrains Mono',monospace";
type Tab = "portfolio" | "borrow";
const SESSION_KEY = "abraxas_intro_v3";

export function TerminalArena() {
  const [tab,       setTab]       = useState<Tab>("portfolio");
  const [showIntro, setShowIntro] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const { connected } = useWallet();
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
    if (!sessionStorage.getItem(SESSION_KEY)) setShowIntro(true);
  }, []);

  const TAB_LABELS: Record<Tab, string> = {
    portfolio: "Portfolio",
    borrow:    "Borrow",
  };

  return (
    <>
      {showIntro && (
        <IntroScreen onComplete={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setShowIntro(false);
        }} />
      )}

      <div style={{ minHeight:"100vh", background:"#060810", display:"flex", flexDirection:"column" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          height:52, padding:"0 1.25rem",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          position:"sticky", top:0, zIndex:100,
          background:"rgba(6,8,16,0.98)", backdropFilter:"blur(12px)",
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
            <span style={{ fontSize:"1rem", fontWeight:900, color:"#f0f0f0",
                           fontFamily:MONO, letterSpacing:"0.1em" }}>ABRAXAS</span>
            <span style={{ fontSize:"0.32rem", color:"rgba(255,255,255,0.18)",
                           fontFamily:MONO, letterSpacing:"0.25em",
                           textTransform:"uppercase" }}>Verification Protocol · Solana</span>
          </div>

          {/* Right side controls */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            {/* Language selector — always visible */}
            {mounted && <LanguageSelector />}

            {/* Train */}
            <a href="/train" style={{
              fontSize:"0.44rem", fontWeight:700,
              color:"rgba(107,140,255,0.6)", fontFamily:MONO,
              textDecoration:"none", letterSpacing:"0.12em",
              textTransform:"uppercase", padding:"0.3rem 0.6rem",
              border:"1px solid rgba(107,140,255,0.15)", borderRadius:"4px",
              transition:"all 0.15s",
            }}>Train</a>

            {/* Sign In link when not authenticated */}
            {mounted && !session && !connected && (
              <a href="/auth/signin" style={{
                fontSize:"0.44rem", fontWeight:700,
                color:"rgba(200,169,110,0.7)", fontFamily:MONO,
                textDecoration:"none", letterSpacing:"0.08em",
                padding:"0.3rem 0.7rem",
                border:"1px solid rgba(200,169,110,0.25)", borderRadius:"4px",
                background:"rgba(200,169,110,0.06)",
                transition:"all 0.15s",
              }}>Sign In</a>
            )}

            {/* Wallet */}
            {mounted && <CompactWallet />}
          </div>
        </header>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <main style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:960, margin:"0 auto", padding:"1.5rem 1rem 5.5rem" }}>
            {tab === "portfolio" && <PortfolioTab />}
            {tab === "borrow"    && <BorrowPage />}
          </div>
        </main>

        {/* ── Bottom nav ─────────────────────────────────────────────────── */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0, height:50,
          display:"flex", borderTop:"1px solid rgba(255,255,255,0.06)",
          background:"rgba(6,8,16,0.98)", backdropFilter:"blur(12px)", zIndex:100,
        }}>
          {(["portfolio","borrow"] as Tab[]).map(id => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, height:"100%", border:"none", cursor:"pointer",
                fontFamily:MONO, fontSize:"0.54rem", fontWeight: active ? 800 : 400,
                letterSpacing:"0.08em", textTransform:"uppercase",
                background: active ? "rgba(255,255,255,0.03)" : "transparent",
                color: active ? "#f0f0f0" : "rgba(255,255,255,0.25)",
                borderTop: active ? "2px solid #7c3aed" : "2px solid transparent",
                transition:"all 0.15s",
              }}>
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

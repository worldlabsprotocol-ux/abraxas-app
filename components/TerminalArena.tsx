// FILE: components/TerminalArena.tsx
// Uses CompactWallet instead of WalletMultiButton.
// Correct tab structure. Admin and Train links. Clean nav.
"use client";

import { useState, useEffect }  from "react";
import { PortfolioTab }         from "@/components/PortfolioTab";
import { BorrowPage }           from "@/components/BorrowPage";
import { IntroScreen }          from "@/components/IntroScreen";
import { CompactWallet }        from "@/components/CompactWallet";
import { useWallet }            from "@solana/wallet-adapter-react";
import { useWalletAuth }        from "@/lib/hooks/useWalletAuth";

const MONO = "'JetBrains Mono',monospace";
type Tab = "portfolio" | "borrow";
const SESSION_KEY = "abraxas_intro_v2";

export function TerminalArena() {
  const [tab,       setTab]       = useState<Tab>("portfolio");
  const [showIntro, setShowIntro] = useState(false);
  const [mounted,   setMounted]   = useState(false);

  const { connected }  = useWallet();
  const { isVerified } = useWalletAuth();

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
        }}/>
      )}

      <div style={{ minHeight:"100vh", background:"#060810",
                    display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <header style={{
          height:48, padding:"0 1.25rem",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          position:"sticky", top:0, zIndex:100,
          background:"rgba(6,8,16,0.98)", backdropFilter:"blur(12px)",
        }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
            <span style={{ fontSize:"0.92rem", fontWeight:900, color:"#f0f0f0",
                           fontFamily:MONO, letterSpacing:"0.1em" }}>ABRAXAS</span>
            <span style={{ fontSize:"0.34rem", color:"rgba(255,255,255,0.18)",
                           fontFamily:MONO, letterSpacing:"0.25em",
                           textTransform:"uppercase" }}>PROTOCOL</span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
            {/* Admin — verified wallets only */}
            {mounted && connected && isVerified && (
              <a href="/admin" style={{
                fontSize:"0.42rem", fontWeight:700, color:"rgba(200,169,110,0.5)",
                fontFamily:MONO, textDecoration:"none", letterSpacing:"0.14em",
                textTransform:"uppercase", padding:"0.25rem 0.5rem",
                border:"1px solid rgba(200,169,110,0.14)", borderRadius:"3px",
              }}>Admin</a>
            )}
            {/* Train — always visible, links to /games */}
            <a href="/games" style={{
              fontSize:"0.42rem", fontWeight:700, color:"rgba(107,140,255,0.5)",
              fontFamily:MONO, textDecoration:"none", letterSpacing:"0.14em",
              textTransform:"uppercase", padding:"0.25rem 0.5rem",
              border:"1px solid rgba(107,140,255,0.14)", borderRadius:"3px",
            }}>Train</a>

            {/* Compact wallet — replaces WalletMultiButton */}
            <CompactWallet/>
          </div>
        </header>

        {/* Main content */}
        <main style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:960, margin:"0 auto", padding:"1.5rem 1rem 5.5rem" }}>
            {tab === "portfolio" && <PortfolioTab />}
            {tab === "borrow"    && <BorrowPage />}
          </div>
        </main>

        {/* Bottom nav */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0, height:48,
          display:"flex", borderTop:"1px solid rgba(255,255,255,0.06)",
          background:"rgba(6,8,16,0.98)", backdropFilter:"blur(12px)", zIndex:100,
        }}>
          {([["portfolio","Portfolio"],["borrow","Borrow"]] as const).map(([id,label]) => {
            const active = tab === id;
            return(
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, height:"100%", border:"none", cursor:"pointer",
                fontFamily:MONO, fontSize:"0.52rem",
                fontWeight:active?800:400, letterSpacing:"0.08em",
                textTransform:"uppercase", background:active?"rgba(255,255,255,0.03)":"transparent",
                color:active?"#f0f0f0":"rgba(255,255,255,0.25)",
                borderTop:active?"2px solid #7c3aed":"2px solid transparent",
                transition:"all 0.15s",
              }}>{label}</button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
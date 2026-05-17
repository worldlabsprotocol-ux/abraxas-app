// FILE: components/TerminalArena.tsx — CANONICAL
// 2 tabs: Portfolio + Borrow. Clean imports. Zero dead references.
"use client";

import { useState, useEffect }  from "react";
import { PortfolioTab }         from "@/components/PortfolioTab";
import { BorrowPage }           from "@/components/BorrowPage";
import { IntroScreen }          from "@/components/IntroScreen";
import { WalletMultiButton }    from "@solana/wallet-adapter-react-ui";
import { useWallet }            from "@solana/wallet-adapter-react";
import { useWalletAuth }        from "@/lib/hooks/useWalletAuth";

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
        }} />
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
            <span style={{ fontSize:"0.94rem", fontWeight:900, color:"#f0f0f0",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.1em" }}>ABRAXAS</span>
            <span style={{ fontSize:"0.34rem", color:"rgba(255,255,255,0.18)",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.25em", textTransform:"uppercase" }}>
              PROTOCOL
            </span>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            {/* Admin — only visible when wallet is verified */}
            {mounted && connected && isVerified && (
              <a href="/admin" style={{
                fontSize:"0.42rem", fontWeight:700,
                color:"rgba(200,169,110,0.5)",
                fontFamily:"'JetBrains Mono',monospace",
                textDecoration:"none", letterSpacing:"0.15em",
                textTransform:"uppercase", padding:"0.2rem 0.5rem",
                border:"1px solid rgba(200,169,110,0.15)", borderRadius:"3px",
              }}>Admin</a>
            )}
            {/* Games link */}
            <a href="/games" style={{
              fontSize:"0.42rem", fontWeight:700,
              color:"rgba(107,140,255,0.5)",
              fontFamily:"'JetBrains Mono',monospace",
              textDecoration:"none", letterSpacing:"0.15em",
              textTransform:"uppercase", padding:"0.2rem 0.5rem",
              border:"1px solid rgba(107,140,255,0.12)", borderRadius:"3px",
            }}>Train</a>

            <style>{`
              .wallet-adapter-button{
                background:#7c3aed!important;border-radius:6px!important;
                font-size:0.58rem!important;padding:0.38rem 0.8rem!important;
                height:auto!important;font-family:'JetBrains Mono',monospace!important;
                font-weight:700!important;letter-spacing:0.04em!important;border:none!important;
              }
              .wallet-adapter-button:hover{background:#6d28d9!important;}
            `}</style>
            <WalletMultiButton />
          </div>
        </header>

        {/* Content */}
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
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, height:"100%", border:"none", cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:"0.52rem", fontWeight:active ? 800 : 400,
                letterSpacing:"0.08em", textTransform:"uppercase",
                background: active ? "rgba(255,255,255,0.03)" : "transparent",
                color:      active ? "#f0f0f0" : "rgba(255,255,255,0.25)",
                borderTop:  active ? "2px solid #7c3aed" : "2px solid transparent",
                transition:"all 0.15s",
              }}>{label}</button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
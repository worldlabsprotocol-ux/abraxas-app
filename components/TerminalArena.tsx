// FILE: components/TerminalArena.tsx
"use client";
// 4-tab hub: Portfolio · Studio · Markets · Capital
// Portfolio is default landing. Institutional design.
"use client";

import { useState, useEffect }          from "react";
import { IssuanceEngine }               from "@/components/IssuanceEngine";
import { MarketsLayer }                 from "@/components/MarketsLayer";
import { LoopscaleBorrowSimulator }     from "@/components/LoopscaleBorrowSimulator";
import { IntroScreen }                  from "@/components/IntroScreen";
import { PortfolioTab }                 from "@/components/PortfolioTab";
import { WalletMultiButton }            from "@solana/wallet-adapter-react-ui";

type Tab = "portfolio" | "studio" | "markets" | "capital";

const SESSION_KEY = "abraxas_intro_done";

// Distinct color per tab — visible, bold, institutional
const TAB_COLORS: Record<Tab,string> = {
  portfolio: "#C8A96E",   // gold
  studio:    "#14F195",   // emerald
  markets:   "#6b8cff",   // cobalt
  capital:   "#a855f7",   // violet
};

const TABS: { id:Tab; label:string }[] = [
  { id:"portfolio", label:"Portfolio" },
  { id:"studio",    label:"Studio"    },
  { id:"markets",   label:"Markets"   },
  { id:"capital",   label:"Capital"   },
];

export function TerminalArena() {
  const [tab,        setTab]       = useState<Tab>("portfolio");
  const [showIntro,  setShowIntro] = useState(false);
  const [mounted,    setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!sessionStorage.getItem(SESSION_KEY)) setShowIntro(true);
    const handler = (e: Event) => {
      const t = (e as CustomEvent<{tab:Tab}>).detail?.tab;
      if (t) setTab(t as Tab);
    };
    window.addEventListener("abraxas-tab", handler);
    return () => window.removeEventListener("abraxas-tab", handler);
  }, []);

  function doneIntro() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShowIntro(false);
  }

  return (
    <>
      {showIntro && <IntroScreen onComplete={doneIntro} />}

      <div style={{ minHeight:"100vh", background:"#060810",
                    display:"flex", flexDirection:"column" }}>

        {/* ── Top nav ─────────────────────────────────────────────────── */}
        <nav style={{
          padding:"0 1.25rem",
          borderBottom:"1px solid rgba(255,255,255,0.05)",
          display:"flex", alignItems:"center",
          justifyContent:"space-between",
          height:52,
          position:"sticky", top:0, zIndex:100,
          background:"rgba(6,8,16,0.98)",
          backdropFilter:"blur(12px)",
        }}>
          {/* Wordmark */}
          <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
            <span style={{ fontSize:"0.92rem", fontWeight:900, color:"#C8A96E",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.08em" }}>ABRAXAS</span>
            <span style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.15)",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.25em", textTransform:"uppercase" }}>
              PROTOCOL
            </span>
          </div>

          {/* Wallet button — all purple, no green */}
          <style>{`
            .wallet-adapter-button {
              background: #7c3aed !important;
              border-radius: 8px !important;
              font-size: 0.58rem !important;
              padding: 0.4rem 0.875rem !important;
              height: auto !important;
              font-family: 'JetBrains Mono', monospace !important;
              font-weight: 700 !important;
              letter-spacing: 0.04em !important;
              transition: background 0.15s !important;
            }
            .wallet-adapter-button:hover {
              background: #6d28d9 !important;
            }
            .wallet-adapter-button-trigger {
              background: #7c3aed !important;
            }
          `}</style>
          <WalletMultiButton />
        </nav>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ maxWidth:960, margin:"0 auto",
                        padding:"1.25rem 1rem 6rem" }}>
            {tab === "portfolio" && (
              <PortfolioTab onTokenize={() => setTab("studio")} />
            )}
            {tab === "studio" && (
              <IssuanceEngine onSuccess={() => setTab("portfolio")} />
            )}
            {tab === "markets" && (
              <MarketsLayer onTokenize={() => setTab("studio")} />
            )}
            {tab === "capital" && (
              <LoopscaleBorrowSimulator />
            )}
          </div>
        </div>

        {/* ── Bottom nav ──────────────────────────────────────────────── */}
        <nav style={{
          position:"fixed", bottom:0, left:0, right:0,
          borderTop:"1px solid rgba(255,255,255,0.05)",
          display:"flex",
          background:"rgba(6,8,16,0.98)",
          backdropFilter:"blur(12px)",
          zIndex:100,
        }}>
          {TABS.map(({ id, label }) => {
            const active  = tab === id;
            const color   = TAB_COLORS[id];
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                flex:1, padding:"0.8rem 0",
                border:"none", cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:"0.5rem",
                fontWeight: active ? 800 : 500,
                letterSpacing:"0.05em",
                textTransform:"uppercase",
                transition:"all 0.18s",
                background: active ? `${color}10` : "transparent",
                color:       active ? color        : "rgba(255,255,255,0.25)",
                borderTop:   active ? `2px solid ${color}` : "2px solid transparent",
                boxShadow:   active ? `inset 0 -1px 0 0 ${color}20` : "none",
              }}>
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
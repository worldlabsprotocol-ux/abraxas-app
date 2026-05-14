// FILE: components/TerminalArena.tsx
"use client";
// 3-tab hub: Markets · Studio · Capital
// Intro screen on first session load.
"use client";

import { useState, useEffect } from "react";
import { IssuanceEngine }       from "@/components/IssuanceEngine";
import { MarketsLayer }          from "@/components/MarketsLayer";
import { LoopscaleBorrowSimulator } from "@/components/LoopscaleBorrowSimulator";
import { IntroScreen }           from "@/components/IntroScreen";
import { WalletMultiButton }     from "@solana/wallet-adapter-react-ui";
import { useAbraStore }          from "@/lib/abraxasStore";

type Tab = "markets" | "studio" | "capital";

const SESSION_KEY = "abraxas_intro_done";

export function TerminalArena() {
  const [tab,       setTab]      = useState<Tab>("markets");
  const [showIntro, setShowIntro]= useState(false);
  const [mounted,   setMounted]  = useState(false);
  const abraBalance = useAbraStore(s => s.abraBalance);

  useEffect(() => {
    setMounted(true);
    // Show intro only once per session
    if (typeof window !== "undefined" && !sessionStorage.getItem(SESSION_KEY)) {
      setShowIntro(true);
    }
    const handler = (e: Event) => {
      const t = (e as CustomEvent<{tab:Tab}>).detail?.tab;
      if (t) setTab(t);
    };
    window.addEventListener("abraxas-tab", handler);
    return () => window.removeEventListener("abraxas-tab", handler);
  }, []);

  function handleIntroComplete() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShowIntro(false);
  }

  const TABS: {id:Tab; label:string}[] = [
    { id:"markets", label:"II · Markets"  },
    { id:"studio",  label:"III · Studio"  },
    { id:"capital", label:"I · Capital"   },
  ];

  return (
    <>
      {showIntro && <IntroScreen onComplete={handleIntroComplete} />}

      <div style={{ minHeight:"100vh", background:"#060810",
                    display:"flex", flexDirection:"column" }}>

        {/* Top nav */}
        <nav style={{ padding:"0.5rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.06)",
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      gap:"0.75rem", position:"sticky", top:0, zIndex:100,
                      background:"rgba(6,8,16,0.97)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <span style={{ fontSize:"0.9rem", fontWeight:900, color:"#C8A96E",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.06em" }}>ABRAXAS</span>
            <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.18)",
                           fontFamily:"'JetBrains Mono',monospace",
                           letterSpacing:"0.2em" }}>PROTOCOL</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
            {mounted && (
              <div style={{ padding:"0.25rem 0.6rem", borderRadius:"6px",
                            background:"rgba(200,169,110,0.08)",
                            border:"1px solid rgba(200,169,110,0.2)" }}>
                <span style={{ fontSize:"0.48rem", fontWeight:700, color:"#C8A96E",
                               fontFamily:"'JetBrains Mono',monospace" }}>
                  {abraBalance.toLocaleString()} $ABRA
                </span>
              </div>
            )}
            <WalletMultiButton style={{ fontSize:"0.58rem", padding:"0.35rem 0.75rem",
                                        borderRadius:"7px", height:"auto" }} />
          </div>
        </nav>

        {/* Content */}
        <div style={{ flex:1, overflow:"auto" }}>
          <div style={{ maxWidth:960, margin:"0 auto", padding:"1rem 1rem 5rem" }}>
            {tab === "markets" && (
              <MarketsLayer onTokenize={() => setTab("studio")} />
            )}
            {tab === "studio" && (
              <IssuanceEngine onSuccess={() => setTab("markets")} />
            )}
            {tab === "capital" && (
              <LoopscaleBorrowSimulator />
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <nav style={{ position:"fixed", bottom:0, left:0, right:0,
                      borderTop:"1px solid rgba(255,255,255,0.06)",
                      display:"flex", background:"rgba(6,8,16,0.97)",
                      backdropFilter:"blur(12px)" }}>
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex:1, padding:"0.875rem 0", border:"none", cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:"0.52rem",
              fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
              transition:"all 0.15s",
              background: tab===id ? "rgba(200,169,110,0.07)" : "transparent",
              color:       tab===id ? "#C8A96E"               : "rgba(255,255,255,0.28)",
              borderTop:   tab===id ? "2px solid #C8A96E"     : "2px solid transparent",
            }}>{label}</button>
          ))}
        </nav>
      </div>
    </>
  );
}
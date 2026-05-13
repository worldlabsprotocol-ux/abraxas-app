// FILE: components/TerminalArena.tsx
// 2-tab hub: Studio (mint) + Markets (asset cards).
// Capital tab removed — will be reintroduced after mint flow is stable.
"use client";
"use client";

import { useState, useEffect } from "react";
import { IssuanceEngine } from "@/components/IssuanceEngine";
import { MarketsLayer } from "@/components/MarketsLayer";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAbraStore } from "@/lib/abraxasStore";

type Tab = "studio" | "markets";

export function TerminalArena() {
  const [tab, setTab]       = useState<Tab>("markets");
  const [mounted, setMounted] = useState(false);
  const abraBalance           = useAbraStore(s => s.abraBalance);

  useEffect(() => {
    setMounted(true);
    // Listen for tab switch events from IssuanceEngine success state
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{tab:Tab}>;
      if (ce.detail?.tab) setTab(ce.detail.tab);
    };
    window.addEventListener("abraxas-tab", handler);
    return () => window.removeEventListener("abraxas-tab", handler);
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#060810", display:"flex", flexDirection:"column" }}>

      {/* Top nav */}
      <nav style={{ padding:"0.625rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.06)",
                    display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span style={{ fontSize:"0.9rem", fontWeight:900, color:"#C8A96E",
                         fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>ABRAXAS</span>
          <span style={{ fontSize:"0.42rem", color:"rgba(255,255,255,0.2)",
                         fontFamily:"'JetBrains Mono',monospace" }}>PROTOCOL</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          {mounted && (
            <div style={{ fontSize:"0.5rem", color:"rgba(200,169,110,0.7)",
                          fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
              {abraBalance.toLocaleString()} $ABRA
            </div>
          )}
          <WalletMultiButton style={{ fontSize:"0.6rem", padding:"0.4rem 0.875rem",
                                      borderRadius:"8px", height:"auto" }} />
        </div>
      </nav>

      {/* Content */}
      <div style={{ flex:1, overflow:"auto", padding:"1rem" }}>
        {tab === "studio"  && <IssuanceEngine onSuccess={() => setTab("markets")} />}
        {tab === "markets" && <MarketsLayer onTokenize={() => setTab("studio")} />}
      </div>

      {/* Bottom nav */}
      <nav style={{ borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex",
                    background:"rgba(6,8,16,0.98)" }}>
        {([["markets","II · Markets"],["studio","III · Studio"]] as [Tab,string][]).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:"0.875rem 0", border:"none", cursor:"pointer",
            fontFamily:"'JetBrains Mono',monospace", fontSize:"0.56rem", fontWeight:700,
            letterSpacing:"0.06em", textTransform:"uppercase", transition:"all 0.15s",
            background: tab===t ? "rgba(200,169,110,0.08)" : "transparent",
            color:       tab===t ? "#C8A96E"               : "rgba(255,255,255,0.3)",
            borderTop:   tab===t ? "2px solid #C8A96E"     : "2px solid transparent",
          }}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
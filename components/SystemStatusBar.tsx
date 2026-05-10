// FILE: components/SystemStatusBar.tsx
// Lean protocol bar: Circuit state + live RWA market note + Protocol Online.
// Removed: Sophia Agents link, vault count, $0 unrecovered.
"use client";

import { useCircuitState } from "@/lib/protocolStream";
import { useState, useEffect } from "react";

const STATE_COLORS = {
  SAFE:  { text:"#14F195", bg:"rgba(20,241,149,0.06)",  border:"rgba(20,241,149,0.15)"  },
  WATCH: { text:"#FBBF24", bg:"rgba(251,191,36,0.06)",  border:"rgba(251,191,36,0.18)"  },
  RISK:  { text:"#f26b6b", bg:"rgba(242,107,107,0.07)", border:"rgba(242,107,107,0.2)"  },
};

const RWA_TICKERS = [
  "RWA Mkt Cap $18.4B  +3.2% · ",
  "Stablecoin Supply $240B · Tether $141B · USDC $61B · ",
  "Tokenized T-Bills AUM $3.1B  +12% MoM · ",
  "Centrifuge TVL $642M · Maple $385M · Goldfinch $124M · ",
  "BlackRock BUIDL $520M · Franklin OnChain $420M · ",
  "Solana RWA TVL $2.2B  +41% YTD · ",
];

export function SystemStatusBar() {
  const { state, pulse } = useCircuitState();
  const c = STATE_COLORS[state];
  const [tickIdx, setTickIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTickIdx(i => (i+1) % RWA_TICKERS.length), 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position:"fixed", top:"52px", left:0, right:0, zIndex:48,
      height:"28px",
      background:"rgba(2,3,10,0.97)",
      borderBottom:`1px solid ${c.border}`,
      display:"flex", alignItems:"center",
      padding:"0 1rem", gap:"1rem",
      backdropFilter:"blur(12px)",
      overflowX:"auto",
    }}>
      {/* Circuit state */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", flexShrink:0 }}>
        <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:c.text,animation:pulse?"pulse 1.2s ease-in-out infinite":"none" }} />
        <span style={{ fontSize:"0.52rem",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:c.text,fontFamily:"'JetBrains Mono',monospace" }}>
          CIRCUIT {state}
        </span>
      </div>

      <div style={{ width:"1px",height:"12px",background:"rgba(255,255,255,0.07)",flexShrink:0 }} />

      {/* Scrolling RWA market data */}
      <div style={{ flex:1, overflow:"hidden", position:"relative", height:"100%" }}>
        <div key={tickIdx} style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center", animation:"slideInTicker 0.5s ease-out" }}>
          <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>
            {RWA_TICKERS[tickIdx]}
          </span>
        </div>
      </div>

      <div style={{ width:"1px",height:"12px",background:"rgba(255,255,255,0.07)",flexShrink:0 }} />

      {/* Protocol online */}
      <div style={{ display:"flex",alignItems:"center",gap:"0.3rem",flexShrink:0 }}>
        <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:"#14F195",animation:"pulse 2s ease-in-out infinite" }} />
        <span style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
          Protocol Online
        </span>
      </div>

      <style>{`@keyframes slideInTicker{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
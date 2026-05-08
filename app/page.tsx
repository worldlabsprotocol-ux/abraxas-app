// FILE: app/page.tsx
// Abraxas Sovereign Terminal — no fake connect button, no Enter Arena button.
// Layout: StatusBar → ProtocolOverview (with Buy ABRA) → TerminalArena
// TerminalArena internal order: SoldTape → TokenizeCTA → StockPanel → MetalsStrip → ArenaEngine
"use client";

import { Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TerminalArena, TerminalArenaSkeleton } from "@/components/TerminalArena";
import { useCircuitState } from "@/lib/protocolStream";

// ─── Status bar (price feed + circuit state) ──────────────────────────────────
function StatusBar() {
  const { state } = useCircuitState();
  const color = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";
  return (
    <div style={{ padding:"0.28rem 1.25rem", background:"rgba(2,3,10,0.97)", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.4rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.875rem", flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
          <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:color,animation:"pulse 1.5s ease-in-out infinite",flexShrink:0 }} />
          <span style={{ fontSize:"0.46rem",fontWeight:700,color,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>Circuit {state === "RISK" ? "Alert" : state === "WATCH" ? "Watch" : "Safe"}</span>
        </div>
        {[
          { label:"XAU",  value:"$4,733.39", color:"#D4AF37" },
          { label:"XAG",  value:"$72.91",    color:"#C0C0C0" },
          { label:"NVDA", value:"$211.48",   color:"#76B900" },
          { label:"TSLA", value:"$411.89",   color:"#CC0000" },
          { label:"AAPL", value:"$287.46",   color:"#f0f0f0" },
        ].map(({ label, value, color: c }) => (
          <span key={label} style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>
            {label} <span style={{ color:c,fontWeight:700 }}>{value}</span>
          </span>
        ))}
      </div>
      <span style={{ fontSize:"0.42rem",color:"rgba(255,255,255,0.16)",fontFamily:"'JetBrains Mono',monospace" }}>
        Solana · Token-2022 · {new Date().toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Protocol overview — buy ABRA + institutional description ─────────────────
function ProtocolOverview() {
  const { connected, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div style={{ padding:"1.25rem 1.25rem 0.75rem", background:"radial-gradient(ellipse at 50% -20%, rgba(107,140,255,0.06) 0%, transparent 65%)" }}>

      {/* Title row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"0.875rem" }}>
        <div>
          <p style={{ fontSize:"0.48rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
            World Labs Protocol · Solana Mainnet
          </p>
          <h1 style={{ fontWeight:900,fontSize:"clamp(1.2rem,3.5vw,1.7rem)",letterSpacing:"-0.03em",margin:0, background:"linear-gradient(135deg,#D4AF37,#a855f7 45%,#6b8cff)", WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            Sovereign RWA Terminal
          </h1>
        </div>

        {/* Actions — Buy ABRA + wallet */}
        <div style={{ display:"flex", gap:"0.4rem", alignItems:"center", flexWrap:"wrap" }}>
          <a href="https://jup.ag/swap/SOL-5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.75rem",borderRadius:"7px",fontSize:"0.58rem",fontWeight:700, background:"rgba(255,133,0,0.12)",border:"1px solid rgba(255,133,0,0.3)",color:"#FF8500",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace",display:"inline-flex",alignItems:"center",gap:"0.3rem" }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#FF8500"><path d="M10 2L3 7v6c0 4 3 7 7 8 4-1 7-4 7-8V7L10 2z"/></svg>
            Buy $ABRA · Jupiter
          </a>
          <a href="https://app.bags.fm/abraxas" target="_blank" rel="noopener noreferrer" style={{ padding:"0.35rem 0.75rem",borderRadius:"7px",fontSize:"0.58rem",fontWeight:700, background:"rgba(107,140,255,0.1)",border:"1px solid rgba(107,140,255,0.25)",color:"#6b8cff",textDecoration:"none",fontFamily:"'JetBrains Mono',monospace",display:"inline-flex",alignItems:"center",gap:"0.3rem" }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#6b8cff"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4a3 3 0 016 0v2" stroke="#6b8cff" fill="none" strokeWidth="1.5"/></svg>
            Buy $ABRA · Bags
          </a>
          {/* Wallet — only show if wallet extension detected */}
          {wallet && !connected && !connecting && (
            <button onClick={() => setVisible(true)} style={{ padding:"0.35rem 0.75rem",borderRadius:"7px",fontSize:"0.58rem",fontWeight:700,background:"rgba(6,8,16,0.9)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
              Connect Wallet
            </button>
          )}
          {!wallet && (
            <button onClick={() => setVisible(true)} style={{ padding:"0.35rem 0.75rem",borderRadius:"7px",fontSize:"0.58rem",fontWeight:700,background:"rgba(6,8,16,0.9)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.35)",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>
              Install Wallet
            </button>
          )}
          {connecting && (
            <span style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Connecting…</span>
          )}
          {connected && (
            <button onClick={() => disconnect()} style={{ padding:"0.35rem 0.75rem",borderRadius:"7px",fontSize:"0.58rem",fontWeight:700,background:"rgba(20,241,149,0.08)",border:"1px solid rgba(20,241,149,0.25)",color:"#14F195",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace",display:"flex",alignItems:"center",gap:"0.3rem" }}>
              <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#14F195",animation:"pulse 2s ease-in-out infinite" }} />
              Connected · Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Protocol description */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"0.5rem", marginBottom:"0.5rem" }}>
        {[
          { label:"What Abraxas Does", body:"An autonomous AI operating layer for tokenized real-world assets on Solana. Each vault holds verified physical collectibles, precious metals, equities, and luxury assets governed by Sophia Agents and defended by Circuit Engine." },
          { label:"Sovereign Arena", body:"Financialized strategic asset combat. Assets enter the Arena with real economic attributes — risk score, liquidity depth, yield, momentum. Sophia Agents apply macro buffs. Match outcomes are semi-deterministic, data-influenced, and wager-compatible." },
          { label:"x402 Settlement", body:"Micropayments power autonomous execution. Arena antes, agent oracle fees, and hedge settlements run through x402 middleware on Solana — instant, sub-cent, no approval required. This is how the protocol funds itself without human intervention." },
        ].map(item => (
          <div key={item.label} style={{ padding:"0.625rem 0.75rem",background:"rgba(6,8,16,0.92)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:"8px" }}>
            <div style={{ fontSize:"0.52rem",fontWeight:700,color:"#f0f0f0",marginBottom:"0.25rem",letterSpacing:"0.02em" }}>{item.label}</div>
            <div style={{ fontSize:"0.51rem",color:"rgba(255,255,255,0.4)",lineHeight:1.65 }}>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", paddingBottom:"5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <StatusBar />
      <ProtocolOverview />
      <Suspense fallback={<TerminalArenaSkeleton />}>
        <TerminalArena />
      </Suspense>
    </div>
  );
}
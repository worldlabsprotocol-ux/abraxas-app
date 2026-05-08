// FILE: app/page.tsx
// Abraxas Sovereign Terminal — unified hub.
// No top nav links. BottomNav only. No "Enter Arena" hero button (Terminal IS the arena).
// WalletStatus tied to real wallet adapter.
"use client";

import { useState, useEffect, Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { TerminalArena, TerminalArenaSkeleton } from "@/components/TerminalArena";
import { useSystemState } from "@/lib/systemState";
import { useCircuitState } from "@/lib/protocolStream";

// ─── Protocol status bar ──────────────────────────────────────────────────────
function StatusBar() {
  const { state } = useCircuitState();
  const color = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";

  return (
    <div style={{
      padding:"0.28rem 1.25rem",
      background:"rgba(2,3,10,0.97)",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
      display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.4rem",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
          <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:color,animation:"pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.48rem",fontWeight:700,color,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>
            Sovereign Protocol Online
          </span>
        </div>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>
          XAU <span style={{ color:"#D4AF37",fontWeight:700 }}>$4,733.39</span>
        </span>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>
          XAG <span style={{ color:"#C0C0C0",fontWeight:700 }}>$72.91</span>
        </span>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>
          NVDA <span style={{ color:"#76B900",fontWeight:700 }}>$211.48</span>
        </span>
        <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.22)",fontFamily:"'JetBrains Mono',monospace" }}>
          TSLA <span style={{ color:"#CC0000",fontWeight:700 }}>$411.89</span>
        </span>
      </div>
      <span style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.18)",fontFamily:"'JetBrains Mono',monospace" }}>
        Solana · Token-2022 · {new Date().toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Protocol overview — replaces the old hero with purpose/depth ─────────────
function ProtocolOverview() {
  return (
    <div style={{
      padding:"1.25rem 1.25rem 0.5rem",
      background:"radial-gradient(ellipse at 50% -30%, rgba(107,140,255,0.07) 0%, transparent 65%)",
    }}>
      {/* Wordmark row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"0.875rem" }}>
        <div>
          <p style={{ fontSize:"0.5rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
            World Labs Protocol · Solana Mainnet
          </p>
          <h1 style={{ fontWeight:900,fontSize:"clamp(1.2rem,3.5vw,1.7rem)",letterSpacing:"-0.03em",margin:0,
            background:"linear-gradient(135deg,#D4AF37,#a855f7 45%,#6b8cff)",
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
            Sovereign RWA Terminal
          </h1>
        </div>
        {/* Buy ABRA */}
        <div style={{ display:"flex", gap:"0.4rem" }}>
          <a href="https://jup.ag/swap/SOL-ABRA" target="_blank" rel="noopener noreferrer" style={{
            padding:"0.35rem 0.75rem", borderRadius:"7px", fontSize:"0.58rem", fontWeight:700,
            background:"rgba(200,169,110,0.12)", border:"1px solid rgba(200,169,110,0.3)",
            color:"#C8A96E", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace",
            display:"inline-flex", alignItems:"center", gap:"0.3rem",
          }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#FF8500"><path d="M10 2L3 7v6c0 4 3 7 7 8 4-1 7-4 7-8V7L10 2z"/></svg>
            Buy $ABRA · Jupiter
          </a>
          <a href="https://app.bags.fm/abraxas" target="_blank" rel="noopener noreferrer" style={{
            padding:"0.35rem 0.75rem", borderRadius:"7px", fontSize:"0.58rem", fontWeight:700,
            background:"rgba(107,140,255,0.1)", border:"1px solid rgba(107,140,255,0.25)",
            color:"#6b8cff", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace",
            display:"inline-flex", alignItems:"center", gap:"0.3rem",
          }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="#6b8cff"><rect x="3" y="6" width="14" height="10" rx="2"/><path d="M7 6V4a3 3 0 016 0v2"/></svg>
            Buy $ABRA · Bags
          </a>
        </div>
      </div>

      {/* Protocol description — institutional depth */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"0.5rem", marginBottom:"0.5rem" }}>
        {[
          {
            label:"What Abraxas Is",
            body:"An autonomous AI operating layer for tokenized real-world assets on Solana. Vaults hold verified physical collectibles, precious metals, equities, and luxury assets — each governed by Sophia Agents and defended by Circuit Engine.",
          },
          {
            label:"How Vaults Work",
            body:"Each position is a Token-2022 account with provenance metadata, LTV ratios, and on-chain risk scoring. Sophia Agents monitor price feeds, execute hedges, and trigger circuit breaks automatically without user approval.",
          },
          {
            label:"Arena as Risk Layer",
            body:"Triple Triad mechanic simulates vault stress scenarios — counterparty risk, liquidity shocks, volatility events. Stats map to real asset metrics: ATK=volume, DEF=liquidity, SPD=settlement finality. Win conditions reflect protocol resilience.",
          },
        ].map(item => (
          <div key={item.label} style={{ padding:"0.625rem 0.75rem", background:"rgba(6,8,16,0.92)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"8px" }}>
            <div style={{ fontSize:"0.52rem", fontWeight:700, color:"#f0f0f0", marginBottom:"0.25rem", letterSpacing:"0.02em" }}>{item.label}</div>
            <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.42)", lineHeight:1.6 }}>{item.body}</div>
          </div>
        ))}
      </div>

      {/* x402 explanation */}
      <div style={{ padding:"0.5rem 0.75rem", background:"rgba(96,165,250,0.05)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:"7px", marginBottom:"0.5rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:"0.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.25rem", flexShrink:0, paddingTop:"1px" }}>
            <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#60A5FA" }} />
            <span style={{ fontSize:"0.48rem",fontWeight:700,color:"#60A5FA",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>x402 PROTOCOL</span>
          </div>
          <p style={{ margin:0, fontSize:"0.52rem", color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
            x402 is the payment standard powering agentic transactions. When you enter the Arena, a micropayment (0.001 SOL/USDC/ABX) is deducted as an ante via x402 middleware — no approval required, no gas overhead. Sophia Agents use x402 to pay for oracle data, execute hedges, and settle duels autonomously. This is how the protocol funds itself without human intervention.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
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
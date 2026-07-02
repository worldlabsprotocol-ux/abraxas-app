// FILE: components/Nav.tsx
// Top nav: logo + wallet connect only.
// NO navigation links. routing via BottomNav only.
"use client";

import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/lib/authState";
import { useCircuitState } from "@/lib/protocolStream";
import { LanguageSelector } from "@/components/LanguageSelector";

function WalletButton() {
  const { connected, disconnect, wallet, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { walletAddress } = useAuth();

  // Only show connected state when wallet adapter confirms connection AND address exists
  if (connected && walletAddress) {
    const short = `${walletAddress.slice(0,4)}…${walletAddress.slice(-4)}`;
    return (
      <button onClick={() => disconnect()} style={{
        display:"flex", alignItems:"center", gap:"0.35rem",
        padding:"0.3rem 0.625rem", borderRadius:"6px",
        background:"rgba(20,241,149,0.08)", border:"1px solid rgba(20,241,149,0.25)",
        color:"#14F195", fontSize:"0.6rem", fontFamily:"'JetBrains Mono',monospace",
        fontWeight:600, cursor:"pointer", letterSpacing:"0.03em",
      }}>
        <span style={{ width:"5px",height:"5px",borderRadius:"50%",background:"#14F195",flexShrink:0,animation:"pulse 2s ease-in-out infinite" }} />
        {short}
      </button>
    );
  }

  if (connecting) {
    return (
      <button disabled style={{ padding:"0.3rem 0.625rem", borderRadius:"6px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.35)", fontSize:"0.6rem", fontFamily:"'JetBrains Mono',monospace" }}>
        Connecting…
      </button>
    );
  }

  // No wallet detected. still allow opening modal (Phantom extension may prompt install)
  const hasWallet = !!wallet;
  return (
    <button
      onClick={() => setVisible(true)}
      style={{
        display:"flex", alignItems:"center", gap:"0.3rem",
        padding:"0.3rem 0.625rem", borderRadius:"6px",
        background:"rgba(6,8,16,0.9)", border:"1px solid rgba(255,255,255,0.12)",
        color:"rgba(255,255,255,0.55)", fontSize:"0.62rem",
        fontFamily:"'Space Grotesk',sans-serif", fontWeight:600,
        cursor:"pointer", whiteSpace:"nowrap",
        transition:"all 0.2s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(200,169,110,0.4)"; (e.currentTarget as HTMLElement).style.color="#C8A96E"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,0.55)"; }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      {hasWallet ? "Connect" : "Install Wallet"}
    </button>
  );
}

export function Nav() {
  const { state } = useCircuitState();
  const pulseColor = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:50, height:"52px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 1.25rem",
      background:"rgba(2,3,10,0.88)",
      backdropFilter:"blur(16px)",
      WebkitBackdropFilter:"blur(16px)",
      borderBottom:"1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Logo only. no nav links */}
      <Link href="/" style={{ textDecoration:"none", display:"flex", alignItems:"center", gap:"0.625rem" }}>
        <div style={{ width:"26px",height:"26px",borderRadius:"50%", border:"1px solid rgba(200,169,110,0.4)", display:"flex",alignItems:"center",justifyContent:"center", boxShadow:"0 0 8px rgba(200,169,110,0.12)" }}>
          <div style={{ width:"8px",height:"8px",borderRadius:"50%",background:"#C8A96E",boxShadow:"0 0 8px rgba(200,169,110,0.9)" }} />
        </div>
        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:"0.82rem", letterSpacing:"0.12em", color:"#C8A96E", textTransform:"uppercase" }}>
          Abraxas
        </span>
        <div style={{ display:"flex",alignItems:"center",gap:"0.2rem", padding:"0.1rem 0.4rem", borderRadius:"100px", background:`${pulseColor}12`, border:`1px solid ${pulseColor}28` }}>
          <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:pulseColor,animation:"pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize:"0.46rem",fontWeight:700,color:pulseColor,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace" }}>
            {state === "RISK" ? "ALERT" : state === "WATCH" ? "WATCH" : "LIVE"}
          </span>
        </div>
      </Link>

      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <LanguageSelector />
        <WalletButton />
      </div>
    </nav>
  );
}
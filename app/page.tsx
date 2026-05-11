// FILE: app/page.tsx
"use client";

import { Suspense } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TerminalArena, TerminalArenaSkeleton } from "@/components/TerminalArena";
import { useCircuitState } from "@/lib/protocolStream";

// ─── Status bar ─────────────────────────────────────────────────────────────
function StatusBar() {
  const { state } = useCircuitState();
  const color = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";

  return (
    <div style={{ padding: "0.28rem 1.25rem", background: "rgba(2,3,10,0.97)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
          <span style={{ fontSize: "0.46rem", fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
            Circuit {state === "RISK" ? "Alert" : state === "WATCH" ? "Watch" : "Safe"}
          </span>
        </div>
        {[
          { label: "XAU", value: "$4,716.71", color: "#D4AF37" },
          { label: "XAG", value: "$72.84", color: "#C0C0C0" },
          { label: "NVDA", value: "$211.48", color: "#76B900" },
          { label: "TSLA", value: "$411.89", color: "#CC0000" },
          { label: "AAPL", value: "$287.46", color: "#f0f0f0" },
        ].map(({ label, value, color: c }) => (
          <span key={label} style={{ fontSize: "0.44rem", color: "rgba(255,255,255,0.22)", fontFamily: "'JetBrains Mono', monospace" }}>
            {label} <span style={{ color: c, fontWeight: 700 }}>{value}</span>
          </span>
        ))}
      </div>
      <span style={{ fontSize: "0.42rem", color: "rgba(255,255,255,0.16)", fontFamily: "'JetBrains Mono', monospace" }}>
        Solana · Token-2022 · {new Date().toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Clean Protocol Overview ───────────────────────────────────────────────
function ProtocolOverview() {
  const { connected, wallet, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <div style={{ padding: "1.25rem 1.25rem 0.75rem", background: "radial-gradient(ellipse at 50% -20%, rgba(107,140,255,0.06) 0%, transparent 65%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.875rem" }}>
        <div>
          <p style={{ fontSize: "0.48rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontFamily: "'JetBrains Mono', monospace", margin: "0 0 0.2rem" }}>
            World Labs Protocol · Solana Mainnet
          </p>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.2rem, 3.5vw, 1.7rem)", letterSpacing: "-0.03em", margin: 0, background: "linear-gradient(135deg, #D4AF37, #a855f7 45%, #6b8cff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Sovereign RWA Terminal
          </h1>
        </div>

        {/* Buy Buttons + Wallet */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding: "0.35rem 0.75rem", borderRadius: "7px", fontSize: "0.58rem", fontWeight: 700, background: "rgba(255,133,0,0.12)", border: "1px solid rgba(255,133,0,0.3)", color: "#FF8500", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" }}>
            Buy $ABRA · Jupiter
          </a>
          <a href="https://bags.fm/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ padding: "0.35rem 0.75rem", borderRadius: "7px", fontSize: "0.58rem", fontWeight: 700, background: "rgba(107,140,255,0.1)", border: "1px solid rgba(107,140,255,0.25)", color: "#6b8cff", textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" }}>
            Buy $ABRA · Bags
          </a>

          {/* Wallet */}
          {wallet && !connected && !connecting && (
            <button onClick={() => setVisible(true)} style={{ padding: "0.35rem 0.75rem", borderRadius: "7px", fontSize: "0.58rem", fontWeight: 700, background: "rgba(6,8,16,0.9)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
              Connect Wallet
            </button>
          )}
          {connected && (
            <button onClick={() => disconnect()} style={{ padding: "0.35rem 0.75rem", borderRadius: "7px", fontSize: "0.58rem", fontWeight: 700, background: "rgba(20,241,149,0.08)", border: "1px solid rgba(20,241,149,0.25)", color: "#14F195", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
              Connected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <StatusBar />
      <ProtocolOverview />
      <Suspense fallback={<TerminalArenaSkeleton />}>
        <TerminalArena />
      </Suspense>
    </div>
  );

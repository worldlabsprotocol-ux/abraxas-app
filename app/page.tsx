// FILE: app/page.tsx
// Abraxas Sovereign Terminal — unified hub.
// Tabs: #terminal (Sold Tape + Active Arena) | #vaults
// URL hash persistence. No "Featured Collector Assets" section.
// Framer Motion used where available; CSS transitions as fallback.
"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { TerminalArena, TerminalArenaSkeleton } from "@/components/TerminalArena";
import { useSystemState, simulateHeliusEvent } from "@/lib/systemState";
import { useCircuitState } from "@/lib/protocolStream";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "terminal" | "vaults";

// ─── Wallet status mock (full wiring uses useWallet from @solana/wallet-adapter-react) ─
function WalletStatus() {
  const [connected, setConnected] = useState(false);
  const [copied,    setCopied]    = useState(false);
  const addr = "7F3k…Ab2Q";
  const solBal = "12.48";
  const abraBal = "1,247";

  function copyAddr() {
    navigator.clipboard?.writeText("7F3kabcde12345Ab2Q").catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!connected) return (
    <button onClick={() => setConnected(true)} style={{
      padding:"0.375rem 1rem", borderRadius:"8px", fontWeight:700, fontSize:"0.72rem",
      background:"linear-gradient(135deg,rgba(107,140,255,0.15),rgba(107,140,255,0.08))",
      border:"1px solid rgba(107,140,255,0.35)", color:"#6b8cff", cursor:"pointer",
      fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
      transition:"all 0.2s",
    }}>
      Connect ⚔
    </button>
  );

  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
      <button onClick={copyAddr} style={{
        display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.3rem 0.625rem",
        borderRadius:"7px", background:"rgba(20,241,149,0.08)", border:"1px solid rgba(20,241,149,0.25)",
        color:"#14F195", fontSize:"0.62rem", fontFamily:"'JetBrains Mono',monospace",
        cursor:"pointer", fontWeight:700,
      }}>
        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#14F195", flexShrink:0 }} />
        {copied ? "Copied!" : addr}
      </button>
      <div style={{ display:"flex", gap:"0.4rem", fontSize:"0.56rem", fontFamily:"'JetBrains Mono',monospace" }}>
        <span style={{ color:"rgba(255,255,255,0.5)" }}>{solBal} SOL</span>
        <span style={{ color:"#C8A96E" }}>{abraBal} $ABRA</span>
      </div>
      <button onClick={() => setConnected(false)} style={{ padding:"0.2rem 0.45rem", borderRadius:"5px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.3)", fontSize:"0.55rem", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
        ✕
      </button>
    </div>
  );
}

// ─── System status strip ───────────────────────────────────────────────────────
function StatusStrip() {
  const { state } = useCircuitState();
  const { systemState, vaults } = useSystemState();
  const color = state === "RISK" ? "#f26b6b" : state === "WATCH" ? "#FBBF24" : "#14F195";
  const msg   = systemState === "CIRCUIT_TRIGGERED" ? "CIRCUIT TRIGGERED" : systemState === "AT_RISK" ? "AT RISK" : "SOVEREIGN ONLINE";

  return (
    <div style={{
      padding:"0.3rem 1.25rem",
      background:"rgba(2,3,10,0.9)",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
      display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.4rem",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"1.25rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
          <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:color, animation:"pulse 1.5s ease-in-out infinite", boxShadow:`0 0 6px ${color}` }} />
          <span style={{ fontSize:"0.5rem", fontWeight:700, color, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>{msg}</span>
        </div>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
          Gold: <span style={{ color:"#D4AF37", fontWeight:700 }}>$4,733.39</span>
        </span>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace" }}>
          Silver: <span style={{ color:"#C0C0C0", fontWeight:700 }}>$72.91</span>
        </span>
      </div>
      <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
        {vaults.length} vaults · {new Date().toLocaleTimeString()}
      </span>
    </div>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────
function Hero({ setTab }: { setTab: (t: TabId) => void }) {
  const [tick, setTick] = useState(0);
  const LINES = [
    "Sovereign terminal for tokenized reality.",
    "RWA. Collectibles. AI Arena. On Solana.",
    "Deploy agents. Vault assets. Win prestige.",
  ];
  useEffect(() => {
    const iv = setInterval(() => setTick(t => (t + 1) % LINES.length), 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      padding:"2rem 1.25rem 1.5rem",
      background:"radial-gradient(ellipse at 50% -20%, rgba(107,140,255,0.1) 0%, transparent 60%)",
      textAlign:"center", position:"relative",
    }}>
      {/* Rune ring */}
      <div style={{
        width:"64px", height:"64px", borderRadius:"50%", margin:"0 auto 1rem",
        background:"rgba(107,140,255,0.08)", border:"1px solid rgba(107,140,255,0.25)",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 0 30px rgba(107,140,255,0.2), inset 0 0 20px rgba(107,140,255,0.06)",
        animation:"pulse 3s ease-in-out infinite",
      }}>
        <span style={{ fontSize:"1.75rem", color:"#6b8cff" }}>⬢</span>
      </div>
      <h1 style={{
        fontWeight:900, fontSize:"clamp(1.6rem,5vw,2.4rem)",
        letterSpacing:"-0.03em", margin:"0 0 0.5rem",
        background:"linear-gradient(135deg,#D4AF37,#a855f7 40%,#6b8cff)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>
        ABRAXAS
      </h1>
      {/* Typewriter-style rotating tagline */}
      <p style={{
        fontSize:"0.82rem", color:"rgba(255,255,255,0.5)",
        minHeight:"1.4em", transition:"opacity 0.3s", margin:"0 0 1.5rem",
        fontFamily:"'JetBrains Mono',monospace",
      }}>
        {LINES[tick]}
      </p>
      <div style={{ display:"flex", gap:"0.625rem", justifyContent:"center", flexWrap:"wrap" }}>
        <button onClick={() => setTab("terminal")} style={{
          padding:"0.6rem 1.5rem", borderRadius:"10px", fontWeight:800, fontSize:"0.82rem",
          background:"linear-gradient(135deg,#a855f7,#6b8cff)", border:"none", color:"#fff",
          cursor:"pointer", boxShadow:"0 0 20px rgba(168,85,247,0.4)", letterSpacing:"0.02em",
        }}>
          Enter Arena →
        </button>
        <Link href="/protect">
          <button style={{
            padding:"0.6rem 1.5rem", borderRadius:"10px", fontWeight:700, fontSize:"0.82rem",
            background:"rgba(20,241,149,0.08)", border:"1px solid rgba(20,241,149,0.3)",
            color:"#14F195", cursor:"pointer", letterSpacing:"0.02em",
          }}>
            Vault Assets
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Vaults tab (embedded) ────────────────────────────────────────────────────
function VaultsEmbed() {
  return (
    <div style={{ padding:"1.25rem", textAlign:"center" }}>
      <p style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.35)", marginBottom:"1rem", fontFamily:"'JetBrains Mono',monospace" }}>
        Full vault management runs on the dedicated Vaults page for optimal performance.
      </p>
      <Link href="/protect">
        <button style={{
          padding:"0.6rem 1.5rem", borderRadius:"10px", fontWeight:700, fontSize:"0.8rem",
          background:"rgba(107,140,255,0.12)", border:"1px solid rgba(107,140,255,0.3)",
          color:"#6b8cff", cursor:"pointer",
        }}>
          Open Vault Terminal →
        </button>
      </Link>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("terminal");

  // URL hash persistence
  useEffect(() => {
    const hash = window.location.hash.replace("#","") as TabId;
    if (hash === "terminal" || hash === "vaults") setActiveTab(hash);
  }, []);

  function setTab(tab: TabId) {
    setActiveTab(tab);
    window.history.replaceState(null,"",`#${tab}`);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  const TABS = [
    { id:"terminal" as TabId, label:"Terminal ⬢" },
    { id:"vaults"   as TabId, label:"Vaults ⛊"   },
  ];

  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", paddingBottom:"5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* System status */}
      <StatusStrip />

      {/* Page header with wallet */}
      <div style={{ padding:"0.75rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.25)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>
          ABRAXAS PROTOCOL · MAY 2026
        </div>
        <WalletStatus />
      </div>

      {/* Hero — visible only on terminal tab */}
      {activeTab === "terminal" && <Hero setTab={setTab} />}

      {/* Tab bar */}
      <div style={{
        display:"flex", gap:"0.25rem", margin:"0 1.25rem 1.25rem",
        background:"rgba(6,8,16,0.8)", padding:"0.3rem", borderRadius:"10px",
        border:"1px solid rgba(255,255,255,0.06)",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setTab(tab.id)} style={{
              flex:1, padding:"0.45rem 0.875rem", borderRadius:"8px", border:"none",
              background:active?"rgba(107,140,255,0.14)":"transparent",
              boxShadow:active?"0 0 12px rgba(107,140,255,0.15)":"none",
              color:active?"#6b8cff":"rgba(255,255,255,0.38)",
              fontWeight:active?700:400, fontSize:"0.72rem",
              cursor:"pointer", letterSpacing:"0.02em", transition:"all 0.15s",
            }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content with fade transition */}
      <div key={activeTab} style={{ animation:"fadeIn 0.2s ease" }}>
        {activeTab === "terminal" && (
          <Suspense fallback={<TerminalArenaSkeleton />}>
            <TerminalArena />
          </Suspense>
        )}
        {activeTab === "vaults" && <VaultsEmbed />}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
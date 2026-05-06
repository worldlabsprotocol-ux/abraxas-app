// FILE: app/page.tsx
// Abraxas — Cyberpunk/mystical AI Agent + RWA protocol dashboard.
// Full tab system with URL hash persistence.
// Tabs: Home · Arena · Vaults · Agents · Circuit · RWA
// No framer-motion (not installed). CSS transitions + keyframes only.
"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSystemState, simulateHeliusEvent } from "@/lib/systemState";
import { AgentCard, AgentCardSkeleton } from "@/components/AgentCard";
import type { PokemonCard } from "@/lib/pokemonApi";

// ─── Tab definitions ──────────────────────────────────────────────────────────
type TabId = "home" | "arena" | "vaults" | "agents" | "circuit" | "rwa";

interface Tab { id: TabId; label: string; icon: string; href?: string }

const TABS: Tab[] = [
  { id:"home",    label:"Home",    icon:"⬡" },
  { id:"arena",   label:"Arena",   icon:"⚔", href:"/arena"   },
  { id:"vaults",  label:"Vaults",  icon:"◈", href:"/protect" },
  { id:"agents",  label:"Agents",  icon:"✦", href:"/agents"  },
  { id:"circuit", label:"Circuit", icon:"⊕", href:"/circuit" },
  { id:"rwa",     label:"IP/RWA",  icon:"★", href:"/rwa"     },
];

// ─── Wallet mock ──────────────────────────────────────────────────────────────
function WalletStatus() {
  const [connected, setConnected] = useState(false);
  return (
    <button
      onClick={() => setConnected(c => !c)}
      style={{
        padding: "0.35rem 0.875rem", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 700,
        background:  connected ? "rgba(61,214,140,0.12)" : "rgba(107,140,255,0.12)",
        border:      connected ? "1px solid rgba(61,214,140,0.35)" : "1px solid rgba(107,140,255,0.35)",
        color:       connected ? "#3dd68c" : "#6b8cff",
        cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.2s",
        display: "flex", alignItems: "center", gap: "0.35rem",
      }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: connected ? "#3dd68c" : "#6b8cff", animation: connected ? "pulse 2s ease-in-out infinite" : "none" }} />
      {connected ? "7F3k…9Ab2" : "Connect Wallet"}
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta, color }: { label: string; value: string; delta?: string; color: string }) {
  return (
    <div style={{
      padding: "0.875rem 1rem", borderRadius: "12px",
      background: `${color}08`, border: `1px solid ${color}22`,
      flex: 1, minWidth: "140px",
    }}>
      <div style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#f0f0f0", letterSpacing: "-0.02em" }}>{value}</div>
      {delta && <div style={{ fontSize: "0.62rem", fontWeight: 600, color, marginTop: "2px" }}>{delta}</div>}
    </div>
  );
}

// ─── Live event ticker ────────────────────────────────────────────────────────
function LiveTicker() {
  const { events, heliusEvents } = useSystemState();
  const all = [...heliusEvents, ...events].sort((a, b) => b.ts - a.ts).slice(0, 4);
  if (all.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {all.map((e, i) => {
        const isHelius = "riskSignal" in e;
        const msg  = isHelius ? `[HELIUS] ${(e as any).type}: ${(e as any).description}` : `${(e as any).source} ${(e as any).message}`;
        const risk = isHelius ? (e as any).riskSignal : (e as any).severity;
        const c    = risk === "high" || risk === "alert" ? "#f26b6b" : risk === "medium" || risk === "warn" ? "#FBBF24" : "rgba(107,140,255,0.8)";
        const ago  = Math.max(1, Math.floor((Date.now() - e.ts) / 1000));
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: "0.68rem", color: c, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg}</span>
            <span style={{ fontSize: "0.56rem", color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", flexShrink: 0 }}>{ago}s</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Home tab content ─────────────────────────────────────────────────────────
function HomeTab({ setTab }: { setTab: (t: TabId) => void }) {
  const { vaults, systemState, simulateHeliusEvent } = useSystemState();
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pokemon/featured")
      .then(r => r.json())
      .then(d => { if (d.ok) setCards(d.cards.slice(0, 6)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATE_CONFIG = {
    NO_VAULTS:          { label:"No Vaults",   color:"rgba(255,255,255,0.3)", msg:"Deploy a vault to begin sovereign operations." },
    UNPROTECTED:        { label:"Exposed",      color:"#FBBF24",               msg:"Assets unprotected. Arm your Circuit now." },
    PROTECTED:          { label:"Protected",    color:"#3dd68c",               msg:"Circuit armed. Sophia agents monitoring." },
    AT_RISK:            { label:"At Risk",      color:"#fb923c",               msg:"Risk event detected. Review your vault." },
    CIRCUIT_TRIGGERED:  { label:"Triggered",    color:"#f26b6b",               msg:"Circuit triggered. Simulated freeze applied." },
  } as const;
  const sc = STATE_CONFIG[systemState as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.NO_VAULTS;

  return (
    <div>
      {/* Hero */}
      <div style={{
        padding: "2rem 0 1.5rem", textAlign: "center",
        background: "radial-gradient(ellipse at 50% 0%, rgba(107,140,255,0.12) 0%, transparent 65%)",
      }}>
        {/* Rune ring */}
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", marginBottom: "1rem", background: "rgba(107,140,255,0.08)", border: "1px solid rgba(107,140,255,0.25)", fontSize: "2rem", boxShadow: "0 0 30px rgba(107,140,255,0.25), inset 0 0 20px rgba(107,140,255,0.08)", animation: "pulse 3s ease-in-out infinite" }}>
          ⬡
        </div>
        <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight: 900, fontSize: "clamp(1.75rem,5vw,2.75rem)", letterSpacing: "-0.03em", marginBottom: "0.5rem", background: "linear-gradient(135deg, #a855f7, #6b8cff, #63fff0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ABRAXAS
        </h1>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", maxWidth: "420px", margin: "0 auto 1.5rem", lineHeight: 1.6 }}>
          Sovereign AI guardian protocol for tokenized real-world assets on Solana.
        </p>

        {/* System state */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", borderRadius: "100px", background: `${sc.color}12`, border: `1px solid ${sc.color}33`, marginBottom: "1.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.color, animation: "pulse 1s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: sc.color, letterSpacing: "0.1em" }}>{sc.label.toUpperCase()}</span>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.4)" }}>{sc.msg}</span>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/protect">
            <button style={{ padding: "0.6rem 1.5rem", borderRadius: "10px", fontWeight: 700, fontSize: "0.82rem", background: "linear-gradient(135deg, #a855f7, #6b8cff)", border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}>
              Deploy Vault →
            </button>
          </Link>
          <button onClick={() => setTab("arena")} style={{ padding: "0.6rem 1.5rem", borderRadius: "10px", fontWeight: 700, fontSize: "0.82rem", background: "rgba(99,255,240,0.08)", border: "1px solid rgba(99,255,240,0.3)", color: "#63fff0", cursor: "pointer" }}>
            Enter Arena
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <StatCard label="Protocol TVL"      value="$4.2M"   delta="+12.4%" color="#a855f7" />
        <StatCard label="Sophia Agents"     value="5"       delta="2 armed" color="#6b8cff" />
        <StatCard label="$ABRA Burned"      value="1,247"   delta="this session" color="#63fff0" />
        <StatCard label="Vaults Protected"  value={String(vaults.length)} delta={vaults.length > 0 ? "live" : "none yet"} color="#3dd68c" />
      </div>

      {/* Live event feed */}
      <div style={{ background: "rgba(7,10,18,0.9)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "12px", padding: "0.875rem 1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3dd68c", animation: "pulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Events</span>
          </div>
          <button onClick={() => simulateHeliusEvent(vaults[0]?.id)} style={{ fontSize: "0.6rem", color: "rgba(200,169,110,0.8)", background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "5px", padding: "0.18rem 0.5rem", cursor: "pointer" }}>
            Simulate
          </button>
        </div>
        <LiveTicker />
      </div>

      {/* Featured cards */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Featured Collector Assets</h2>
          <button onClick={() => setTab("arena")} style={{ fontSize: "0.65rem", color: "#6b8cff", background: "none", border: "none", cursor: "pointer" }}>View Arena →</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%,200px),1fr))", gap: "0.75rem" }}>
          {loading ? Array.from({ length: 6 }).map((_, i) => <AgentCardSkeleton key={i} />) : cards.map(c => (
            <AgentCard key={c.id} card={c}
              onTokenize={() => alert(`Tokenizing ${c.name} as RWA…`)}
              onArena={() => setTab("arena")} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Embedded section tabs (Arena, Vaults, Agents, Circuit, RWA) ──────────────
function EmbedTab({ tab }: { tab: TabId }) {
  const href = TABS.find(t => t.id === tab)?.href;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: "1rem" }}>
      <div style={{ fontSize: "3rem", opacity: 0.3 }}>{TABS.find(t => t.id === tab)?.icon}</div>
      <h2 style={{ fontWeight: 800, fontSize: "1.1rem", opacity: 0.7 }}>{TABS.find(t => t.id === tab)?.label}</h2>
      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", textAlign: "center", maxWidth: "280px" }}>
        This section runs as a full dedicated page for maximum performance.
      </p>
      {href && (
        <Link href={href}>
          <button style={{ padding: "0.6rem 1.5rem", borderRadius: "10px", fontWeight: 700, fontSize: "0.8rem", background: "rgba(107,140,255,0.12)", border: "1px solid rgba(107,140,255,0.3)", color: "#6b8cff", cursor: "pointer" }}>
            Open {TABS.find(t => t.id === tab)?.label} →
          </button>
        </Link>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  // URL hash persistence — read on mount, update on change
  const [activeTab, setActiveTab] = useState<TabId>("home");

  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some(t => t.id === hash)) setActiveTab(hash);
  }, []);

  const handleSetTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>

      {/* Dashboard header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.15rem" }}>Abraxas Protocol</p>
          <h1 style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.01em", margin: 0 }}>Sovereign Terminal</h1>
        </div>
        <WalletStatus />
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: "0.25rem", marginBottom: "1.5rem",
        background: "rgba(7,10,18,0.8)", padding: "0.3rem", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)", overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => handleSetTab(tab.id)} style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.45rem 0.875rem", borderRadius: "9px", border: "none",
              background: active ? "rgba(107,140,255,0.15)" : "transparent",
              boxShadow: active ? "0 0 12px rgba(107,140,255,0.2)" : "none",
              color: active ? "#6b8cff" : "rgba(255,255,255,0.4)",
              fontWeight: active ? 700 : 400, fontSize: "0.72rem",
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.2s",
              letterSpacing: "0.02em",
            }}>
              <span style={{ fontSize: "0.7rem" }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content — fade transition via CSS */}
      <div style={{ animation: "fadeIn 0.25s ease" }}>
        {activeTab === "home"    && <HomeTab setTab={handleSetTab} />}
        {activeTab !== "home"   && <EmbedTab tab={activeTab} />}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
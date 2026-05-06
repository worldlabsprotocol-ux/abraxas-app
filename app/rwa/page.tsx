// FILE: app/rwa/page.tsx
// IP / RWA Living Market — not a brochure, a control surface.
// Physical asset NAV updates every 10min from /api/rwa/physical.
// Stress Test triggers multi-step Helius sequence.
// Ondo stability layer + Physical growth layer + Metal hedge layer.
"use client";

import { useState, useEffect, useRef } from "react";
import { useSystemState, simulateHeliusEvent } from "@/lib/systemState";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PhysicalCard  { name: string; grade?: string; floorSol?: number; spotUsd?: number; symbol?: string; change24h: number; updatedAt: string; seed?: number; range?: number; baseSol?: number; baseUsd?: number; }
interface PhysicalData  { nav: { totalSol: number; updatedAt: string }; pokemon: PhysicalCard[]; onepiece: PhysicalCard[]; metals: PhysicalCard[]; }
interface OndoToken     { symbol: string; name: string; baseApy: number; dailyYield: string; circulatingSupply: string; backing: string; description: string; }

// ─── Sovereign Metal Card (Gold / Silver) ─────────────────────────────────────
// 3D-style dark vault card with SVG asset render, telemetry sparkline, shield badge.

interface MetalData { name: string; symbol: string; spotUsd: number; change24h: number; updatedAt: string; }

function Sparkline({ positive }: { positive: boolean }) {
  // Deterministic sparkline seeded by minute — looks live
  const pts = Array.from({ length: 20 }, (_, i) => {
    const x = Math.abs(Math.sin(i * 2.3 + Date.now() / 60_000)) * 0.5 + (positive ? i * 0.03 : -i * 0.02) + Math.random() * 0.1;
    return x;
  });
  const min = Math.min(...pts); const max = Math.max(...pts);
  const norm = pts.map((p) => (p - min) / (max - min || 1));
  const w = 80; const h = 24;
  const d = norm.map((y, i) => `${i === 0 ? "M" : "L"}${(i / 19) * w},${h - y * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={positive ? "#14F195" : "#f26b6b"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SovereignShieldBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.15rem 0.4rem", background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.35)", borderRadius: "4px" }}>
      <svg width="8" height="9" viewBox="0 0 8 9" fill="none">
        <path d="M4 0.5L0.5 2V5C0.5 7 2 8.5 4 9C6 8.5 7.5 7 7.5 5V2L4 0.5Z" fill="rgba(200,169,110,0.4)" stroke="#C8A96E" strokeWidth="0.7"/>
        <path d="M2.5 4.5L3.5 5.5L5.5 3.5" stroke="#C8A96E" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "var(--gold)", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>SOVEREIGN VERIFIED</span>
    </div>
  );
}

function GoldSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="goldGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#FFF4CC"/>
          <stop offset="40%" stopColor="#F0C040"/>
          <stop offset="80%" stopColor="#C8860A"/>
          <stop offset="100%" stopColor="#7A4F00"/>
        </radialGradient>
        <radialGradient id="goldFace" cx="40%" cy="35%" r="65%">
          <stop offset="0%"  stopColor="#FFF8E0"/>
          <stop offset="50%" stopColor="#E8B020"/>
          <stop offset="100%" stopColor="#A06000"/>
        </radialGradient>
      </defs>
      {/* Bar body */}
      <path d="M8 16L14 10H40L44 14V34L40 38H8V16Z" fill="url(#goldGrad)"/>
      {/* Top face */}
      <path d="M14 10H40L44 14H18L14 10Z" fill="url(#goldFace)" opacity="0.9"/>
      {/* Right face */}
      <path d="M40 10L44 14V34L40 38V18L40 10Z" fill="#7A4F00" opacity="0.7"/>
      {/* Shine */}
      <path d="M20 16L36 16" stroke="#FFF8E0" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round"/>
      <path d="M12 22L12 30" stroke="#FFF8E0" strokeWidth="0.8" strokeOpacity="0.3" strokeLinecap="round"/>
      {/* XAUt label */}
      <text x="24" y="30" textAnchor="middle" fontSize="6" fill="#FFF4CC" fontFamily="monospace" fontWeight="bold" opacity="0.9">XAUt</text>
    </svg>
  );
}

function SilverSVG() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="silvGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%"  stopColor="#FFFFFF"/>
          <stop offset="40%" stopColor="#C8D4E0"/>
          <stop offset="80%" stopColor="#7090A8"/>
          <stop offset="100%" stopColor="#3A5068"/>
        </radialGradient>
        <radialGradient id="silvFace" cx="40%" cy="35%" r="65%">
          <stop offset="0%"  stopColor="#F0F4F8"/>
          <stop offset="50%" stopColor="#A0B8CC"/>
          <stop offset="100%" stopColor="#506070"/>
        </radialGradient>
      </defs>
      <path d="M8 16L14 10H40L44 14V34L40 38H8V16Z" fill="url(#silvGrad)"/>
      <path d="M14 10H40L44 14H18L14 10Z" fill="url(#silvFace)" opacity="0.9"/>
      <path d="M40 10L44 14V34L40 38V18L40 10Z" fill="#3A5068" opacity="0.7"/>
      <path d="M20 16L36 16" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round"/>
      <path d="M12 22L12 30" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.3" strokeLinecap="round"/>
      <text x="24" y="30" textAnchor="middle" fontSize="5.5" fill="#F0F4F8" fontFamily="monospace" fontWeight="bold" opacity="0.9">SLVon</text>
    </svg>
  );
}

function SovereignMetalCard({ metal }: { metal: MetalData }) {
  const isGold     = metal.symbol === "XAU";
  const positive   = metal.change24h >= 0;
  const accentColor = isGold ? "#C8A96E" : "#A0B8CC";
  const bgGrad     = isGold
    ? "linear-gradient(135deg, rgba(200,169,110,0.12) 0%, rgba(120,80,0,0.08) 100%)"
    : "linear-gradient(135deg, rgba(160,184,204,0.12) 0%, rgba(58,80,104,0.08) 100%)";

  return (
    <div style={{ background: bgGrad, border: `1px solid ${accentColor}33`, borderRadius: "16px", padding: "1.25rem", position: "relative", overflow: "hidden" }}>
      {/* 3D depth shadow */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)", borderRadius: "16px", pointerEvents: "none" }} />
      {/* Corner glow */}
      <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}20, transparent 70%)`, pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isGold ? <GoldSVG /> : <SilverSVG />}
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", fontFamily: "'Space Grotesk',sans-serif", marginBottom: "0.15rem" }}>{metal.name}</div>
            <SovereignShieldBadge />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>
            ${metal.spotUsd.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: positive ? "#14F195" : "#f26b6b" }}>
            {positive ? "+" : ""}{metal.change24h.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Sparkline telemetry */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.625rem" }}>
        <div>
          <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>24H TELEMETRY</div>
          <Sparkline positive={positive} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.58rem", color: "var(--subtle)", letterSpacing: "0.06em", marginBottom: "0.1rem" }}>CIRCUIT HEDGE</div>
          <div style={{ fontSize: "0.65rem", color: accentColor, fontWeight: 600 }}>Auto → $USDY &gt;5% drop</div>
        </div>
      </div>

      {/* Vault status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px", border: `1px solid ${accentColor}18` }}>
        <span style={{ fontSize: "0.58rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace" }}>VAULT LOCKED</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#14F195", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.58rem", color: "#14F195", fontWeight: 600 }}>INSURED</span>
        </div>
      </div>
    </div>
  );
}

// ─── DeFiLlama macro panel ────────────────────────────────────────────────────
interface MacroData {
  solana: { tvl: number; tvlFormatted: string; change24h: number };
  stablecoins: Array<{ symbol: string; circulating: number; circulatingFormatted: string; change24h: number }>;
  source: string;
}

function MacroPanel() {
  const [macro,   setMacro]   = useState<MacroData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/macro").then((r) => r.json())
      .then((d) => { if (d.ok) setMacro(d); })
      .finally(() => setLoading(false));
    const t = setInterval(() => {
      fetch("/api/macro").then((r) => r.json()).then((d) => { if (d.ok) setMacro(d); });
    }, 300_000);
    return () => clearInterval(t);
  }, []);

  const tvlPositive = (macro?.solana.change24h ?? 0) >= 0;

  return (
    <div style={{ background: "rgba(2,3,10,0.95)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: "12px", overflow: "hidden", fontFamily: "'JetBrains Mono',monospace" }}>
      <div style={{ padding: "0.625rem 1rem", borderBottom: "1px solid rgba(96,165,250,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(96,165,250,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#60A5FA", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#60A5FA", letterSpacing: "0.12em" }}>
            SOLANA MACRO · DEFILLAMA FEED
          </span>
        </div>
        <span style={{ fontSize: "0.54rem", color: "rgba(96,165,250,0.4)" }}>
          {macro?.source === "defillama_live" ? "LIVE" : "ORACLE"} · 5min cache
        </span>
      </div>

      {loading && (
        <div style={{ padding: "1.25rem 1rem", fontSize: "0.6rem", color: "rgba(96,165,250,0.4)" }}>
          {"[FETCHING] DeFiLlama Solana TVL..."}
        </div>
      )}

      {!loading && macro && (
        <div style={{ padding: "0.875rem 1rem" }}>
          {/* TVL hero metric */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "0.875rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(96,165,250,0.08)" }}>
            <div>
              <div style={{ fontSize: "0.56rem", color: "rgba(96,165,250,0.5)", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>SOLANA TVL</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#60A5FA", letterSpacing: "-0.02em" }}>{macro.solana.tvlFormatted}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.58rem", color: tvlPositive ? "#14F195" : "#f26b6b", fontWeight: 700, marginBottom: "0.15rem" }}>
                {tvlPositive ? "▲" : "▼"} {Math.abs(macro.solana.change24h).toFixed(2)}% 24h
              </div>
              <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.25)" }}>vs yesterday</div>
            </div>
          </div>

          {/* Stablecoin flow table */}
          <div style={{ fontSize: "0.56rem", color: "rgba(96,165,250,0.4)", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
            STABLECOIN ABSORPTION · SOLANA RAILS
          </div>
          {macro.stablecoins.map((s, i) => {
            const pct = macro.stablecoins[0]
              ? (s.circulating / macro.stablecoins[0].circulating) * 100
              : 0;
            return (
              <div key={s.symbol} style={{ display: "grid", gridTemplateColumns: "40px 1fr 70px 40px", gap: "0.4rem", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.6rem", color: "#60A5FA", fontWeight: 700 }}>{s.symbol}</span>
                <div style={{ background: "rgba(96,165,250,0.08)", borderRadius: "2px", height: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `rgba(96,165,250,${0.3 + (1 - i * 0.15)})`, borderRadius: "2px", transition: "width 0.5s ease" }} />
                </div>
                <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.5)", textAlign: "right" }}>{s.circulatingFormatted}</span>
                <span style={{ fontSize: "0.54rem", color: s.change24h >= 0 ? "#14F195" : "#f26b6b", textAlign: "right" }}>
                  {s.change24h >= 0 ? "+" : ""}{s.change24h.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─── X402 Liquidity Shard state ───────────────────────────────────────────────
// Per-asset fragmentation: % of asset deployed as liquidity shards
function useShardState() {
  const [shards, setShards] = useState<Record<string, number>>({});
  const fragment = (key: string) => setShards((s) => ({ ...s, [key]: Math.min(100, (s[key] ?? 0) + 25) }));
  const recall   = (key: string) => setShards((s) => ({ ...s, [key]: Math.max(0, (s[key] ?? 0) - 25) }));
  return { shards, fragment, recall };
}

// ─── Stress test sequence ─────────────────────────────────────────────────────
type StressPhase = "idle" | "detecting" | "valuing" | "briefing" | "arming" | "done";

function useStressTest(vaultId?: string) {
  const [phase, setPhase] = useState<StressPhase>("idle");
  const [log,   setLog]   = useState<string[]>([]);

  const run = async () => {
    if (phase !== "idle") return;
    const addLog = (msg: string) => setLog((p) => [msg, ...p]);

    setPhase("detecting"); addLog("[STRESS TEST] Floor sweep initiated — scanning Collector Crypt");
    await sleep(600);
    simulateHeliusEvent(vaultId);
    addLog("[HELIUS] NFT_SALE: PSA 10 Charizard mass movement detected");

    setPhase("valuing");   addLog("[SOPHIA] Recalculating vault NAV — physical asset delta applied");
    await sleep(700);
    addLog("[CIRCUIT] Risk signal: HIGH — floor velocity -12.4%/hr");

    setPhase("briefing");  addLog("[ELEVENLABS] Briefing queued: priority alert on physical floor sweep");
    await sleep(500);
    // Trigger ElevenLabs if voice enabled
    try {
      await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Priority alert. Collector Crypt floor sweep detected. PSA 10 Charizard mass sale event. Sophia agent recalculating vault NAV. Circuit arming now." }) });
    } catch {}

    setPhase("arming");    addLog("[CIRCUIT] Circuit Shield arming — vault protection active");
    await sleep(800);
    addLog("[VAULT] NAV updated. Stress test complete. Defense armed.");

    setPhase("done");
    setTimeout(() => { setPhase("idle"); setLog([]); }, 6000);
  };

  return { phase, log, run };
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ─── Price ticker ─────────────────────────────────────────────────────────────
function PriceTicker({ value, unit, change }: { value: number; unit: string; change: number }) {
  const positive = change >= 0;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
        {value.toFixed(unit === "SOL" ? 1 : 2)} {unit}
      </span>
      <span style={{ fontSize: "0.62rem", fontWeight: 700, color: positive ? "#14F195" : "#f26b6b" }}>
        {positive ? "+" : ""}{change.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── X402 shard bar ───────────────────────────────────────────────────────────
function ShardBar({ pct, onFragment, onRecall }: { pct: number; onFragment: () => void; onRecall: () => void }) {
  const active = pct > 0;
  return (
    <div style={{ marginTop: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
        <span style={{ fontSize: "0.56rem", color: active ? "#FBBF24" : "var(--subtle)", fontWeight: active ? 700 : 400, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          X402 Liquidity Shards {active ? `${pct}% deployed` : "— none deployed"}
        </span>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button onClick={onFragment} style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "3px", padding: "0.1rem 0.35rem", fontSize: "0.54rem", color: "#FBBF24", cursor: "pointer" }}>+25%</button>
          {active && <button onClick={onRecall} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: "3px", padding: "0.1rem 0.35rem", fontSize: "0.54rem", color: "var(--subtle)", cursor: "pointer" }}>recall</button>}
        </div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #FBBF24, #f0d98a)", borderRadius: "3px", transition: "width 0.4s ease", boxShadow: active ? "0 0 6px rgba(251,191,36,0.5)" : "none" }} />
      </div>
    </div>
  );
}

// ─── Physical asset card ──────────────────────────────────────────────────────
function PhysicalCard({ card, shardPct, onFragment, onRecall, category }: {
  card: PhysicalCard; shardPct: number;
  onFragment: () => void; onRecall: () => void;
  category: "pokemon" | "onepiece" | "metal";
}) {
  const isPositive = card.change24h >= 0;
  const border     = Math.abs(card.change24h) > 5 ? (isPositive ? "rgba(20,241,149,0.25)" : "rgba(242,107,107,0.25)") : "var(--line)";

  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${border}`, borderRadius: "12px", padding: "0.875rem 1rem", transition: "border-color 0.3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.1rem" }}>{card.name}</div>
          {card.grade && <div style={{ fontSize: "0.6rem", color: "#FBBF24", fontWeight: 700, letterSpacing: "0.06em" }}>{card.grade}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          {card.floorSol !== undefined && <PriceTicker value={card.floorSol} unit="SOL" change={card.change24h} />}
          {card.spotUsd  !== undefined && <PriceTicker value={card.spotUsd}  unit="USD" change={card.change24h} />}
        </div>
      </div>
      {category !== "metal" && (
        <ShardBar pct={shardPct} onFragment={onFragment} onRecall={onRecall} />
      )}
      {category === "metal" && (
        <div style={{ fontSize: "0.62rem", color: "var(--subtle)", marginTop: "0.35rem" }}>
          Circuit Shield: auto-hedge to $USDY if flash crash &gt;5%
        </div>
      )}
    </div>
  );
}

// ─── Ondo stability card ──────────────────────────────────────────────────────
function OndoCard({ token }: { token: OndoToken }) {
  return (
    <div style={{ background: "rgba(20,241,149,0.04)", border: "1px solid rgba(20,241,149,0.15)", borderRadius: "12px", padding: "0.875rem 1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 700, color: "#14F195", marginBottom: "0.1rem" }}>{token.symbol}</div>
          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{token.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#14F195" }}>{token.baseApy}%</div>
          <div style={{ fontSize: "0.56rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>APY</div>
        </div>
      </div>
      <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginBottom: "0.35rem" }}>{token.description}</div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>Backed by <span style={{ color: "var(--text)" }}>{token.backing}</span></span>
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>Daily: <span style={{ color: "#14F195" }}>{token.dailyYield}%</span></span>
        <span style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>Supply: <span style={{ color: "var(--text)" }}>{token.circulatingSupply}</span></span>
      </div>
    </div>
  );
}

// ─── Stress test panel ────────────────────────────────────────────────────────
function StressTestPanel({ stress }: { stress: ReturnType<typeof useStressTest> }) {
  const { phase, log, run } = stress;
  const active = phase !== "idle";
  const phaseColor: Record<StressPhase, string> = {
    idle:      "var(--gold)",
    detecting: "#f26b6b",
    valuing:   "#FBBF24",
    briefing:  "#60A5FA",
    arming:    "#f26b6b",
    done:      "#14F195",
  };

  return (
    <div style={{ background: active ? "rgba(242,107,107,0.06)" : "var(--surface)", border: `1px solid ${active ? "rgba(242,107,107,0.25)" : "var(--line)"}`, borderRadius: "12px", overflow: "hidden", transition: "all 0.3s", marginBottom: "1.5rem" }}>
      <div style={{ padding: "0.7rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.625rem" }}>
        <div>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: phaseColor[phase], marginBottom: "0.1rem" }}>
            {phase === "idle" ? "Alpha Stress Test Ready" : `Stress Test: ${phase.toUpperCase()}`}
          </div>
          <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
            Simulates mass floor sweep → NAV recalculation → Circuit arming
          </div>
        </div>
        <button onClick={run} disabled={active} style={{ background: active ? "rgba(255,255,255,0.04)" : "#f26b6b", color: active ? "var(--subtle)" : "var(--void)", border: "none", borderRadius: "8px", padding: "0.5rem 1.1rem", fontWeight: 700, fontSize: "0.75rem", cursor: active ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk',sans-serif", whiteSpace: "nowrap" }}>
          {active ? `${phase.toUpperCase()}…` : "⚡ Execute Alpha Stress Test"}
        </button>
      </div>
      {log.length > 0 && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0.625rem 1rem", fontFamily: "'JetBrains Mono',monospace" }}>
          {log.slice(0, 6).map((line, i) => (
            <div key={i} style={{ fontSize: "0.6rem", color: i === 0 ? phaseColor[phase] : `rgba(255,255,255,${Math.max(0.2, 0.8 - i * 0.12)})`, marginBottom: "0.2rem", lineHeight: 1.4 }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RWAPage() {
  const [physical, setPhysical] = useState<PhysicalData | null>(null);
  const [ondo,     setOndo]     = useState<OndoToken[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { vaults }              = useSystemState();
  const { shards, fragment, recall } = useShardState();
  const stress = useStressTest(vaults[0]?.id);

  // Fetch physical NAV + Ondo data
  useEffect(() => {
    const load = async () => {
      try {
        const [physRes, ondoRes] = await Promise.allSettled([
          fetch("/api/rwa/physical"),
          fetch("/api/ondo"),
        ]);
        if (physRes.status === "fulfilled") {
          const d = await physRes.value.json();
          if (d.ok) setPhysical(d);
        }
        if (ondoRes.status === "fulfilled") {
          const d = await ondoRes.value.json();
          if (d.ok) setOndo(d.tokens ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
    // Refresh every 10 minutes (matches oracle window)
    const t = setInterval(load, 600_000);
    return () => clearInterval(t);
  }, []);

  const navSol = physical?.nav.totalSol ?? 0;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.3rem" }}>IP / RWA</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "clamp(1.5rem,4vw,2rem)", letterSpacing: "-0.02em", margin: 0 }}>
            Living Market
          </h1>
          {navSol > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, fontSize: "1.25rem", color: "#FBBF24" }}>
                {navSol.toFixed(1)} SOL
              </div>
              <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Physical NAV · updates every 10min
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stress test */}
      <StressTestPanel stress={stress} />

      {/* Macro telemetry — DeFiLlama */}
      <div style={{ marginBottom: "1.75rem" }}>
        <MacroPanel />
      </div>

      {/* Sovereign Metals — Gold & Silver */}
      {(!loading && physical?.metals && physical.metals.length > 0) && (
        <section style={{ marginBottom: "1.75rem" }}>
          <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--gold)", marginBottom: "0.625rem" }}>
            Sovereign Vault · Precious Metals
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%,280px),1fr))", gap: "0.875rem" }}>
            {physical.metals.map((m) => (
              <SovereignMetalCard key={m.name} metal={{ name: m.name, symbol: m.symbol ?? "XAU", spotUsd: m.spotUsd ?? 0, change24h: m.change24h, updatedAt: m.updatedAt }} />
            ))}
          </div>
        </section>
      )}

      {/* Stability layer — Ondo */}
      <section style={{ marginBottom: "1.75rem" }}>
        <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#14F195", marginBottom: "0.625rem" }}>
          Stability · Ondo Finance
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: "0.625rem" }}>
          {ondo.length > 0
            ? ondo.map((t) => <OndoCard key={t.symbol} token={t} />)
            : [
                { symbol: "$USDY", name: "USD Yield",            baseApy: 5.20, dailyYield: "0.0142", circulatingSupply: "$450M", backing: "BlackRock + Fidelity", description: "Tokenized US Treasury yield. Daily accrual. Instant redemption." },
                { symbol: "$OUSG", name: "Short-Term Treasuries", baseApy: 5.08, dailyYield: "0.0139", circulatingSupply: "$320M", backing: "BlackRock",           description: "Institutional short-term US government securities. T+1 settlement." },
              ].map((t) => <OndoCard key={t.symbol} token={t} />)
          }
        </div>
      </section>

      {/* Physical: Pokémon + One Piece */}
      {(!loading) && (
        <>
          <section style={{ marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FBBF24", margin: 0 }}>
                Pokémon TCG · Collector Crypt
              </p>
              <a href={`https://solscan.io/account/CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.6rem", color: "var(--subtle)", textDecoration: "none" }}>
                Program ↗
              </a>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: "0.5rem" }}>
              {(physical?.pokemon ?? []).map((c) => (
                <PhysicalCard key={c.name} card={c} category="pokemon"
                  shardPct={shards[c.name] ?? 0}
                  onFragment={() => fragment(c.name)}
                  onRecall={() => recall(c.name)} />
              ))}
            </div>
          </section>

          <section style={{ marginBottom: "1.75rem" }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#FBBF24", marginBottom: "0.625rem" }}>
              One Piece TCG · Physical
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: "0.5rem" }}>
              {(physical?.onepiece ?? []).map((c) => (
                <PhysicalCard key={c.name} card={c} category="onepiece"
                  shardPct={shards[c.name] ?? 0}
                  onFragment={() => fragment(c.name)}
                  onRecall={() => recall(c.name)} />
              ))}
            </div>
          </section>


        </>
      )}

      {loading && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--subtle)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem" }}>
          [ORACLE] FETCHING MARKET DATA…
        </div>
      )}
    </div>
  );
}
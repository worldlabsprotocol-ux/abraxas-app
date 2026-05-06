// FILE: app/arena/page.tsx
// Abraxas Collector Arena — sovereign card experience.
// Modes: Gallery (default) · Duel · Stake · Pack
// Sophia agents defend staked cards. $ABRA burns on every action.
// No heavy gameplay. Addictive but institutional.
"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, Zap, TrendingUp, Swords, Package, Star, Trophy, Flame, ChevronRight, Lock, Activity } from "lucide-react";
import { runDuel, stakeCard, unstakeCard, getAccruedYield, useArenaState, runDefenseTick, ArenaCard, DuelResult, CardCategory, DefenseLevel, StakePosition } from "@/lib/arena/arenaEngine";

// ─── Card data ─────────────────────────────────────────────────────────────────
function drift(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 600_000);
  return Math.round((base + (Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1 - 0.5) * range) * 100) / 100;
}

const BASE_CARDS: Omit<ArenaCard, "owned" | "stakeStatus" | "accruedYield" | "defenseLevel" | "defenseAgent" | "circuitScore" | "stakedAt" | "txSignature">[] = [
  { id:"pk-1", name:"Charizard 1st Ed.",   category:"pokemon",  grade:"PSA 10", rarity:"Legendary",  priceSol:148, priceUsd:22200, change24h:2.4,  series:"Base Set 1999",         population:122, power:98, defense:82, speed:91, color:"#FF6B35", icon:"🔥", stakeYieldPct:18, fractional:true  },
  { id:"pk-2", name:"Pikachu Illustrator", category:"pokemon",  grade:"PSA 9",  rarity:"Legendary",  priceSol:62,  priceUsd:9300,  change24h:1.1,  series:"CoroCoro 1998",         population:9,   power:95, defense:78, speed:99, color:"#FFD700", icon:"⚡", stakeYieldPct:22, fractional:true  },
  { id:"pk-3", name:"Blastoise 1st Ed.",   category:"pokemon",  grade:"PSA 10", rarity:"Ultra Rare", priceSol:41,  priceUsd:6150,  change24h:-0.8, series:"Base Set 1999",         population:214, power:85, defense:94, speed:72, color:"#4A90D9", icon:"💧", stakeYieldPct:14, fractional:true  },
  { id:"pk-4", name:"Venusaur 1st Ed.",    category:"pokemon",  grade:"PSA 10", rarity:"Ultra Rare", priceSol:28,  priceUsd:4200,  change24h:0.5,  series:"Base Set 1999",         population:319, power:82, defense:88, speed:68, color:"#4CAF50", icon:"🌿", stakeYieldPct:12, fractional:false },
  { id:"pk-5", name:"Ancient Mew Promo",   category:"pokemon",  grade:"PSA 10", rarity:"Rare",       priceSol:12,  priceUsd:1800,  change24h:3.2,  series:"Movie Promo 2000",      population:1240,power:70, defense:75, speed:80, color:"#9C27B0", icon:"🌀", stakeYieldPct:9,  fractional:false },
  { id:"op-1", name:"Luffy Alt Art",       category:"onepiece", grade:"PSA 10", rarity:"Legendary",  priceSol:38,  priceUsd:5700,  change24h:4.8,  series:"OP-01 Romance Dawn",    population:88,  power:96, defense:80, speed:94, color:"#E53935", icon:"👊", stakeYieldPct:20, fractional:true  },
  { id:"op-2", name:"Shanks Secret Rare",  category:"onepiece", grade:"PSA 10", rarity:"Legendary",  priceSol:29,  priceUsd:4350,  change24h:2.1,  series:"OP-01 Romance Dawn",    population:64,  power:93, defense:90, speed:88, color:"#CC0000", icon:"⚔️", stakeYieldPct:17, fractional:true  },
  { id:"op-3", name:"Zoro Alt Art",        category:"onepiece", grade:"PSA 10", rarity:"Ultra Rare", priceSol:22,  priceUsd:3300,  change24h:1.7,  series:"OP-02 Paramount War",   population:112, power:91, defense:86, speed:85, color:"#2E7D32", icon:"🗡️", stakeYieldPct:15, fractional:true  },
  { id:"op-4", name:"Nami Leader Alt",     category:"onepiece", grade:"PSA 10", rarity:"Ultra Rare", priceSol:18,  priceUsd:2700,  change24h:-1.2, series:"OP-02 Paramount War",   population:203, power:77, defense:84, speed:92, color:"#F57F17", icon:"🍊", stakeYieldPct:12, fractional:false },
  { id:"op-5", name:"Kaido Secret Rare",   category:"onepiece", grade:"PSA 10", rarity:"Legendary",  priceSol:25,  priceUsd:3750,  change24h:1.4,  series:"OP-06 Wings of Captain",population:79,  power:99, defense:95, speed:70, color:"#1A237E", icon:"🐉", stakeYieldPct:19, fractional:true  },
  { id:"op-6", name:"Ace Parallel Rare",   category:"onepiece", grade:"PSA 10", rarity:"Ultra Rare", priceSol:20,  priceUsd:3000,  change24h:3.6,  series:"OP-04 Kingdoms",        population:156, power:88, defense:79, speed:90, color:"#FF6D00", icon:"🔥", stakeYieldPct:14, fractional:true  },
  { id:"op-7", name:"Robin Secret Rare",   category:"onepiece", grade:"PSA 10", rarity:"Rare",       priceSol:16,  priceUsd:2400,  change24h:0.9,  series:"OP-03 Pillars",         population:287, power:75, defense:82, speed:86, color:"#6A1B9A", icon:"🌸", stakeYieldPct:10, fractional:false },
  { id:"lx-1", name:"Gulfstream G700",     category:"luxury",   grade:"RWA",    rarity:"Legendary",  priceSol:4200,priceUsd:630000,change24h:0.1,  series:"Aviation Series 1",     population:1,   power:100,defense:98, speed:96, color:"#C8A96E", icon:"✈️", stakeYieldPct:7,  fractional:true  },
  { id:"lx-2", name:"Monaco Penthouse 1/10",category:"luxury",  grade:"RWA",    rarity:"Legendary",  priceSol:8800,priceUsd:1320000,change24h:0.3, series:"RE Sovereign Series",   population:10,  power:97, defense:99, speed:60, color:"#B8860B", icon:"🏢", stakeYieldPct:9,  fractional:true  },
  { id:"lx-3", name:"Sunseeker 95 Yacht",  category:"luxury",   grade:"RWA",    rarity:"Ultra Rare", priceSol:2100,priceUsd:315000,change24h:0.2,  series:"Maritime Series 1",     population:4,   power:88, defense:92, speed:82, color:"#1565C0", icon:"⛵", stakeYieldPct:6,  fractional:true  },
];

function buildCards(stakes: Record<string, StakePosition>): ArenaCard[] {
  return BASE_CARDS.map((c) => {
    const s = stakes[c.id];
    const isStaked = !!s;
    return {
      ...c,
      priceSol:     drift(c.priceSol, Number(c.id.slice(-1)) * 1.3 + 2, c.priceSol * 0.02),
      owned:        true, // demo: all owned
      stakeStatus:  isStaked ? "staked" : "unstaked",
      accruedYield: isStaked ? getAccruedYield(s) : 0,
      defenseLevel: isStaked ? "armed" : "inactive",
      defenseAgent: s?.defenseAgent,
      circuitScore: Math.round(drift(100 - c.defense, Number(c.id.slice(-1)) * 2.1, 12)),
      stakedAt:     s?.stakedAt,
    };
  });
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const RARITY_CONFIG = {
  Legendary:  { color: "#FFD700", glow: "rgba(255,215,0,0.35)",    bg: "rgba(255,215,0,0.08)"    },
  "Ultra Rare":{ color: "#C8A96E", glow: "rgba(200,169,110,0.3)",  bg: "rgba(200,169,110,0.08)"  },
  Rare:        { color: "#60A5FA", glow: "rgba(96,165,250,0.3)",    bg: "rgba(96,165,250,0.08)"   },
  Common:      { color: "rgba(255,255,255,0.4)", glow:"none",       bg: "transparent"              },
};
const DEFENSE_CONFIG: Record<DefenseLevel, { color: string; label: string; pulse: boolean }> = {
  armed:    { color: "#14F195", label: "ARMED",    pulse: true  },
  alert:    { color: "#FBBF24", label: "ALERT",    pulse: true  },
  breached: { color: "#f26b6b", label: "BREACHED", pulse: true  },
  inactive: { color: "rgba(255,255,255,0.2)", label: "INACTIVE", pulse: false },
};

// ─── Stat bar ────────────────────────────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.54rem", color:"rgba(255,255,255,0.4)", marginBottom:"2px", letterSpacing:"0.06em" }}>
        <span>{label}</span><span style={{ color, fontWeight:700 }}>{value}</span>
      </div>
      <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"2px", height:"3px" }}>
        <div style={{ width:`${value}%`, height:"100%", background:`linear-gradient(90deg, ${color}88, ${color})`, borderRadius:"2px", transition:"width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ─── Card tile ───────────────────────────────────────────────────────────────
type Mode = "gallery" | "duel" | "stake" | "pack";

function CardTile({ card, mode, selected, onSelect, onAction }: {
  card: ArenaCard; mode: Mode; selected: boolean;
  onSelect: () => void; onAction: (action: "stake" | "unstake" | "duel") => void;
}) {
  const rc = RARITY_CONFIG[card.rarity];
  const dc = DEFENSE_CONFIG[card.defenseLevel];
  const isStaked = card.stakeStatus === "staked";
  const positive = card.change24h >= 0;

  return (
    <div onClick={onSelect} style={{
      background: selected ? `linear-gradient(135deg, ${card.color}18, ${card.color}06)` : "rgba(10,10,12,0.95)",
      border: `1px solid ${selected ? card.color+"88" : card.color+"22"}`,
      borderRadius:"14px", overflow:"hidden", cursor:"pointer",
      boxShadow: selected ? `0 0 20px ${card.color}22` : "none",
      transition:"all 0.2s ease",
    }}>
      {/* Art panel */}
      <div style={{ height:"120px", background:`linear-gradient(135deg, ${card.color}28, ${card.color}08)`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", borderBottom:`1px solid ${card.color}18` }}>
        <span style={{ fontSize:"3rem", filter: selected ? `drop-shadow(0 0 12px ${card.color})` : "none", transition:"filter 0.3s" }}>{card.icon}</span>

        {/* Top badges */}
        <div style={{ position:"absolute", top:"0.4rem", left:"0.4rem", display:"flex", flexDirection:"column", gap:"0.2rem" }}>
          <span style={{ fontSize:"0.5rem", fontWeight:700, padding:"0.1rem 0.35rem", borderRadius:"3px", background:rc.bg, color:rc.color, border:`1px solid ${rc.color}44`, letterSpacing:"0.06em" }}>
            {card.rarity.toUpperCase()}
          </span>
        </div>
        <div style={{ position:"absolute", top:"0.4rem", right:"0.4rem" }}>
          <span style={{ fontSize:"0.5rem", fontWeight:700, padding:"0.1rem 0.35rem", borderRadius:"3px", background:"rgba(0,0,0,0.6)", color:"#FBBF24" }}>
            {card.grade}
          </span>
        </div>

        {/* Defense indicator */}
        <div style={{ position:"absolute", bottom:"0.4rem", left:"0.4rem", display:"flex", alignItems:"center", gap:"0.25rem" }}>
          <span style={{ width:"5px", height:"5px", borderRadius:"50%", background:dc.color, animation:dc.pulse?"pulse 1.5s ease-in-out infinite":"none", boxShadow:dc.pulse?`0 0 4px ${dc.color}`:"none" }} />
          <span style={{ fontSize:"0.5rem", fontWeight:700, color:dc.color, letterSpacing:"0.06em" }}>{dc.label}</span>
        </div>

        {/* Staked badge */}
        {isStaked && (
          <div style={{ position:"absolute", bottom:"0.4rem", right:"0.4rem" }}>
            <span style={{ fontSize:"0.5rem", padding:"0.1rem 0.35rem", borderRadius:"3px", background:"rgba(20,241,149,0.15)", color:"#14F195", border:"1px solid rgba(20,241,149,0.3)" }}>
              STAKED
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding:"0.625rem" }}>
        <div style={{ fontWeight:700, fontSize:"0.78rem", marginBottom:"0.1rem", lineHeight:1.3, color:"rgba(255,255,255,0.95)" }}>{card.name}</div>
        <div style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.3)", marginBottom:"0.5rem" }}>{card.series}</div>

        {/* Price */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"0.4rem" }}>
          <span style={{ fontWeight:700, fontSize:"0.85rem" }}>{card.priceSol.toFixed(1)} SOL</span>
          <span style={{ fontSize:"0.6rem", fontWeight:700, color:positive?"#14F195":"#f26b6b" }}>
            {positive?"+":""}{card.change24h.toFixed(1)}%
          </span>
        </div>

        {/* Stats */}
        <div style={{ display:"flex", flexDirection:"column", gap:"0.2rem", marginBottom:"0.5rem" }}>
          <StatBar label="PWR" value={card.power}   color={card.color} />
          <StatBar label="DEF" value={card.defense} color="#14F195" />
          <StatBar label="SPD" value={card.speed}   color="#60A5FA" />
        </div>

        {/* Staking yield */}
        {isStaked && card.accruedYield > 0 && (
          <div style={{ padding:"0.3rem 0.4rem", background:"rgba(20,241,149,0.06)", borderRadius:"5px", marginBottom:"0.4rem", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"0.56rem", color:"rgba(20,241,149,0.7)" }}>Accrued</span>
            <span style={{ fontSize:"0.58rem", fontWeight:700, color:"#14F195", fontFamily:"'JetBrains Mono',monospace" }}>{card.accruedYield.toFixed(6)} ABRA</span>
          </div>
        )}

        {/* Mode-specific CTA */}
        {mode === "stake" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(isStaked ? "unstake" : "stake"); }}
            style={{ width:"100%", background:isStaked?"rgba(242,107,107,0.12)":"rgba(20,241,149,0.12)", border:`1px solid ${isStaked?"rgba(242,107,107,0.3)":"rgba(20,241,149,0.3)"}`, borderRadius:"6px", padding:"0.35rem", fontSize:"0.65rem", fontWeight:700, color:isStaked?"#f26b6b":"#14F195", cursor:"pointer" }}>
            {isStaked ? `Unstake · ${card.stakeYieldPct}% APY` : `Stake · ${card.stakeYieldPct}% APY`}
          </button>
        )}
        {mode === "duel" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction("duel"); }}
            style={{ width:"100%", background:selected?"rgba(255,107,53,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${selected?card.color+"44":"rgba(255,255,255,0.08)"}`, borderRadius:"6px", padding:"0.35rem", fontSize:"0.62rem", fontWeight:700, color:selected?card.color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>
            {selected ? "Selected ✓" : "Select for Duel"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Duel arena ──────────────────────────────────────────────────────────────
function DuelArena({ cards, onClose }: { cards: [ArenaCard, ArenaCard]; onClose: () => void }) {
  const [result, setResult]   = useState<DuelResult | null>(null);
  const [phase,  setPhase]    = useState<"ready" | "fighting" | "done">("ready");
  const [roundIdx, setRoundIdx] = useState(0);

  const fight = async () => {
    setPhase("fighting");
    const res = runDuel(cards[0], cards[1]);
    // Reveal rounds one by one
    for (let i = 0; i <= res.rounds.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      setRoundIdx(i);
    }
    setResult(res);
    setPhase("done");
  };

  const STAT_COLOR = { power:"#FF6B35", defense:"#14F195", speed:"#60A5FA" } as const;
  const winner = result?.winner;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.9)", backdropFilter:"blur(16px)", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:"560px", background:"rgba(8,8,12,0.98)", border:"1px solid rgba(255,107,53,0.25)", borderRadius:"20px", padding:"1.75rem", position:"relative", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:"1.25rem" }}>
          <p style={{ fontSize:"0.58rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(255,107,53,0.7)", marginBottom:"0.3rem" }}>
            Abraxas Duel · $ABRA Burn: 0.5
          </p>
          <h2 style={{ fontWeight:800, fontSize:"1.25rem", letterSpacing:"-0.02em" }}>
            {phase === "ready" ? "Challenger vs Defender" : phase === "fighting" ? "Simulating…" : "Result"}
          </h2>
        </div>

        {/* Cards matchup */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"0.75rem", alignItems:"center", marginBottom:"1.25rem" }}>
          {cards.map((card, i) => (
            <div key={card.id} style={{ textAlign:i===0?"left":"right" }}>
              <div style={{ fontSize:"2.5rem", marginBottom:"0.25rem" }}>{card.icon}</div>
              <div style={{ fontWeight:700, fontSize:"0.8rem", marginBottom:"0.1rem" }}>{card.name}</div>
              <div style={{ fontSize:"0.58rem", color:"rgba(255,255,255,0.4)" }}>{card.grade}</div>
              {winner && (
                <div style={{ marginTop:"0.35rem", fontSize:"0.6rem", fontWeight:700, color: (winner === "challenger" && i === 0) || (winner === "defender" && i === 1) ? "#14F195" : "#f26b6b" }}>
                  {(winner === "challenger" && i === 0) || (winner === "defender" && i === 1) ? "VICTORY" : "DEFEATED"}
                </div>
              )}
            </div>
          ))}
          <div style={{ textAlign:"center" }}>
            <Swords size={24} color="rgba(255,107,53,0.6)" />
          </div>
        </div>

        {/* Round results */}
        {result && (
          <div style={{ marginBottom:"1rem" }}>
            {result.rounds.slice(0, roundIdx).map((r) => (
              <div key={r.round} style={{ display:"grid", gridTemplateColumns:"40px 1fr 40px", gap:"0.5rem", alignItems:"center", padding:"0.4rem 0.5rem", background:"rgba(255,255,255,0.03)", borderRadius:"6px", marginBottom:"0.3rem", border:`1px solid ${STAT_COLOR[r.stat]}22` }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:STAT_COLOR[r.stat], textAlign:"center" }}>{r.challengerRoll}</span>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.3)", marginBottom:"1px", letterSpacing:"0.08em" }}>{r.stat.toUpperCase()}</div>
                  <div style={{ fontSize:"0.62rem", color:`${STAT_COLOR[r.stat]}bb`, fontStyle:"italic" }}>{r.narrative}</div>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"0.6rem", fontWeight:700, color:STAT_COLOR[r.stat], textAlign:"center" }}>{r.defenderRoll}</span>
              </div>
            ))}
          </div>
        )}

        {/* Agent reasoning */}
        {result && phase === "done" && (
          <div style={{ background:"rgba(2,3,10,0.95)", border:"1px solid rgba(96,165,250,0.2)", borderRadius:"10px", padding:"0.75rem", marginBottom:"1rem", fontFamily:"'JetBrains Mono',monospace" }}>
            {result.agentReasoning.split("\n").map((line, i) => (
              <p key={i} style={{ margin:"0 0 0.2rem", fontSize:"0.58rem", color:i===0?"#60A5FA":`rgba(96,165,250,${0.7-i*0.1})` }}>{line}</p>
            ))}
          </div>
        )}

        {/* Flavor text */}
        {result && phase === "done" && (
          <div style={{ textAlign:"center", marginBottom:"1rem", padding:"0.75rem", background:"rgba(255,215,0,0.06)", borderRadius:"8px", border:"1px solid rgba(255,215,0,0.15)" }}>
            <p style={{ fontSize:"0.75rem", fontStyle:"italic", color:"rgba(255,215,0,0.8)", lineHeight:1.6 }}>"{result.flavorText}"</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ display:"flex", gap:"0.625rem" }}>
          {phase === "ready" && (
            <button onClick={fight} style={{ flex:1, background:"#FF6B35", color:"var(--void)", border:"none", borderRadius:"10px", padding:"0.7rem", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
              ⚔️ Fight (0.5 $ABRA)
            </button>
          )}
          <button onClick={onClose} style={{ flex: phase === "ready" ? 0 : 1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"0.7rem", fontSize:"0.78rem", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
            {phase === "done" ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pack reveal ──────────────────────────────────────────────────────────────
function PackReveal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"idle" | "opening" | "revealed">("idle");
  const [revealed, setRevealed] = useState<typeof BASE_CARDS[0] | null>(null);

  const open = async () => {
    setPhase("opening");
    await new Promise((r) => setTimeout(r, 1800));
    const r = BASE_CARDS[Math.floor(Math.random() * BASE_CARDS.length)];
    setRevealed(r);
    setPhase("revealed");
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.9)", backdropFilter:"blur(16px)", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:"380px", background:"rgba(8,8,12,0.98)", border:"1px solid rgba(200,169,110,0.25)", borderRadius:"20px", padding:"2rem", textAlign:"center" }}>
        <p style={{ fontSize:"0.58rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(200,169,110,0.7)", marginBottom:"0.5rem" }}>
          Abraxas Pack · 1 $ABRA
        </p>
        <h2 style={{ fontWeight:800, fontSize:"1.1rem", marginBottom:"1.5rem" }}>Collector Crypt Pack</h2>

        {/* Pack orb */}
        <div style={{ width:"100px", height:"100px", borderRadius:"50%", margin:"0 auto 1.5rem", background:phase==="opening"?"radial-gradient(circle at 35%, #FFD70088, #C8A96E22)":"radial-gradient(circle at 35%, #C8A96E44, #7A4F0022)", border:`2px solid ${phase==="opening"?"#FFD700":"#C8A96E"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem", boxShadow:phase==="opening"?"0 0 40px rgba(255,215,0,0.4)":"none", animation:phase==="opening"?"pulse 0.5s ease-in-out infinite":"none", transition:"all 0.4s" }}>
          {phase==="idle"?"⬡":phase==="opening"?"✦":revealed?.icon}
        </div>

        {phase === "revealed" && revealed && (
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={{ fontWeight:800, fontSize:"1.1rem", marginBottom:"0.25rem" }}>{revealed.name}</div>
            <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.5)", marginBottom:"0.5rem" }}>{revealed.grade} · {revealed.series}</div>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:RARITY_CONFIG[revealed.rarity as keyof typeof RARITY_CONFIG]?.color ?? "#fff" }}>
              {revealed.rarity.toUpperCase()}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:"0.5rem" }}>
          {phase === "idle" && (
            <button onClick={open} style={{ flex:1, background:"var(--gold)", color:"var(--void)", border:"none", borderRadius:"10px", padding:"0.7rem", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
              Open Pack (1 $ABRA)
            </button>
          )}
          {phase !== "idle" && (
            <button onClick={onClose} style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", padding:"0.7rem", fontSize:"0.78rem", color:"rgba(255,255,255,0.5)", cursor:"pointer" }}>
              {phase==="opening"?"Opening…":"Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ArenaPage() {
  const { abraBurned, stakes } = useArenaState();
  const [mode,      setMode]      = useState<Mode>("gallery");
  const [filter,    setFilter]    = useState<CardCategory | "all">("all");
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [duelCards, setDuelCards] = useState<[ArenaCard, ArenaCard] | null>(null);
  const [showPack,  setShowPack]  = useState(false);
  const [cards,     setCards]     = useState<ArenaCard[]>([]);

  useEffect(() => {
    setCards(buildCards(stakes));
    const iv = setInterval(() => setCards(buildCards(stakes)), 10_000);
    return () => clearInterval(iv);
  }, [stakes]);

  const filtered = cards.filter((c) => filter === "all" || c.category === filter);
  const stakedCards = cards.filter((c) => c.stakeStatus === "staked");
  const totalSol = cards.reduce((s, c) => s + c.priceSol, 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { if (next.size < 2) next.add(id); }
      return next;
    });
  };

  const handleCardAction = (card: ArenaCard, action: "stake" | "unstake" | "duel") => {
    if (action === "stake")   { stakeCard(card);        setCards(buildCards(readStakesShim())); }
    if (action === "unstake") { unstakeCard(card.id);   setCards(buildCards(readStakesShim())); }
    if (action === "duel")    { toggleSelect(card.id); }
  };

  // Read stakes directly for immediate re-render
  function readStakesShim() {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("abraxas_arena_stakes_v1") ?? "{}"); } catch { return {}; }
  }

  const launchDuel = () => {
    const sel = cards.filter((c) => selected.has(c.id));
    if (sel.length === 2) setDuelCards([sel[0], sel[1]]);
  };

  const MODES: Array<{ key: Mode; label: string; icon: React.ReactNode }> = [
    { key:"gallery", label:"Gallery",    icon:<Star size={14}/> },
    { key:"duel",    label:"Duel",       icon:<Swords size={14}/> },
    { key:"stake",   label:"Stake",      icon:<TrendingUp size={14}/> },
    { key:"pack",    label:"Open Pack",  icon:<Package size={14}/> },
  ];

  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"1.5rem 1.25rem 3rem" }}>
      {duelCards && <DuelArena cards={duelCards} onClose={() => { setDuelCards(null); setSelected(new Set()); }} />}
      {showPack  && <PackReveal onClose={() => setShowPack(false)} />}

      {/* Hero */}
      <div style={{ marginBottom:"1.5rem", padding:"1.25rem 1.5rem", background:"linear-gradient(135deg, rgba(200,169,110,0.1), rgba(0,0,0,0) 60%)", border:"1px solid rgba(200,169,110,0.2)", borderRadius:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <p style={{ fontSize:"0.56rem", letterSpacing:"0.18em", textTransform:"uppercase", color:"rgba(200,169,110,0.7)", marginBottom:"0.3rem" }}>
              Abraxas · Collector Crypt · $CARDS Program
            </p>
            <h1 style={{ fontWeight:800, fontSize:"clamp(1.4rem,3.5vw,1.9rem)", letterSpacing:"-0.02em", margin:"0 0 0.3rem" }}>
              Collector Arena
            </h1>
            <p style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.45)", margin:0 }}>
              Stake · Duel · Protect with Sophia
            </p>
          </div>
          <div style={{ display:"flex", gap:"1.25rem", flexWrap:"wrap" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, fontSize:"1.1rem", color:"var(--gold)" }}>{totalSol.toFixed(0)} SOL</div>
              <div style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Portfolio</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, fontSize:"1.1rem", color:"#14F195" }}>{stakedCards.length}</div>
              <div style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Staked</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:800, fontSize:"1.1rem", color:"#f26b6b", display:"flex", alignItems:"center", gap:"0.3rem" }}>
                <Flame size={14} />{abraBurned.toFixed(1)}
              </div>
              <div style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>$ABRA Burned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1.25rem", flexWrap:"wrap", alignItems:"center" }}>
        {MODES.map((m) => (
          <button key={m.key} onClick={() => { setMode(m.key); if (m.key==="pack") setShowPack(true); setSelected(new Set()); }}
            style={{ display:"flex", alignItems:"center", gap:"0.35rem", background:mode===m.key?"rgba(200,169,110,0.15)":"rgba(255,255,255,0.04)", border:`1px solid ${mode===m.key?"var(--gold)":"rgba(255,255,255,0.08)"}`, borderRadius:"8px", padding:"0.4rem 0.875rem", fontSize:"0.7rem", fontWeight:mode===m.key?700:400, color:mode===m.key?"var(--gold)":"rgba(255,255,255,0.5)", cursor:"pointer" }}>
            {m.icon} {m.label}
          </button>
        ))}

        {/* Category filter */}
        <div style={{ marginLeft:"auto", display:"flex", gap:"0.3rem" }}>
          {(["all","pokemon","onepiece","luxury"] as const).map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ background:filter===cat?"rgba(200,169,110,0.12)":"transparent", border:`1px solid ${filter===cat?"var(--gold)":"rgba(255,255,255,0.08)"}`, borderRadius:"5px", padding:"0.3rem 0.5rem", fontSize:"0.6rem", fontWeight:filter===cat?700:400, color:filter===cat?"var(--gold)":"rgba(255,255,255,0.4)", cursor:"pointer" }}>
              {cat === "all" ? "All" : cat === "pokemon" ? "Pokémon" : cat === "onepiece" ? "One Piece" : "Luxury"}
            </button>
          ))}
        </div>
      </div>

      {/* Duel launch bar */}
      {mode === "duel" && (
        <div style={{ padding:"0.75rem 1rem", background:"rgba(255,107,53,0.08)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:"10px", marginBottom:"1rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem", flexWrap:"wrap" }}>
          <div style={{ fontSize:"0.72rem", color:"rgba(255,107,53,0.8)" }}>
            {selected.size === 0 ? "Select 2 cards to duel" : selected.size === 1 ? "Select 1 more card" : "Ready to duel!"}
          </div>
          <button onClick={launchDuel} disabled={selected.size !== 2}
            style={{ background:selected.size===2?"#FF6B35":"rgba(255,255,255,0.04)", color:selected.size===2?"var(--void)":"rgba(255,255,255,0.3)", border:"none", borderRadius:"7px", padding:"0.4rem 1rem", fontSize:"0.72rem", fontWeight:700, cursor:selected.size===2?"pointer":"not-allowed" }}>
            ⚔️ Launch Duel (0.5 $ABRA)
          </button>
        </div>
      )}

      {/* Card grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%,180px),1fr))", gap:"0.75rem" }}>
        {filtered.map((card) => (
          <CardTile key={card.id} card={card} mode={mode} selected={selected.has(card.id)}
            onSelect={() => mode === "duel" ? toggleSelect(card.id) : {}}
            onAction={(action) => handleCardAction(card, action)} />
        ))}
      </div>
    </div>
  );
}
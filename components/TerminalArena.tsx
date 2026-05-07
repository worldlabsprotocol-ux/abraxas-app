// FILE: components/TerminalArena.tsx
// Unified Terminal: Sold Tape (top) + Active Arena (main).
// Uses framer-motion for card flips when installed.
// CSS-only fallback via data-flip attribute for pre-install safety.
// Gold: $4,733.39 | Silver: $72.91 (May 2026)
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArenaAsset {
  id: string; name: string; category: string; ticker: string;
  grade: string; vaultLocation: string;
  priceUsd: number; last_sold_price: number; last_sold_source: string;
  change24h: number; imagePath: string; rarity: string;
  atk: number; def: number; speed: number;
  circuitScore: number; defenseLevel: string;
  protected: boolean; staked: boolean;
  apy?: number; quick_duel?: boolean;
  attributes?: { power_level: number; liquidity_velocity?: string };
  is_duel_eligible?: boolean;
}

interface SoldTick {
  id: string; name: string; price: number; category: string;
  source: string; ts: number; ticker: string;
}

interface BattleState {
  phase: "idle" | "selecting" | "fighting" | "resolved";
  playerCard: ArenaAsset | null;
  agentCard: ArenaAsset | null;
  round: number; playerHp: number; agentHp: number;
  log: string[]; winner: "player" | "agent" | null;
  abraEarned: number;
}

// ─── Framer Motion conditional import ──────────────────────────────────────
// framer-motion may not be installed yet — wrap in try/catch at runtime
// For SSR safety we use CSS transitions as the base and upgrade if available
let motion: any = null;
let AnimatePresence: any = null;
if (typeof window !== "undefined") {
  try {
    const fm = require("framer-motion");
    motion = fm.motion;
    AnimatePresence = fm.AnimatePresence;
  } catch {}
}

// ─── Sold tape entries — seeded from real sold data ───────────────────────────
function buildSoldTape(assets: ArenaAsset[]): SoldTick[] {
  const sold = assets
    .filter(a => a.last_sold_price > 0)
    .map(a => ({
      id: a.id, name: a.name, price: a.last_sold_price,
      category: a.category, source: a.last_sold_source ?? "Oracle",
      ts: Date.now() - Math.floor(Math.random() * 7_200_000),
      ticker: a.ticker,
    }));
  return sold.sort((a, b) => b.price - a.price).slice(0, 20);
}

// ─── Sophia agent flavor ───────────────────────────────────────────────────────
const SOPHIA_AGENTS = [
  { id:"HED",  name:"Sophia-Hed",  role:"Hedge Strategist",    buff:"+20% DEF in arena",    color:"#14F195" },
  { id:"REB",  name:"Sophia-Reb",  role:"Rebalance Engine",    buff:"+15% ATK on streaks",  color:"#6b8cff" },
  { id:"YLD",  name:"Sophia-Yld",  role:"Yield Optimizer",     buff:"+2x $ABRA on win",     color:"#C8A96E" },
  { id:"CGD",  name:"Sophia-Cgd",  role:"Circuit Guardian",    buff:"Shield: -40% damage",  color:"#a855f7" },
];

// ─── Win formula ─────────────────────────────────────────────────────────────
function calcWinProb(card: ArenaAsset, agent: typeof SOPHIA_AGENTS[0]): number {
  const base  = card.attributes?.power_level ?? 60;
  const buff  = agent.id === "HED" ? 8 : agent.id === "CGD" ? 6 : agent.id === "YLD" ? 4 : 5;
  const circ  = Math.max(0, 100 - card.circuitScore) * 0.1;
  return Math.min(92, Math.round(base * 0.6 + buff + circ));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}
function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}
const CAT_COLOR: Record<string, string> = {
  Pokemon:"#FBBF24", "One Piece":"#f26b6b", Comics:"#a855f7",
  Metals:"#D4AF37", Stocks:"#14F195", Timepieces:"#C8A96E",
  Luxury:"#60A5FA", Sports:"#fb923c",
};

// ─── Sold tape (scrolling ticker) ────────────────────────────────────────────
function SoldTape({ ticks }: { ticks: SoldTick[] }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div style={{ position:"relative", height:"36px", background:"rgba(2,3,10,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", display:"flex", alignItems:"center" }}>
      {/* SOLD label */}
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"70px", background:"linear-gradient(90deg,rgba(2,3,10,1) 60%,transparent)", zIndex:2, display:"flex", alignItems:"center", paddingLeft:"0.75rem" }}>
        <span style={{ fontSize:"0.5rem", fontWeight:900, color:"#14F195", letterSpacing:"0.16em", fontFamily:"'JetBrains Mono',monospace" }}>SOLD</span>
      </div>
      {/* Scrolling ticks */}
      <div ref={ref} style={{ display:"flex", gap:"0", paddingLeft:"80px", animation:"ticker 60s linear infinite", whiteSpace:"nowrap" }}>
        {[...ticks, ...ticks].map((t, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:"0.35rem", padding:"0 1.25rem", borderRight:"1px solid rgba(255,255,255,0.06)", fontSize:"0.58rem", fontFamily:"'JetBrains Mono',monospace", color:"rgba(255,255,255,0.7)" }}>
            <span style={{ color:CAT_COLOR[t.category]???"#fff", fontWeight:700 }}>{t.ticker}</span>
            <span style={{ color:"#f0f0f0", fontVariantNumeric:"tabular-nums", fontWeight:700 }}>{fmtUsd(t.price)}</span>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:"0.5rem" }}>{t.source} · {timeAgo(t.ts)}</span>
          </span>
        ))}
      </div>
      {/* Right fade */}
      <div style={{ position:"absolute", right:0, top:0, bottom:0, width:"60px", background:"linear-gradient(270deg,rgba(2,3,10,1) 40%,transparent)", zIndex:2 }} />
    </div>
  );
}

// ─── Asset card with flip animation ──────────────────────────────────────────
function FlipCard({ asset, selected, onSelect, compact }: {
  asset: ArenaAsset; selected: boolean;
  onSelect: (a: ArenaAsset) => void; compact?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [imgErr,  setImgErr]  = useState(false);
  const positive = asset.change24h >= 0;
  const catColor = CAT_COLOR[asset.category] ?? "#6b8cff";
  const power    = asset.attributes?.power_level ?? 60;

  const CardDiv = motion?.div ?? "div";

  return (
    <div
      style={{ perspective:"1000px", height:compact?"240px":"320px", cursor:"pointer" }}
      onClick={() => { onSelect(asset); setFlipped(f => !f); }}
    >
      <div style={{
        position:"relative", width:"100%", height:"100%",
        transformStyle:"preserve-3d",
        transform:flipped?"rotateY(180deg)":"rotateY(0deg)",
        transition:"transform 0.55s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* FRONT */}
        <div style={{
          position:"absolute", inset:0, backfaceVisibility:"hidden",
          borderRadius:"14px", overflow:"hidden",
          background:"rgba(6,8,16,0.97)",
          border:`1px solid ${selected ? catColor+"88" : catColor+"22"}`,
          boxShadow:selected?`0 0 24px ${catColor}22`:"none",
        }}>
          {/* Image — object-contain, full slab visible */}
          <div style={{ position:"relative", height:compact?"120px":"180px", background:`linear-gradient(135deg,${catColor}14,rgba(6,8,16,0.98))`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {!imgErr ? (
              <img src={asset.imagePath} alt={asset.name}
                onError={() => setImgErr(true)}
                style={{ width:"100%", height:"100%", objectFit:"contain", maxHeight:compact?"120px":"180px", display:"block" }}
              />
            ) : (
              <span style={{ fontSize:compact?"2rem":"3rem", filter:`drop-shadow(0 0 12px ${catColor}88)` }}>
                {asset.category==="Metals"?"🥇":asset.category==="Comics"?"📕":asset.category==="Stocks"?"📈":"◈"}
              </span>
            )}
            {/* Badges */}
            <div style={{ position:"absolute", top:"0.4rem", left:"0.4rem" }}>
              <span style={{ fontSize:"0.44rem", fontWeight:800, padding:"0.1rem 0.35rem", borderRadius:"3px", background:"rgba(0,0,0,0.75)", color:catColor, letterSpacing:"0.06em", fontFamily:"'JetBrains Mono',monospace" }}>
                {asset.rarity?.slice(0,10).toUpperCase()}
              </span>
            </div>
            {asset.protected && (
              <div style={{ position:"absolute", top:"0.4rem", right:"0.4rem", display:"flex", alignItems:"center", gap:"0.2rem", padding:"0.08rem 0.35rem", borderRadius:"3px", background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.4)" }}>
                <span style={{ width:"4px", height:"4px", borderRadius:"50%", background:"#D4AF37", animation:"pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize:"0.42rem", fontWeight:700, color:"#D4AF37", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>AUTH</span>
              </div>
            )}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%", background:"linear-gradient(to top,rgba(6,8,16,0.9),transparent)", pointerEvents:"none" }} />
          </div>

          {/* Info */}
          <div style={{ padding:"0.5rem 0.625rem" }}>
            <div style={{ fontWeight:800, fontSize:"0.78rem", color:"#f0f0f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:"1px" }}>{asset.name}</div>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.35rem" }}>{asset.grade} · {asset.vaultLocation?.split("—")[0]?.trim()}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:"0.35rem" }}>
              <span style={{ fontWeight:800, fontSize:"0.9rem", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(asset.priceUsd)}</span>
              <span style={{ fontSize:"0.58rem", fontWeight:700, color:positive?"#14F195":"#f26b6b", fontVariantNumeric:"tabular-nums" }}>
                {positive?"+":""}{asset.change24h?.toFixed(2)}%
              </span>
            </div>
            {/* Power bar */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"2px" }}>
                <span>POWER</span><span style={{ color:catColor, fontWeight:700 }}>{power}</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"2px", height:"2px" }}>
                <div style={{ width:`${power}%`, height:"100%", background:`linear-gradient(90deg,${catColor}88,${catColor})`, borderRadius:"2px" }} />
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div style={{
          position:"absolute", inset:0, backfaceVisibility:"hidden",
          transform:"rotateY(180deg)", borderRadius:"14px", overflow:"hidden",
          background:`linear-gradient(135deg,${catColor}18,rgba(6,8,16,0.99))`,
          border:`1px solid ${catColor}44`,
          display:"flex", flexDirection:"column", padding:"0.875rem",
        }}>
          <div style={{ fontWeight:900, fontSize:"0.72rem", color:catColor, letterSpacing:"-0.01em", marginBottom:"0.5rem" }}>{asset.name}</div>
          {/* Combat stats */}
          {(["atk","def","speed"] as const).map(stat => {
            const v = asset[stat]; const c = stat==="atk"?"#FF6B35":stat==="def"?"#14F195":"#6b8cff";
            return (
              <div key={stat} style={{ marginBottom:"0.2rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.46rem", color:"rgba(255,255,255,0.35)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"1px" }}>
                  <span>{stat.toUpperCase()}</span><span style={{ color:c, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{v}</span>
                </div>
                <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"2px", height:"3px" }}>
                  <div style={{ width:`${v}%`, height:"100%", background:c, borderRadius:"2px" }} />
                </div>
              </div>
            );
          })}
          <div style={{ flex:1 }} />
          {/* Last sold */}
          <div style={{ padding:"0.35rem 0.4rem", background:"rgba(212,175,55,0.08)", borderRadius:"5px", marginTop:"0.5rem" }}>
            <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"1px" }}>LAST SOLD</div>
            <div style={{ fontWeight:800, fontSize:"0.82rem", color:"#D4AF37", fontVariantNumeric:"tabular-nums", fontFamily:"'JetBrains Mono',monospace" }}>{fmtUsd(asset.last_sold_price)}</div>
          </div>
          {/* CTA */}
          <button onClick={e => e.stopPropagation()} style={{
            marginTop:"0.5rem", padding:"0.45rem", borderRadius:"8px", border:"none",
            background:selected?catColor:"rgba(255,255,255,0.08)",
            color:selected?"#000":"rgba(255,255,255,0.7)",
            fontSize:"0.6rem", fontWeight:800, fontFamily:"'JetBrains Mono',monospace",
            letterSpacing:"0.04em", cursor:"pointer",
          }}>
            {selected?"✓ Selected for Arena":"Enter Arena →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Battle simulation ────────────────────────────────────────────────────────
function simulateBattle(card: ArenaAsset, agent: typeof SOPHIA_AGENTS[0]): {
  log: string[]; winner: "player"|"agent"; abraEarned: number;
} {
  const winProb = calcWinProb(card, agent);
  const seed    = Date.now();
  const roll    = Math.floor(Math.abs(Math.sin(seed) * 100));
  const win     = roll < winProb;
  const rounds  = [
    `[R1] ${card.name} ATK: ${card.atk} vs Agent DEF: ${Math.floor(60 + Math.sin(seed)*20)} — ${card.atk > 60?"HIT":"MISS"}`,
    `[R2] ${agent.name} deploys ${agent.buff}`,
    `[R3] ${win ? card.name+" seizes victory" : "Agent holds the line — defense prevailed"}`,
  ];
  return {
    log:        rounds,
    winner:     win ? "player" : "agent",
    abraEarned: win ? Math.round(card.attributes?.power_level ?? 50) * 2 : 0,
  };
}

// ─── Active Arena ─────────────────────────────────────────────────────────────
function ActiveArena({ assets }: { assets: ArenaAsset[] }) {
  const [selectedCard, setSelectedCard]   = useState<ArenaAsset | null>(null);
  const [selectedAgent, setSelectedAgent] = useState(SOPHIA_AGENTS[0]);
  const [battle,  setBattle]              = useState<BattleState>({ phase:"idle", playerCard:null, agentCard:null, round:0, playerHp:100, agentHp:100, log:[], winner:null, abraEarned:0 });
  const [filter, setFilter]               = useState<string>("all");
  const logRef = useRef<HTMLDivElement>(null);

  const cats = ["all", ...Array.from(new Set(assets.map(a => a.category)))];
  const shown = assets.filter(a => filter === "all" || a.category === filter);
  const winProb = selectedCard ? calcWinProb(selectedCard, selectedAgent) : 0;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle.log]);

  async function launchBattle() {
    if (!selectedCard) return;
    const agentCard = assets.find(a => a.id !== selectedCard.id) ?? assets[1];
    setBattle(b => ({ ...b, phase:"fighting", playerCard:selectedCard, agentCard, log:["[SYS] Deploying agent...", `[SYS] ${selectedAgent.name} entering arena...`], playerHp:100, agentHp:100 }));
    await new Promise(r => setTimeout(r, 600));
    const result = simulateBattle(selectedCard, selectedAgent);
    for (let i = 0; i < result.log.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setBattle(b => ({ ...b, log:[...b.log, result.log[i]], playerHp:result.winner==="player"?100:100-(i+1)*15, agentHp:result.winner==="agent"?100:100-(i+1)*20 }));
    }
    await new Promise(r => setTimeout(r, 400));
    setBattle(b => ({ ...b, phase:"resolved", winner:result.winner, abraEarned:result.abraEarned }));
  }

  return (
    <div style={{ padding:"1.25rem 0 0" }}>
      {/* Section header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.875rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", letterSpacing:"-0.02em", margin:0 }}>Active Arena</h2>
          <p style={{ fontSize:"0.58rem", color:"rgba(255,255,255,0.35)", margin:"2px 0 0", fontFamily:"'JetBrains Mono',monospace" }}>
            {assets.length} assets · Click card to flip · Select → Deploy
          </p>
        </div>
        {/* Category filter */}
        <div style={{ display:"flex", gap:"0.25rem", flexWrap:"wrap" }}>
          {cats.slice(0, 6).map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding:"0.25rem 0.5rem", borderRadius:"5px", fontSize:"0.58rem", fontWeight:filter===cat?700:400,
              border:`1px solid ${filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.08)"}`,
              background:filter===cat?`${CAT_COLOR[cat]??"#6b8cff"}18`:"transparent",
              color:filter===cat?(CAT_COLOR[cat]??"#6b8cff"):"rgba(255,255,255,0.4)",
              cursor:"pointer", textTransform:"capitalize",
            }}>{cat==="all"?"All":cat}</button>
          ))}
        </div>
      </div>

      {/* Battle panel — shown when a card is selected */}
      {selectedCard && (
        <div style={{ padding:"0.875rem", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:"14px", marginBottom:"1rem" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:"1rem", alignItems:"center" }}>
            {/* Player card */}
            <div style={{ textAlign:"left" }}>
              <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.25rem" }}>YOUR FIGHTER</div>
              <div style={{ fontWeight:800, fontSize:"0.85rem", color:"#f0f0f0" }}>{selectedCard.name}</div>
              <div style={{ fontSize:"0.56rem", color:CAT_COLOR[selectedCard.category]??"#fff", fontFamily:"'JetBrains Mono',monospace" }}>{selectedCard.grade}</div>
              {battle.phase !== "idle" && (
                <div style={{ marginTop:"0.375rem" }}>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"2px", height:"5px" }}>
                    <div style={{ width:`${battle.playerHp}%`, height:"100%", background:battle.playerHp>50?"#14F195":"#FBBF24", borderRadius:"2px", transition:"width 0.4s" }} />
                  </div>
                  <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:"1px" }}>{battle.playerHp}/100 HP</div>
                </div>
              )}
            </div>

            {/* Center controls */}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"1.2rem", marginBottom:"0.5rem" }}>⚔</div>
              {battle.phase === "idle" && (
                <>
                  {/* Agent selector */}
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.25rem", marginBottom:"0.5rem" }}>
                    {SOPHIA_AGENTS.map(a => (
                      <button key={a.id} onClick={() => setSelectedAgent(a)} style={{
                        padding:"0.25rem 0.5rem", borderRadius:"5px", fontSize:"0.5rem", fontWeight:selectedAgent.id===a.id?700:400,
                        border:`1px solid ${selectedAgent.id===a.id?a.color+"55":"rgba(255,255,255,0.08)"}`,
                        background:selectedAgent.id===a.id?`${a.color}18`:"transparent",
                        color:selectedAgent.id===a.id?a.color:"rgba(255,255,255,0.4)",
                        cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap",
                      }}>
                        {a.name} {selectedAgent.id===a.id?"✓":""}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.35rem" }}>
                    Win prob: {winProb}%
                  </div>
                  <button onClick={launchBattle} style={{
                    padding:"0.5rem 0.875rem", borderRadius:"8px", border:"none",
                    background:"linear-gradient(135deg,#D4AF37,#FF6B35)",
                    color:"#000", fontWeight:900, fontSize:"0.7rem",
                    fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
                    cursor:"pointer", boxShadow:"0 0 20px rgba(212,175,55,0.35)",
                  }}>
                    Deploy + Fight
                  </button>
                </>
              )}
              {battle.phase === "fighting" && (
                <div style={{ fontSize:"0.62rem", color:"#FBBF24", fontFamily:"'JetBrains Mono',monospace", animation:"pulse 0.5s ease-in-out infinite" }}>Simulating…</div>
              )}
              {battle.phase === "resolved" && (
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontWeight:900, fontSize:"0.95rem", color:battle.winner==="player"?"#14F195":"#f26b6b", marginBottom:"0.25rem" }}>
                    {battle.winner==="player"?"VICTORY":"DEFEAT"}
                  </div>
                  {battle.abraEarned > 0 && (
                    <div style={{ fontSize:"0.6rem", color:"#D4AF37", fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
                      +{battle.abraEarned} $ABRA
                    </div>
                  )}
                  <button onClick={() => { setBattle({phase:"idle",playerCard:null,agentCard:null,round:0,playerHp:100,agentHp:100,log:[],winner:null,abraEarned:0}); setSelectedCard(null); }} style={{ marginTop:"0.5rem", padding:"0.3rem 0.625rem", borderRadius:"6px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.5)", fontSize:"0.58rem", fontFamily:"'JetBrains Mono',monospace", cursor:"pointer" }}>
                    New Duel
                  </button>
                </div>
              )}
            </div>

            {/* Agent */}
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginBottom:"0.25rem" }}>SOPHIA AGENT</div>
              <div style={{ fontWeight:800, fontSize:"0.85rem", color:selectedAgent.color }}>{selectedAgent.name}</div>
              <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace" }}>{selectedAgent.buff}</div>
              {battle.phase !== "idle" && (
                <div style={{ marginTop:"0.375rem" }}>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"2px", height:"5px" }}>
                    <div style={{ width:`${battle.agentHp}%`, height:"100%", background:battle.agentHp>50?"#f26b6b":"#FBBF24", borderRadius:"2px", transition:"width 0.4s" }} />
                  </div>
                  <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.3)", fontFamily:"'JetBrains Mono',monospace", marginTop:"1px" }}>{battle.agentHp}/100 HP</div>
                </div>
              )}
            </div>
          </div>

          {/* Battle log */}
          {battle.log.length > 0 && (
            <div ref={logRef} style={{ marginTop:"0.75rem", background:"rgba(2,3,10,0.97)", border:"1px solid rgba(107,140,255,0.1)", borderRadius:"8px", padding:"0.5rem 0.75rem", maxHeight:"100px", overflowY:"auto", fontFamily:"'JetBrains Mono',monospace" }}>
              {battle.log.map((l, i) => (
                <p key={i} style={{ margin:"0 0 0.18rem", fontSize:"0.56rem", color:i===battle.log.length-1?"#60A5FA":`rgba(96,165,250,${Math.max(0.2,0.85-i*0.07)})`, lineHeight:1.4 }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,175px),1fr))", gap:"0.75rem" }}>
        {shown.map(asset => (
          <FlipCard key={asset.id} asset={asset}
            selected={selectedCard?.id===asset.id}
            onSelect={a => setSelectedCard(prev => prev?.id===a.id?null:a)}
          />
        ))}
        {shown.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"3rem", color:"rgba(255,255,255,0.2)", fontSize:"0.7rem", fontFamily:"'JetBrains Mono',monospace" }}>
            [NO ASSETS IN THIS CATEGORY]
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
export function TerminalArenaSkeleton() {
  return (
    <div>
      <div style={{ height:"36px", background:"rgba(2,3,10,0.95)", borderBottom:"1px solid rgba(255,255,255,0.06)", animation:"pulse 1.5s ease-in-out infinite" }} />
      <div style={{ padding:"1.25rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:"0.75rem" }}>
          {Array.from({length:8}).map((_,i) => (
            <div key={i} style={{ height:320, borderRadius:"14px", background:"rgba(6,8,16,0.97)", border:"1px solid rgba(255,255,255,0.05)", animation:"pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function TerminalArena() {
  const [assets, setAssets]   = useState<ArenaAsset[]>([]);
  const [ticks,  setTicks]    = useState<SoldTick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (!cancelled && data.ok) {
          setAssets(data.assets);
          setTicks(buildSoldTape(data.assets));
        }
      } catch (e) { if (!cancelled) setError("Oracle unavailable"); }
      finally      { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <TerminalArenaSkeleton />;

  return (
    <div>
      <style>{`
        @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
      {error && (
        <div style={{ padding:"0.5rem 1rem", background:"rgba(242,107,107,0.08)", border:"1px solid rgba(242,107,107,0.15)", fontSize:"0.6rem", color:"#f26b6b", fontFamily:"'JetBrains Mono',monospace" }}>
          [ORACLE] {error}
        </div>
      )}
      <SoldTape ticks={ticks} />
      <div style={{ padding:"0 1.25rem 1.25rem" }}>
        <ActiveArena assets={assets} />
      </div>
    </div>
  );
}
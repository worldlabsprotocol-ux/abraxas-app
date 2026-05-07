// FILE: app/arena/page.tsx
// Sovereign Arena — data-driven from /api/cards (inventory.json).
// Filters: only assets with imagePath AND last_sold_price rendered.
// Images: object-contain, no cropping — full slab/plate/comic visible.
// $5k sports ceiling enforced in team selection.
// 3v3 Axie-Classic battle loop with turn-order by speed stat.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { resolveDuelSimulated, resolveImage } from "@/lib/arena/duelEngine";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CardAsset {
  id: string; name: string; ticker: string; grade: string; gradingCo: string;
  vaultId: string; vaultLocation: string; insuranceUsd: number; priceUsd: number;
  last_sold_price?: number; last_sold_source?: string; last_sold_date?: string;
  change24h: number; category: string; rarity: string; imagePath: string;
  tokenId: string; atk: number; def: number; speed: number;
  circuitScore: number; defenseLevel: "armed"|"alert"|"breached"|"inactive";
  apy: number; staked: boolean; protected: boolean;
  history: Array<{ t: number; v: number }>;
}

interface Combatant {
  card: CardAsset; hp: number; maxHp: number; shield: boolean;
}

interface BattleState {
  phase: "select"|"battle"|"done";
  playerTeam: Combatant[]; agentTeam: Combatant[];
  turn: "player"|"agent"; turnNumber: number; energy: number;
  activeIdx: number; log: string[]; winner: "player"|"agent"|null;
}

// ─── $5k sports ceiling ───────────────────────────────────────────────────────
const SPORTS_CEILING = 5000;

function isEligible(card: CardAsset): boolean {
  if (!card.imagePath) return false;
  if (!card.last_sold_price) return false;
  if (card.category === "Sports" && card.insuranceUsd > SPORTS_CEILING) return false;
  return true;
}

// ─── Battle engine ────────────────────────────────────────────────────────────
function makeHp(card: CardAsset) { return Math.round(100 + card.def * 0.5); }
function makeCombatant(card: CardAsset): Combatant {
  const maxHp = makeHp(card);
  return { card, hp: maxHp, maxHp, shield: card.protected };
}

function calcDamage(atk: Combatant, def: Combatant, special = false): number {
  const mult    = special ? 1.5 : 1.0;
  const shield  = def.shield ? 0.6 : 1.0;
  const raw     = Math.round(atk.card.atk * mult * shield * (1 - def.card.def / 300));
  return Math.max(5, raw);
}

function buildAgentTeam(cards: CardAsset[]): CardAsset[] {
  return [...cards]
    .sort((a, b) => (b.atk + b.def + b.speed) - (a.atk + a.def + a.speed))
    .slice(0, 3);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
type IProps = { size?: number; color?: string };
function SwordsIcon({ size = 16, color = "#FF6B35" }: IProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
      <line x1="13" y1="19" x2="19" y2="13"/>
      <line x1="16" y1="16" x2="20" y2="20"/>
      <line x1="19" y1="21" x2="21" y2="19"/>
      <path d="M14.5 6.5L18 3l3 0v3L9.5 17.5"/>
    </svg>
  );
}
function ZapIcon({ size = 12, color = "#FBBF24" }: IProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z"/></svg>;
}
function ShieldCheck({ size = 12, color = "#14F195" }: IProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}

// ─── HP bar ───────────────────────────────────────────────────────────────────
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct   = Math.max(0, (hp / maxHp) * 100);
  const color = pct > 50 ? "#14F195" : pct > 25 ? "#FBBF24" : "#f26b6b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "4px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: "0.48rem", color, fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono',monospace", minWidth: "42px", textAlign: "right" }}>
        {hp}/{maxHp}
      </span>
    </div>
  );
}

// ─── Arena card — object-contain, no cropping ─────────────────────────────────
function ArenaCard({ combatant, isActive, isDefeated, isFlipping, side, selectable, selected, onClick }: {
  combatant: Combatant; isActive?: boolean; isDefeated?: boolean;
  isFlipping?: boolean; side: "player"|"agent";
  selectable?: boolean; selected?: boolean; onClick?: () => void;
}) {
  const { card } = combatant;
  const [imgErr, setImgErr] = useState(false);
  const src = resolveImage(card.imagePath);
  const dc  = card.defenseLevel === "armed" ? "#14F195"
            : card.defenseLevel === "alert" ? "#FBBF24"
            : "#f26b6b";

  return (
    <div onClick={selectable ? onClick : undefined} style={{
      position: "relative", borderRadius: "12px", overflow: "hidden",
      border: `1px solid ${selected ? "#D4AF37" : isActive ? "#6b8cff55" : "rgba(255,255,255,0.07)"}`,
      background: "rgba(6,8,16,0.97)",
      cursor: selectable ? "pointer" : "default",
      opacity: isDefeated ? 0.3 : 1,
      boxShadow: selected ? "0 0 20px rgba(212,175,55,0.25)" : isActive ? "0 0 16px rgba(107,140,255,0.15)" : "none",
      transform: isFlipping ? "rotateY(180deg)" : "rotateY(0deg)",
      transformStyle: "preserve-3d",
      transition: "all 0.25s ease",
    }}>
      {/* Auth badge */}
      {card.protected && (
        <div style={{
          position: "absolute", top: "0.4rem", right: "0.4rem", zIndex: 5,
          display: "flex", alignItems: "center", gap: "0.2rem",
          padding: "0.1rem 0.35rem", borderRadius: "3px",
          background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
        }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#D4AF37", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.42rem", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>AUTH</span>
        </div>
      )}

      {/* Card image — object-contain: FULL slab/comic/plate visible */}
      <div
        className="arena-card-img"
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "auto",
          background: "rgba(10,12,22,0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "140px",
          maxHeight: "220px",
          overflow: "hidden",
        }}>
        {!imgErr ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={card.name}
            onError={() => setImgErr(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",   // full slab visible — no cropping
              maxHeight: "220px",
              display: "block",
            }}
          />
        ) : (
          <div style={{ fontSize: "2.5rem", padding: "1.5rem", textAlign: "center", opacity: 0.5 }}>
            {card.category === "Comics" ? "📕" : card.category === "Metals" ? "🔶" : card.category === "Luxury" ? "✈️" : "◈"}
          </div>
        )}
        {/* Depth gradient */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(6,8,16,0.9), transparent)", pointerEvents: "none" }} />
        {/* Circuit shield glow */}
        {combatant.shield && <div style={{ position: "absolute", inset: 0, background: `${dc}08`, boxShadow: `inset 0 0 16px ${dc}18`, pointerEvents: "none" }} />}
      </div>

      {/* Card info */}
      <div style={{ padding: "0.5rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.7rem", color: "#f0f0f0", lineHeight: 1.2, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.name}
        </div>
        <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.35rem" }}>
          {card.grade} · {card.category}
        </div>

        <div style={{ marginBottom: "0.35rem" }}>
          <HpBar hp={combatant.hp} maxHp={combatant.maxHp} />
        </div>

        {/* Stat bars */}
        {(["atk","def","speed"] as const).map(stat => {
          const color = stat === "atk" ? "#FF6B35" : stat === "def" ? "#14F195" : "#6b8cff";
          return (
            <div key={stat} style={{ marginBottom: "0.18rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.44rem", color: "rgba(255,255,255,0.3)", marginBottom: "1px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <span>{stat}</span>
                <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{card[stat]}</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "1px", height: "2px" }}>
                <div style={{ width: `${card[stat]}%`, height: "100%", background: color, borderRadius: "1px" }} />
              </div>
            </div>
          );
        })}

        {/* Last sold */}
        {card.last_sold_price && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.375rem", padding: "0.25rem 0.35rem", background: "rgba(212,175,55,0.06)", borderRadius: "4px" }}>
            <span style={{ fontSize: "0.44rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Last Sold</span>
            <span style={{ fontSize: "0.52rem", fontWeight: 700, color: "#D4AF37", fontFamily: "'JetBrains Mono',monospace", fontVariantNumeric: "tabular-nums" }}>
              ${card.last_sold_price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        {/* Vault location */}
        <div style={{ fontSize: "0.44rem", color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono',monospace", marginTop: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.vaultLocation}
        </div>

        {/* Selection ring */}
        {selected && <div style={{ position: "absolute", inset: 0, border: "2px solid #D4AF37", borderRadius: "12px", pointerEvents: "none", boxShadow: "0 0 20px rgba(212,175,55,0.35)" }} />}
      </div>
    </div>
  );
}

// ─── Energy bar ───────────────────────────────────────────────────────────────
function EnergyBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ width: "8px", height: "12px", borderRadius: "2px", background: i < current ? "#FBBF24" : "rgba(255,255,255,0.07)", boxShadow: i < current ? "0 0 4px rgba(251,191,36,0.5)" : "none", transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: "0.5rem", color: "#FBBF24", fontFamily: "'JetBrains Mono',monospace", marginLeft: "0.3rem", fontVariantNumeric: "tabular-nums" }}>
        {current}/10
      </span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ArenaPage() {
  const [allCards, setAllCards]     = useState<CardAsset[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [battle, setBattle]         = useState<BattleState | null>(null);
  const [flipping, setFlipping]     = useState<Record<string, boolean>>({});
  const [filter, setFilter]         = useState<string>("all");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (!cancelled && data.ok) {
          // Filter: only assets with imagePath + last_sold_price
          setAllCards(data.assets.filter(isEligible));
        }
      } catch (e) {
        if (!cancelled) setError("Oracle unavailable — /api/cards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle?.log]);

  const categories = ["all", ...Array.from(new Set(allCards.map(c => c.category)))].filter(Boolean);
  const filtered   = allCards.filter(c => filter === "all" || c.category === filter);

  const toggleSelect = useCallback((id: string) => {
    if (battle) return;
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      // $5k ceiling for sports in battle selection
      const card = allCards.find(c => c.id === id);
      if (card?.category === "Sports" && card.insuranceUsd > SPORTS_CEILING) return prev;
      return [...prev, id];
    });
  }, [battle, allCards]);

  const startBattle = useCallback(() => {
    if (selectedIds.length !== 3 || allCards.length < 3) return;
    const playerCards = selectedIds.map(id => allCards.find(c => c.id === id)!);
    const remaining   = allCards.filter(c => !selectedIds.includes(c.id));
    const agentCards  = buildAgentTeam(remaining);
    const playerTeam  = playerCards.map(makeCombatant);
    const agentTeam   = agentCards.map(makeCombatant);
    const pFirst      = Math.max(...playerCards.map(c => c.speed)) >= Math.max(...agentCards.map(c => c.speed));
    setBattle({
      phase: "battle", playerTeam, agentTeam,
      turn: pFirst ? "player" : "agent",
      turnNumber: 1, energy: 3, activeIdx: 0,
      log: [
        `[ARENA] Sovereign Duel initiated. ${pFirst ? "Your squad" : "Sophia Agent"} moves first.`,
        `[SOPHIA] ${agentCards.map(c => c.name).join(" · ")} — defending the vault.`,
      ],
      winner: null,
    });
  }, [selectedIds, allCards]);

  const playerAttack = useCallback(async (special = false) => {
    if (!battle || battle.turn !== "player" || battle.winner) return;
    if (special && battle.energy < 3) return;
    const attacker = battle.playerTeam[battle.activeIdx];
    const defender = battle.agentTeam.find(c => c.hp > 0);
    if (!attacker || !defender) return;
    const dmg = calcDamage(attacker, defender, special);

    setFlipping(f => ({ ...f, [attacker.card.id]: true }));
    await new Promise(r => setTimeout(r, 600));
    setFlipping(f => ({ ...f, [attacker.card.id]: false }));

    setBattle(prev => {
      if (!prev) return prev;
      const newAgent    = prev.agentTeam.map(c => c !== defender ? c : { ...c, hp: Math.max(0, c.hp - dmg), shield: (c.hp - dmg) > 0 ? c.shield : false });
      const allDefeated = newAgent.every(c => c.hp <= 0);
      const ts          = new Date().toISOString().slice(11, 19);
      return {
        ...prev,
        agentTeam: newAgent,
        energy: Math.max(0, prev.energy - (special ? 3 : 1)),
        turn: "agent",
        log: [...prev.log, `[${ts}] ${attacker.card.name} → ${defender.card.name}: ${dmg} dmg${defender.shield ? " (shield -40%)" : ""}${special ? " ⚡ SPECIAL" : ""}`, ...(allDefeated ? ["[VICTORY] All agent cards eliminated"] : [])],
        winner: allDefeated ? "player" : null,
        phase: allDefeated ? "done" : "battle",
      };
    });

    setTimeout(() => {
      setBattle(prev => {
        if (!prev || prev.winner) return prev;
        const a  = prev.agentTeam.find(c => c.hp > 0);
        const d2 = prev.playerTeam.find(c => c.hp > 0);
        if (!a || !d2) return prev;
        const dmg2 = calcDamage(a, d2);
        const newPl = prev.playerTeam.map(c => c !== d2 ? c : { ...c, hp: Math.max(0, c.hp - dmg2) });
        const pDead = newPl.every(c => c.hp <= 0);
        const ts    = new Date().toISOString().slice(11, 19);
        return {
          ...prev,
          playerTeam: newPl,
          energy: Math.min(10, prev.energy + 2),
          turn: "player",
          turnNumber: prev.turnNumber + 1,
          log: [...prev.log, `[${ts}] [SOPHIA] ${a.card.name} → ${d2.card.name}: ${dmg2} dmg`, ...(pDead ? ["[DEFEAT] Your squad was eliminated"] : [])],
          winner: pDead ? "agent" : null,
          phase: pDead ? "done" : "battle",
        };
      });
    }, 1200);
  }, [battle]);

  const resetArena = useCallback(() => { setBattle(null); setSelectedIds([]); setFlipping({}); }, []);

  if (loading) return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "0.75rem" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ height: 340, background: "rgba(6,8,16,0.97)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );

  const inBattle = !!battle && battle.phase !== "select";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.25rem 5rem" }}>

      <style>{`
        .arena-card-img img { filter: grayscale(1); transition: filter 0.4s ease; }
        .arena-card-img:hover img { filter: grayscale(0); }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
      `}</style>

      {error && (
        <div style={{ padding: "0.625rem 1rem", background: "rgba(242,107,107,0.08)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.65rem", color: "#f26b6b", fontFamily: "'JetBrains Mono',monospace" }}>
          [ORACLE ERROR] {error}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ fontSize: "0.52rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.2rem" }}>
            Collector Crypt · $CARDS Program · Verified Inventory
          </p>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.4rem,3.5vw,2rem)", letterSpacing: "-0.03em", margin: 0, background: "linear-gradient(135deg,#D4AF37,#a855f7,#6b8cff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Sovereign Arena
          </h1>
        </div>
        {battle && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <EnergyBar current={battle.energy} />
            <span style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace" }}>Turn {battle.turnNumber}</span>
          </div>
        )}
      </div>

      {/* Category filter */}
      {!inBattle && (
        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: "0.3rem 0.625rem", borderRadius: "5px", fontSize: "0.6rem", fontWeight: filter === cat ? 700 : 400,
              border: `1px solid ${filter === cat ? "#D4AF37" : "rgba(255,255,255,0.08)"}`,
              background: filter === cat ? "rgba(212,175,55,0.1)" : "transparent",
              color: filter === cat ? "#D4AF37" : "rgba(255,255,255,0.4)",
              cursor: "pointer", textTransform: "capitalize",
            }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Selection bar */}
      {!inBattle && (
        <div style={{ padding: "0.625rem 1rem", background: "rgba(107,140,255,0.06)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "8px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono',monospace" }}>
            {selectedIds.length === 0 && "[SELECT] Choose 3 cards — sports assets capped at $5,000"}
            {selectedIds.length > 0 && selectedIds.length < 3 && `[SELECT] ${selectedIds.length}/3 — pick ${3 - selectedIds.length} more`}
            {selectedIds.length === 3 && "[READY] Squad assembled — initiate duel"}
          </span>
          <button onClick={startBattle} disabled={selectedIds.length !== 3} style={{
            padding: "0.4rem 1.25rem", borderRadius: "7px", fontWeight: 700, fontSize: "0.7rem",
            fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em",
            background: selectedIds.length === 3 ? "linear-gradient(135deg,#D4AF37,#FF6B35)" : "rgba(255,255,255,0.05)",
            border: "none", color: selectedIds.length === 3 ? "#000" : "rgba(255,255,255,0.2)",
            cursor: selectedIds.length === 3 ? "pointer" : "not-allowed",
          }}>
            ⚔ Initiate Duel
          </button>
        </div>
      )}

      {/* Battle layout */}
      {inBattle && battle && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "start" }}>
            {/* Player team */}
            <div>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#6b8cff", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.5rem" }}>Your Squad</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {battle.playerTeam.map((c, i) => (
                  <ArenaCard key={c.card.id} combatant={c}
                    isActive={i === battle.activeIdx && battle.turn === "player"}
                    isDefeated={c.hp <= 0} isFlipping={!!flipping[c.card.id]}
                    side="player"
                    selectable={!battle.winner && battle.turn === "player" && c.hp > 0}
                    selected={i === battle.activeIdx}
                    onClick={() => setBattle(p => p ? { ...p, activeIdx: i } : p)}
                  />
                ))}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", paddingTop: "2rem" }}>
              <SwordsIcon size={28} />
              {!battle.winner && (
                <>
                  <button onClick={() => playerAttack(false)} disabled={battle.turn !== "player"}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.6rem", fontFamily: "'JetBrains Mono',monospace", cursor: "pointer",
                      background: battle.turn === "player" ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${battle.turn === "player" ? "rgba(255,107,53,0.35)" : "rgba(255,255,255,0.07)"}`,
                      color: battle.turn === "player" ? "#FF6B35" : "rgba(255,255,255,0.2)" }}>
                    Attack
                  </button>
                  <button onClick={() => playerAttack(true)} disabled={battle.turn !== "player" || battle.energy < 3}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.6rem", fontFamily: "'JetBrains Mono',monospace", cursor: "pointer",
                      background: battle.turn === "player" && battle.energy >= 3 ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${battle.turn === "player" && battle.energy >= 3 ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.07)"}`,
                      color: battle.turn === "player" && battle.energy >= 3 ? "#a855f7" : "rgba(255,255,255,0.2)" }}>
                    Special (3⚡)
                  </button>
                  <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.25)", textAlign: "center", fontFamily: "'JetBrains Mono',monospace" }}>
                    {battle.turn === "player" ? "YOUR TURN" : "SOPHIA…"}
                  </div>
                </>
              )}
              {battle.winner && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: battle.winner === "player" ? "#14F195" : "#f26b6b", marginBottom: "0.5rem" }}>
                    {battle.winner === "player" ? "VICTORY" : "DEFEATED"}
                  </div>
                  <button onClick={resetArena} style={{ padding: "0.4rem 0.75rem", borderRadius: "7px", fontWeight: 700, fontSize: "0.6rem", fontFamily: "'JetBrains Mono',monospace", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                    New Duel
                  </button>
                </div>
              )}
            </div>

            {/* Agent team */}
            <div>
              <div style={{ fontSize: "0.5rem", fontWeight: 700, color: "#f26b6b", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.5rem", textAlign: "right" }}>
                Sophia Agent
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {battle.agentTeam.map(c => (
                  <ArenaCard key={c.card.id} combatant={c} isDefeated={c.hp <= 0} side="agent" />
                ))}
              </div>
            </div>
          </div>

          {/* Battle log */}
          {battle.log.length > 0 && (
            <div ref={logRef} style={{ marginTop: "1.25rem", background: "rgba(2,3,10,0.97)", border: "1px solid rgba(107,140,255,0.1)", borderRadius: "10px", padding: "0.625rem 1rem", maxHeight: "150px", overflowY: "auto", fontFamily: "'JetBrains Mono',monospace" }}>
              {battle.log.slice(-10).map((line, i, arr) => (
                <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.56rem", lineHeight: 1.5, color: i === arr.length - 1 ? "#60A5FA" : `rgba(96,165,250,${Math.max(0.2, 0.8 - (arr.length - 1 - i) * 0.08)})` }}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {/* Card grid (selection mode) */}
      {!inBattle && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,180px),1fr))", gap: "0.75rem" }}>
          {filtered.map(card => (
            <ArenaCard key={card.id}
              combatant={makeCombatant(card)}
              selected={selectedIds.includes(card.id)}
              selectable
              side="player"
              onClick={() => toggleSelect(card.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono',monospace" }}>
              [NO ASSETS WITH VERIFIED SOLD DATA IN THIS CATEGORY]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
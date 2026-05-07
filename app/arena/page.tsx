// FILE: app/arena/page.tsx
// Sovereign Duel Arena — 3v3 Axie Classic mechanics driven by data/cards.json.
// Turn order: speed stat. Animations: CSS transforms (no framer-motion installed).
// Grayscale reveal on hover: CSS filter transition.
// No hardcoded asset data — all from /api/cards.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { resolveImage, resolveDuelSimulated } from "@/lib/arena/duelEngine";

// ─── Types (derived from cards.json schema) ────────────────────────────────────
interface CardAsset {
  id:             string;
  name:           string;
  ticker:         string;
  grade:          string;
  gradingCo:      string;
  vaultId:        string;
  vaultLocation:  string;
  insuranceUsd:   number;
  priceUsd:       number;
  change24h:      number;
  category:       string;
  rarity:         string;
  imagePath:      string;
  tokenId:        string;
  atk:            number;
  def:            number;
  speed:          number;
  circuitScore:   number;
  defenseLevel:   "armed" | "alert" | "breached" | "inactive";
  apy:            number;
  staked:         boolean;
  protected:      boolean;
  history:        Array<{ t: number; v: number }>;
}

// ─── Game state ────────────────────────────────────────────────────────────────
interface Combatant {
  card:   CardAsset;
  hp:     number;
  maxHp:  number;
  energy: number;
  shield: boolean;  // Circuit Defense shield active
}

interface BattleState {
  phase:        "select" | "battle" | "done";
  playerTeam:   Combatant[];
  agentTeam:    Combatant[];
  turn:         "player" | "agent";
  turnNumber:   number;
  energy:       number;  // player energy pool
  activeIdx:    number;  // which player card is active
  log:          string[];
  winner:       "player" | "agent" | null;
}

// ─── Sophia agent team (seeded from full card list) ───────────────────────────
function buildAgentTeam(cards: CardAsset[]): CardAsset[] {
  const sorted = [...cards].sort((a, b) => (b.atk + b.def + b.speed) - (a.atk + a.def + a.speed));
  return sorted.slice(0, 3);
}

function makeHp(card: CardAsset) {
  // HP = 100 + def bonus — mirrors circuit defense weighting
  return Math.round(100 + card.def * 0.5);
}

function makeCombatant(card: CardAsset): Combatant {
  const maxHp = makeHp(card);
  return { card, hp: maxHp, maxHp, energy: 0, shield: card.protected };
}

// ─── Turn order — sorted by speed stat (Axie Classic mechanic) ────────────────
function sortBySpeed(a: Combatant, b: Combatant): number {
  return b.card.speed - a.card.speed;
}

// ─── Damage formula — atk vs opponent def + circuit bonus ────────────────────
function calcDamage(attacker: Combatant, defender: Combatant, isSpecial = false): number {
  const atkMult  = isSpecial ? 1.5 : 1.0;
  const shieldMod = defender.shield ? 0.6 : 1.0;  // Circuit shield absorbs 40%
  const raw = Math.round(attacker.card.atk * atkMult * shieldMod * (1 - defender.card.def / 300));
  return Math.max(5, raw);
}

// ─── Battle log generator ─────────────────────────────────────────────────────
function battleLine(attacker: string, defender: string, dmg: number, shielded: boolean): string {
  const ts = new Date().toISOString().slice(11, 19);
  if (shielded) return `[${ts}] [CIRCUIT] ${attacker} attacks ${defender} — Shield absorbs 40% → ${dmg} dmg`;
  return `[${ts}] [BATTLE]  ${attacker} strikes ${defender} for ${dmg} dmg`;
}

// ─── SVG icons ────────────────────────────────────────────────────────────────
function ShieldIcon({ size = 14, color = "#3dd68c" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 4v4c0 3.5 2.5 6.5 6 7.5C11.5 14.5 14 11.5 14 8V4L8 1Z"
        fill={`${color}22`} stroke={color} strokeWidth="1.2"/>
      <path d="M5.5 8l2 2 3-3" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function SwordsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round">
      <path d="M9.5 11.5L2 4V2H4l7.5 7.5"/><path d="M6.5 4.5L11 9"/><path d="M11 11l2 2"/><path d="M4 10l2 2"/><path d="M10 4l2-2"/>
    </svg>
  );
}
function ZapIcon({ size = 12, color = "#FBBF24" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M9 1L3 9h5l-1 6 7-9h-5l1-5Z" fill={color} stroke={color} strokeWidth="0.5"/>
    </svg>
  );
}
function SpecialIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="#a855f7" strokeWidth="1.2"/>
      <path d="M8 3v5l3 2" stroke="#a855f7" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, max = 100, color }: { label: string; value: number; max?: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.46rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
        <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: "2px" }} />
      </div>
    </div>
  );
}

// ─── HP bar ───────────────────────────────────────────────────────────────────
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct   = (hp / maxHp) * 100;
  const color = pct > 50 ? "#3dd68c" : pct > 25 ? "#FBBF24" : "#f26b6b";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "4px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: "0.5rem", color, fontVariantNumeric: "tabular-nums", fontFamily: "'JetBrains Mono',monospace", minWidth: "40px", textAlign: "right" }}>
        {hp}/{maxHp}
      </span>
    </div>
  );
}

// ─── Card component — grayscale reveal + CSS card flip ─────────────────────────
interface ArenaCardProps {
  combatant:    Combatant;
  isActive?:    boolean;
  isDefeated?:  boolean;
  isFlipping?:  boolean;
  onClick?:     () => void;
  side:         "player" | "agent";
  selectable?:  boolean;
  selected?:    boolean;
}

function ArenaCard({ combatant, isActive, isDefeated, isFlipping, onClick, side, selectable, selected }: ArenaCardProps) {
  const { card } = combatant;
  const dc  = card.defenseLevel === "armed" ? "#3dd68c" : card.defenseLevel === "alert" ? "#FBBF24" : "#f26b6b";

  return (
    <div
      onClick={selectable ? onClick : undefined}
      style={{
        position:    "relative",
        borderRadius:"12px",
        overflow:    "hidden",
        border:      `1px solid ${selected ? "#D4AF37" : isActive ? "#6b8cff55" : "rgba(255,255,255,0.08)"}`,
        background:  "rgba(6,8,16,0.97)",
        cursor:      selectable ? "pointer" : "default",
        opacity:     isDefeated ? 0.35 : 1,
        boxShadow:   selected ? "0 0 20px rgba(212,175,55,0.3)" : isActive ? "0 0 16px rgba(107,140,255,0.2)" : "none",
        transition:  "all 0.25s ease",
        // CSS 3D card flip when attacking
        transform:   isFlipping ? "rotateY(180deg)" : "rotateY(0deg)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Authenticated badge — pulses in sovereign gold */}
      {card.protected && (
        <div style={{
          position: "absolute", top: "0.4rem", right: "0.4rem", zIndex: 5,
          display: "flex", alignItems: "center", gap: "0.2rem",
          padding: "0.1rem 0.35rem", borderRadius: "3px",
          background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)",
        }}>
          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#D4AF37", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "0.42rem", fontWeight: 700, color: "#D4AF37", letterSpacing: "0.08em", fontFamily: "'JetBrains Mono',monospace" }}>
            AUTH
          </span>
        </div>
      )}

      {/* Card image — grayscale reveal on hover */}
      <div style={{ position: "relative", height: 110 }} className="arena-card-img">
        <Image
          src={card.imagePath}
          alt={card.name}
          fill
          sizes="180px"
          style={{ objectFit: "cover" }}
          onError={() => {}}
          unoptimized
        />
        {/* Overlay for depth */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(6,8,16,0.85) 100%)" }} />
        {/* Circuit shield overlay */}
        {combatant.shield && (
          <div style={{ position: "absolute", inset: 0, background: `${dc}08`, boxShadow: `inset 0 0 12px ${dc}22` }} />
        )}
        {/* ATK reveal on flip back face */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(6,8,16,0.95)", backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          fontSize: "1.2rem", fontWeight: 900, color: "#FF6B35", fontFamily: "'JetBrains Mono',monospace",
        }}>
          ATK {card.atk}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "0.5rem 0.5rem 0.4rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.68rem", color: "#f0f0f0", lineHeight: 1.2, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.name}
        </div>
        <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.375rem", letterSpacing: "0.04em" }}>
          {card.grade} · {card.vaultLocation}
        </div>

        {/* HP */}
        <div style={{ marginBottom: "0.375rem" }}>
          <HpBar hp={combatant.hp} maxHp={combatant.maxHp} />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginBottom: "0.375rem" }}>
          <StatBar label="ATK"   value={card.atk}   color="#FF6B35" />
          <StatBar label="DEF"   value={card.def}   color="#3dd68c" />
          <StatBar label="SPD"   value={card.speed} color="#6b8cff" />
        </div>

        {/* Insurance value */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", fontFamily: "'JetBrains Mono',monospace" }}>
          <span style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Insured</span>
          <span style={{ color: "#D4AF37", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            ${card.insuranceUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Shield status */}
        {combatant.shield && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
            <ShieldIcon size={10} color={dc} />
            <span style={{ fontSize: "0.44rem", color: dc, fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
              CIRCUIT DEFENSE
            </span>
          </div>
        )}
      </div>

      {/* Selection ring */}
      {selected && (
        <div style={{ position: "absolute", inset: 0, border: "2px solid #D4AF37", borderRadius: "12px", pointerEvents: "none", boxShadow: "0 0 20px rgba(212,175,55,0.4)" }} />
      )}
    </div>
  );
}

// ─── Energy display ───────────────────────────────────────────────────────────
function EnergyBar({ current, max = 10 }: { current: number; max?: number }) {
  return (
    <div style={{ display: "flex", gap: "0.2rem", alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: "8px", height: "12px", borderRadius: "2px",
          background: i < current ? "#FBBF24" : "rgba(255,255,255,0.08)",
          boxShadow: i < current ? "0 0 4px rgba(251,191,36,0.5)" : "none",
          transition: "all 0.2s",
        }} />
      ))}
      <span style={{ fontSize: "0.52rem", color: "#FBBF24", fontFamily: "'JetBrains Mono',monospace", marginLeft: "0.3rem", fontVariantNumeric: "tabular-nums" }}>
        {current}/{max}
      </span>
    </div>
  );
}

// ─── Main Arena page ───────────────────────────────────────────────────────────
export default function ArenaPage() {
  const [allCards, setAllCards]   = useState<CardAsset[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Card selection (pre-battle)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Battle state
  const [battle, setBattle] = useState<BattleState | null>(null);

  // Animation state per card id
  const [flipping, setFlipping] = useState<Record<string, boolean>>({});

  const logRef = useRef<HTMLDivElement>(null);

  // Fetch from /api/cards — single source of truth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/cards");
        const data = await res.json();
        if (!cancelled && data.ok) setAllCards(data.assets);
      } catch (e) {
        if (!cancelled) setError("Oracle unavailable — check /api/cards");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Scroll log to bottom on update
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle?.log]);

  // ── Selection phase ────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    if (battle) return;
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3)  return prev;
      return [...prev, id];
    });
  }, [battle]);

  // ── Start battle ──────────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    if (selectedIds.length !== 3 || allCards.length < 3) return;
    const playerCards = selectedIds.map(id => allCards.find(c => c.id === id)!);
    const remaining   = allCards.filter(c => !selectedIds.includes(c.id));
    const agentCards  = buildAgentTeam(remaining);

    const playerTeam = playerCards.map(makeCombatant);
    const agentTeam  = agentCards.map(makeCombatant);

    // Turn order determined by speed (Axie Classic)
    const playerFirst = playerTeam.some(p =>
      agentTeam.every(a => p.card.speed >= a.card.speed)
    );

    setBattle({
      phase:      "battle",
      playerTeam, agentTeam,
      turn:       playerFirst ? "player" : "agent",
      turnNumber: 1,
      energy:     3, // start with 3
      activeIdx:  0,
      log:        [
        `[ARENA] Duel initiated. Turn order: speed-based.`,
        `[ARENA] ${playerFirst ? "Your squad" : "Sophia Agent"} moves first.`,
        `[SOPHIA] ${agentCards.map(c => c.name).join(" · ")} — defending sovereignty.`,
      ],
      winner: null,
    });
  }, [selectedIds, allCards]);

  // ── Player action ─────────────────────────────────────────────────────────
  const playerAttack = useCallback(async (isSpecial = false) => {
    if (!battle || battle.turn !== "player" || battle.winner) return;
    if (isSpecial && battle.energy < 3) return;

    const attacker = battle.playerTeam[battle.activeIdx];
    const defender = battle.agentTeam.find(c => c.hp > 0);
    if (!defender) return;

    const dmg = calcDamage(attacker, defender, isSpecial);
    const shielded = defender.shield;

    // Flip animation
    setFlipping(f => ({ ...f, [attacker.card.id]: true }));
    await new Promise(r => setTimeout(r, 600));
    setFlipping(f => ({ ...f, [attacker.card.id]: false }));

    setBattle(prev => {
      if (!prev) return prev;
      const newAgent = prev.agentTeam.map(c => {
        if (c !== defender) return c;
        const newHp    = Math.max(0, c.hp - dmg);
        const shield   = newHp > 0 ? c.shield : false;
        return { ...c, hp: newHp, shield };
      });

      const energyCost = isSpecial ? 3 : 1;
      const newLog = [
        ...prev.log,
        battleLine(attacker.card.name, defender.card.name, dmg, shielded),
        ...(isSpecial ? [`[SPECIAL] Circuit Sovereign move — ${attacker.card.name} expends ${energyCost} energy`] : []),
        ...(defender.hp - dmg <= 0 ? [`[DEFEATED] ${defender.card.name} eliminated`] : []),
      ];

      const allDefeated = newAgent.every(c => c.hp <= 0);
      return {
        ...prev,
        agentTeam:  newAgent,
        energy:     Math.max(0, prev.energy - energyCost),
        turn:       "agent",
        log:        newLog,
        winner:     allDefeated ? "player" : null,
        phase:      allDefeated ? "done" : "battle",
      };
    });

    // Agent counter-attack after delay
    if (!battle.agentTeam.every(c => c.hp <= 0)) {
      setTimeout(() => agentTurn(), 1200);
    }
  }, [battle]);

  // ── Agent turn (AI) ────────────────────────────────────────────────────────
  const agentTurn = useCallback(() => {
    setBattle(prev => {
      if (!prev || prev.winner) return prev;
      const attacker = prev.agentTeam.find(c => c.hp > 0);
      const defender = prev.playerTeam.find(c => c.hp > 0);
      if (!attacker || !defender) return prev;

      const dmg = calcDamage(attacker, defender);
      const shielded = defender.shield;
      const newPlayer = prev.playerTeam.map(c => {
        if (c !== defender) return c;
        const newHp = Math.max(0, c.hp - dmg);
        return { ...c, hp: newHp, shield: newHp > 0 ? c.shield : false };
      });

      const allDefeated = newPlayer.every(c => c.hp <= 0);
      const newEnergy = Math.min(10, prev.energy + 2); // +2 energy per turn
      const newLog = [
        ...prev.log,
        `[SOPHIA]  ${attacker.card.name} → ${defender.card.name}: ${dmg} dmg${shielded ? " (shielded -40%)" : ""}`,
        ...(defender.hp - dmg <= 0 ? [`[DEFEATED] ${defender.card.name} eliminated`] : []),
      ];

      return {
        ...prev,
        playerTeam: newPlayer,
        energy:     newEnergy,
        turn:       "player",
        turnNumber: prev.turnNumber + 1,
        log:        newLog,
        winner:     allDefeated ? "agent" : null,
        phase:      allDefeated ? "done" : "battle",
      };
    });
  }, []);

  const resetArena = useCallback(() => {
    setBattle(null);
    setSelectedIds([]);
    setFlipping({});
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "0.75rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 320, background: "rgba(6,8,16,0.97)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );

  const inBattle = !!battle && battle.phase !== "select";

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "0.625rem 1rem", background: "rgba(242,107,107,0.08)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.65rem", color: "#f26b6b", fontFamily: "'JetBrains Mono',monospace" }}>
          [ORACLE ERROR] {error}
        </div>
      )}

      {/* Grayscale reveal global style */}
      <style>{`
        .arena-card-img img { filter: grayscale(1); transition: filter 0.4s ease; }
        .arena-card-img:hover img { filter: grayscale(0); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{ fontSize: "0.54rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: "0.2rem", fontFamily: "'JetBrains Mono',monospace" }}>
          Collector Crypt · $CARDS Program · Verified Inventory
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(1.4rem,3.5vw,2rem)", letterSpacing: "-0.03em", margin: 0,
            background: "linear-gradient(135deg, #D4AF37, #a855f7, #6b8cff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Sovereign Duel Arena
          </h1>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem" }}>
            {battle && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <ZapIcon />
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Energy</span>
                  <EnergyBar current={battle.energy} />
                </div>
                <div style={{ color: "rgba(255,255,255,0.3)" }}>Turn {battle.turnNumber}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Pre-battle: card selection ── */}
      {!inBattle && (
        <>
          <div style={{ padding: "0.625rem 1rem", background: "rgba(107,140,255,0.06)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "8px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", fontFamily: "'JetBrains Mono',monospace" }}>
              {selectedIds.length === 0 && "[SELECT] Choose 3 cards for your squad"}
              {selectedIds.length > 0 && selectedIds.length < 3 && `[SELECT] ${selectedIds.length}/3 selected — pick ${3 - selectedIds.length} more`}
              {selectedIds.length === 3 && "[READY] Squad assembled — initiate duel"}
            </div>
            <button onClick={startBattle} disabled={selectedIds.length !== 3}
              style={{
                padding: "0.4rem 1.25rem", borderRadius: "7px", fontWeight: 700, fontSize: "0.72rem",
                fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em",
                background: selectedIds.length === 3 ? "linear-gradient(135deg, #D4AF37, #FF6B35)" : "rgba(255,255,255,0.06)",
                border: "none", color: selectedIds.length === 3 ? "#000" : "rgba(255,255,255,0.25)",
                cursor: selectedIds.length === 3 ? "pointer" : "not-allowed",
                boxShadow: selectedIds.length === 3 ? "0 0 20px rgba(212,175,55,0.3)" : "none",
              }}>
              ⚔ Initiate Duel
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,180px),1fr))", gap: "0.75rem" }}>
            {allCards.map(card => (
              <ArenaCard key={card.id}
                combatant={makeCombatant(card)}
                selected={selectedIds.includes(card.id)}
                selectable
                side="player"
                onClick={() => toggleSelect(card.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Battle phase ── */}
      {inBattle && battle && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "flex-start" }}>

          {/* Player team */}
          <div>
            <div style={{ fontSize: "0.54rem", fontWeight: 700, color: "#6b8cff", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.625rem", fontFamily: "'JetBrains Mono',monospace" }}>
              Your Squad
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {battle.playerTeam.map((c, i) => (
                <ArenaCard key={c.card.id}
                  combatant={c}
                  isActive={i === battle.activeIdx && battle.turn === "player" && !battle.winner}
                  isDefeated={c.hp <= 0}
                  isFlipping={!!flipping[c.card.id]}
                  side="player"
                  selectable={!battle.winner && battle.turn === "player" && c.hp > 0}
                  selected={i === battle.activeIdx}
                  onClick={() => setBattle(prev => prev ? { ...prev, activeIdx: i } : prev)}
                />
              ))}
            </div>
          </div>

          {/* Center controls */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", paddingTop: "2rem" }}>
            <div style={{ fontSize: "1.5rem", animation: battle.winner ? "none" : "pulse 2s ease-in-out infinite" }}>⚔</div>

            {!battle.winner && (
              <>
                <button onClick={() => playerAttack(false)} disabled={battle.turn !== "player"}
                  style={{
                    padding: "0.5rem 0.875rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.65rem",
                    fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em", cursor: "pointer",
                    background: battle.turn === "player" ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${battle.turn === "player" ? "rgba(255,107,53,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: battle.turn === "player" ? "#FF6B35" : "rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", gap: "0.3rem", width: "100%", justifyContent: "center",
                  }}>
                  <SwordsIcon size={12} /> Attack
                </button>
                <button onClick={() => playerAttack(true)} disabled={battle.turn !== "player" || battle.energy < 3}
                  style={{
                    padding: "0.5rem 0.875rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.65rem",
                    fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.04em", cursor: "pointer",
                    background: battle.turn === "player" && battle.energy >= 3 ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${battle.turn === "player" && battle.energy >= 3 ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: battle.turn === "player" && battle.energy >= 3 ? "#a855f7" : "rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", gap: "0.3rem", width: "100%", justifyContent: "center",
                  }}>
                  <SpecialIcon size={12} /> Special (3⚡)
                </button>
                <div style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.25)", textAlign: "center", fontFamily: "'JetBrains Mono',monospace" }}>
                  {battle.turn === "player" ? "YOUR TURN" : "SOPHIA THINKING…"}
                </div>
              </>
            )}

            {/* Battle result */}
            {battle.winner && (
              <div style={{ textAlign: "center", padding: "0.75rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 900, fontFamily: "'JetBrains Mono',monospace",
                  color: battle.winner === "player" ? "#3dd68c" : "#f26b6b", marginBottom: "0.5rem" }}>
                  {battle.winner === "player" ? "VICTORY" : "DEFEATED"}
                </div>
                <button onClick={resetArena} style={{ padding: "0.4rem 0.75rem", borderRadius: "7px", fontWeight: 700, fontSize: "0.62rem", fontFamily: "'JetBrains Mono',monospace", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
                  New Duel
                </button>
              </div>
            )}
          </div>

          {/* Agent team */}
          <div>
            <div style={{ fontSize: "0.54rem", fontWeight: 700, color: "#f26b6b", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.625rem", fontFamily: "'JetBrains Mono',monospace", textAlign: "right" }}>
              Sophia Agent
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {battle.agentTeam.map((c) => (
                <ArenaCard key={c.card.id}
                  combatant={c}
                  isDefeated={c.hp <= 0}
                  side="agent"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Battle log */}
      {battle && battle.log.length > 0 && (
        <div ref={logRef} style={{
          marginTop: "1.25rem", background: "rgba(2,3,10,0.97)",
          border: "1px solid rgba(107,140,255,0.12)", borderRadius: "10px",
          padding: "0.625rem 1rem", maxHeight: "160px", overflowY: "auto",
          fontFamily: "'JetBrains Mono',monospace",
        }}>
          {battle.log.slice(-12).map((line, i, arr) => (
            <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.58rem", lineHeight: 1.5,
              color: i === arr.length - 1 ? "#60A5FA" : `rgba(96,165,250,${Math.max(0.2, 0.8 - (arr.length - 1 - i) * 0.07)})` }}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
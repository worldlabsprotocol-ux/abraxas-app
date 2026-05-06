// FILE: lib/arena/arenaEngine.ts
// Abraxas Collector Arena state engine.
// Manages: owned cards, duel queue, staking positions, Sophia defense assignments.
// All state persisted locally (prod: on-chain via $CARDS PDA).
// Sophia agents run evaluateRisk() on each staked position every 30s.
// $ABRA burns: duel entry 0.5 ABRA, pack open 1 ABRA, stake/unstake 0.1 ABRA.
"use client";

import { useEffect, useState } from "react";
import { evaluateRisk, simulateSignals } from "@/lib/circuitEngine";
import { runAgentEvaluation, simulateAgentSignals, AGENTS } from "@/lib/agentEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardRarity   = "Legendary" | "Ultra Rare" | "Rare" | "Common";
export type CardCategory = "pokemon" | "onepiece" | "luxury";
export type StakeStatus  = "unstaked" | "staking" | "staked" | "unstaking";
export type DuelStatus   = "idle" | "preparing" | "simulating" | "resolved";
export type DefenseLevel = "armed" | "alert" | "breached" | "inactive";

export interface ArenaCard {
  id:            string;
  name:          string;
  category:      CardCategory;
  grade:         string;
  rarity:        CardRarity;
  priceSol:      number;
  priceUsd:      number;
  change24h:     number;
  series:        string;
  population:    number;
  power:         number;    // 1–100 duel stat — rarity + grade weighted
  defense:       number;    // 1–100 duel stat — circuit protection weighted
  speed:         number;    // 1–100 duel stat — liquidity/volume weighted
  color:         string;
  icon:          string;
  owned:         boolean;
  stakeStatus:   StakeStatus;
  stakeYieldPct: number;    // APY when staked
  accruedYield:  number;    // ABRA accrued this session
  stakedAt?:     number;    // timestamp
  defenseLevel:  DefenseLevel;
  defenseAgent?: string;    // agent ID
  circuitScore:  number;    // 0–100
  fractional:    boolean;
  txSignature?:  string;    // last on-chain tx
}

export interface DuelResult {
  id:           string;
  ts:           number;
  challenger:   ArenaCard;
  defender:     ArenaCard;
  winner:       "challenger" | "defender" | "draw";
  rounds:       DuelRound[];
  flavorText:   string;
  abraBurn:     number;
  txSignature:  string;
  agentReasoning: string;
}

export interface DuelRound {
  round:           number;
  stat:            "power" | "defense" | "speed";
  challengerRoll:  number;
  defenderRoll:    number;
  winner:          "challenger" | "defender";
  narrative:       string;
}

export interface StakePosition {
  cardId:     string;
  stakedAt:   number;
  yieldPct:   number;
  accumulated:number;
  defenseAgent:string;
}

// ─── ABRA burn ledger ─────────────────────────────────────────────────────────
const ABRA_COSTS = {
  duel:    0.5,
  pack:    1.0,
  stake:   0.1,
  unstake: 0.1,
} as const;

let abraBurned = 0;
const burnListeners = new Set<() => void>();
function burnAbra(amount: number, reason: string) {
  abraBurned += amount;
  burnListeners.forEach((l) => l());
  return { amount, reason, ts: Date.now(), txId: `abra-burn-${Date.now().toString(36)}` };
}

// ─── Duel engine ─────────────────────────────────────────────────────────────

const DUEL_NARRATIVES: Record<string, string[]> = {
  power:   ["overwhelms with raw force", "strikes with precision", "dominates the stat check"],
  defense: ["deflects the assault", "holds firm under pressure", "the Circuit Shield absorbs impact"],
  speed:   ["outpaces the competition", "liquidity advantage prevails", "exploits the timing gap"],
};

const LEGENDARY_FLAVOR = [
  "Sophia Agent confirms: market-level alpha extracted.",
  "Circuit Shield absorbed {defender} — {challenger} claims the yield.",
  "The swarm has spoken. {winner} dominates.",
  "On-chain verification complete. Victory logged to Solana.",
  "Abraxas Mind computed 40,000 scenarios. This outcome was inevitable.",
];

function seededRandom(seed: number): number {
  return Math.abs(Math.sin(seed * 9301 + 49297)) % 1;
}

export function runDuel(challenger: ArenaCard, defender: ArenaCard): DuelResult {
  const stats: Array<"power" | "defense" | "speed"> = ["power", "defense", "speed"];
  const seed = Date.now();
  const rounds: DuelRound[] = stats.map((stat, i) => {
    const cBase = challenger[stat];
    const dBase = defender[stat];
    const cRoll = Math.round(cBase * (0.7 + seededRandom(seed + i * 37) * 0.6));
    const dRoll = Math.round(dBase * (0.7 + seededRandom(seed + i * 73) * 0.6));
    const winner = cRoll >= dRoll ? "challenger" : "defender";
    const winCard = winner === "challenger" ? challenger : defender;
    const narrs   = DUEL_NARRATIVES[stat];
    return {
      round: i + 1, stat, challengerRoll: cRoll, defenderRoll: dRoll, winner,
      narrative: `${winCard.name} ${narrs[Math.floor(seededRandom(seed + i) * narrs.length)]}`,
    };
  });

  const cWins  = rounds.filter((r) => r.winner === "challenger").length;
  const winner = cWins > 1 ? "challenger" : cWins < 1 ? "defender" : "draw";
  const winCard = winner === "challenger" ? challenger : winner === "defender" ? defender : null;

  const flavor = LEGENDARY_FLAVOR[Math.floor(seededRandom(seed) * LEGENDARY_FLAVOR.length)]
    .replace("{challenger}", challenger.name)
    .replace("{defender}", defender.name)
    .replace("{winner}", winCard?.name ?? "Both parties");

  // Sophia agent reasoning trace
  const agentReasoning = [
    `[ABRAXAS MIND] Duel analysis complete — ${rounds.length} stat vectors evaluated`,
    `[CIRCUIT]  ${challenger.name}: PWR ${challenger.power} DEF ${challenger.defense} SPD ${challenger.speed}`,
    `[CIRCUIT]  ${defender.name}: PWR ${defender.power} DEF ${defender.defense} SPD ${defender.speed}`,
    `[SOPHIA]   Risk-adjusted outcome: ${winner === "draw" ? "DRAW — equal sovereignty" : `${winCard?.name} advantage confirmed`}`,
    `[ON-CHAIN] Result logged — $ABRA burn: ${ABRA_COSTS.duel}`,
  ].join("\n");

  burnAbra(ABRA_COSTS.duel, "duel_entry");

  return {
    id:   `duel-${Date.now().toString(36)}`,
    ts:   Date.now(),
    challenger, defender, winner, rounds, flavorText: flavor,
    abraBurn:     ABRA_COSTS.duel,
    txSignature:  `sim${Math.random().toString(36).slice(2, 46)}`,
    agentReasoning,
  };
}

// ─── Staking engine ───────────────────────────────────────────────────────────

const STAKE_KEY = "abraxas_arena_stakes_v1";

function readStakes(): Record<string, StakePosition> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STAKE_KEY) ?? "{}"); } catch { return {}; }
}
function writeStakes(s: Record<string, StakePosition>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAKE_KEY, JSON.stringify(s));
}

export function stakeCard(card: ArenaCard): StakePosition {
  burnAbra(ABRA_COSTS.stake, "stake");
  const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
  const pos: StakePosition = {
    cardId:      card.id,
    stakedAt:    Date.now(),
    yieldPct:    card.stakeYieldPct,
    accumulated: 0,
    defenseAgent:agent.id,
  };
  const stakes = readStakes();
  writeStakes({ ...stakes, [card.id]: pos });
  return pos;
}

export function unstakeCard(cardId: string): void {
  burnAbra(ABRA_COSTS.unstake, "unstake");
  const stakes = readStakes();
  delete stakes[cardId];
  writeStakes(stakes);
}

export function getAccruedYield(pos: StakePosition): number {
  const elapsed = (Date.now() - pos.stakedAt) / (365 * 24 * 3600 * 1000);
  return Math.round(elapsed * pos.yieldPct * 1000 * 10000) / 10000; // in ABRA
}

// ─── Card defense tick ────────────────────────────────────────────────────────
// Called every 30s. Runs circuitEngine.evaluateRisk on each staked card.
export function runDefenseTick(cards: ArenaCard[]): Map<string, { score: number; level: DefenseLevel }> {
  const results = new Map<string, { score: number; level: DefenseLevel }>();
  const stakes  = readStakes();
  for (const card of cards) {
    if (!stakes[card.id]) continue;
    const signals = simulateSignals(card.id, card.priceSol);
    const risk    = evaluateRisk(signals);
    const score   = risk.score;
    const level: DefenseLevel = score > 70 ? "breached" : score > 45 ? "alert" : "armed";
    results.set(card.id, { score, level });
  }
  return results;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
const arenaListeners = new Set<() => void>();
function notifyArena() { arenaListeners.forEach((l) => l()); }

export function useArenaState() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    arenaListeners.add(fn);
    burnListeners.add(fn);
    return () => { arenaListeners.delete(fn); burnListeners.delete(fn); };
  }, []);
  return {
    abraBurned,
    stakes: readStakes(),
    stakeCard, unstakeCard, getAccruedYield, runDuel, runDefenseTick,
  };
}
// FILE: lib/vaultEngine.ts
// The complete interactive protocol loop.
// "User action → Circuit detection → Sophia response → Vault state change → Visible outcome"
// Deterministic. No randomness without bounds. Persisted via localStorage.
// All logic lives here. UI components import hooks only.

"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SophiaStrategy = "balanced" | "aggressive" | "conservative";
export type SophiaState    = "monitoring" | "acting" | "stabilized";
export type CircuitLevel   = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type VaultPhase     = "created" | "active" | "at_risk" | "stabilized";
export type EventKind      = "circuit" | "sophia" | "vault" | "system";

export interface UserVault {
  id:           string;
  name:         string;
  assetType:    string;
  riskScore:    number;       // 0–100
  prevScore:    number;       // for before/after visualization
  circuitLevel: CircuitLevel;
  phase:        VaultPhase;
  agentId:      string;
  strategy:     SophiaStrategy;
  sophiaState:  SophiaState;
  createdAt:    number;
  eventCount:   number;
}

export interface VaultEvent {
  id:          string;
  ts:          number;
  vaultId:     string;
  kind:        EventKind;
  source:      string;         // [CIRCUIT], [SOPHIA-01], [VAULT-490], etc.
  message:     string;
  outcome?:    string;
  scoreBefore?: number;
  scoreAfter?:  number;
  severity:    "info" | "warn" | "alert";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES = ["Music & IP Royalties", "Real Estate", "Receivables", "abraSOUND", "abraYIELD"];

const STRATEGIES: Record<SophiaStrategy, { label: string; reductionMin: number; reductionMax: number; delay: number }> = {
  balanced:     { label: "Balanced",     reductionMin: 20, reductionMax: 30, delay: 600  },
  aggressive:   { label: "Aggressive",   reductionMin: 30, reductionMax: 40, delay: 300  },
  conservative: { label: "Conservative", reductionMin: 10, reductionMax: 20, delay: 1100 },
};

const RISK_EVENTS = [
  { label: "Liquidity anomaly detected",       delta: +28, circuit: "HIGH" as CircuitLevel    },
  { label: "Volume spike — 3.2× baseline",     delta: +22, circuit: "HIGH" as CircuitLevel    },
  { label: "Counterparty credit downgrade",    delta: +18, circuit: "MEDIUM" as CircuitLevel  },
  { label: "Streaming velocity drawdown 24%",  delta: +24, circuit: "HIGH" as CircuitLevel    },
  { label: "Rental flow delta exceeds 8%",     delta: +16, circuit: "MEDIUM" as CircuitLevel  },
  { label: "Concentration threshold breached", delta: +30, circuit: "CRITICAL" as CircuitLevel },
];

const IDLE_EVENTS = [
  "Catalog weight verified — within baseline",
  "Liquidity depth nominal — no action",
  "Counterparty A-grade — position maintained",
  "Streaming velocity within threshold",
  "Rent flow delta 0.4% — holding",
  "Exposure drift 1.2% — within tolerance",
  "Hedge ratio recalculated — stable",
];

// Bounded deterministic value — seeded by input, no pure Math.random
function bounded(min: number, max: number, seed: number): number {
  const x = Math.abs(Math.sin(seed * 9301 + 49297) * 93280.9) % 1;
  return Math.round(min + x * (max - min));
}

function levelFromScore(score: number): CircuitLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function phaseFromScore(score: number): VaultPhase {
  if (score >= 50) return "at_risk";
  if (score <= 15) return "stabilized";
  return "active";
}

function agentIdFromStrategy(strategy: SophiaStrategy, idx: number): string {
  return `SOPHIA-0${idx + 1}`;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const VAULT_KEY  = "abraxas_uvaults_v1";
const EVENT_KEY  = "abraxas_uevents_v1";
const ONBOARD_KEY = "abraxas_onboard_v1";

function readVaults(): UserVault[]  {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(VAULT_KEY) ?? "[]"); } catch { return []; }
}
function writeVaults(v: UserVault[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAULT_KEY, JSON.stringify(v));
}
function readEvents(): VaultEvent[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(EVENT_KEY) ?? "[]"); } catch { return []; }
}
function writeEvents(e: VaultEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(EVENT_KEY, JSON.stringify(e.slice(0, 200)));
}
function readOnboard(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ONBOARD_KEY) ?? "0", 10);
}
function writeOnboard(step: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARD_KEY, String(step));
}

// ─── Module-level state + pub/sub ─────────────────────────────────────────────

let vaults: UserVault[] = [];
let events: VaultEvent[] = [];
let onboardStep = 0;
let vaultCounter = 0;
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

function init() {
  if (typeof window === "undefined") return;
  vaults      = readVaults();
  events      = readEvents();
  onboardStep = readOnboard();
  vaultCounter = vaults.length;
}

function pushEvent(e: Omit<VaultEvent, "id" | "ts">) {
  const ev: VaultEvent = { ...e, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, ts: Date.now() };
  events = [ev, ...events].slice(0, 200);
  writeEvents(events);
  notify();
}

function updateVault(id: string, patch: Partial<UserVault>) {
  vaults = vaults.map((v) => v.id === id ? { ...v, ...patch } : v);
  writeVaults(vaults);
  notify();
}

// ─── Public API — vault creation ──────────────────────────────────────────────

export function createVault(strategy: SophiaStrategy = "balanced", assetTypeIdx?: number): UserVault {
  init();
  const idx     = vaultCounter++;
  const assetIdx = assetTypeIdx ?? (idx % ASSET_TYPES.length);
  const id      = `UV-${String(idx + 1).padStart(3, "0")}`;
  const agentId = agentIdFromStrategy(strategy, idx % 5);
  const vault: UserVault = {
    id, name: `VAULT-${id}`, assetType: ASSET_TYPES[assetIdx],
    riskScore: 50, prevScore: 50,
    circuitLevel: "MEDIUM", phase: "created",
    agentId, strategy, sophiaState: "monitoring",
    createdAt: Date.now(), eventCount: 0,
  };
  vaults = [vault, ...vaults];
  writeVaults(vaults);

  pushEvent({ vaultId: id, kind: "system", source: "[SYSTEM]",   message: `${vault.name} initialized — ${ASSET_TYPES[assetIdx]}`, severity: "info" });
  pushEvent({ vaultId: id, kind: "sophia", source: `[${agentId}]`, message: `Assigned to ${vault.name} · ${STRATEGIES[strategy].label} strategy`, severity: "info" });
  pushEvent({ vaultId: id, kind: "circuit", source: "[CIRCUIT]", message: `Risk baseline set — score 50 · state MEDIUM`, severity: "info" });

  if (onboardStep === 0) { onboardStep = 1; writeOnboard(1); }
  notify();
  return vault;
}

// ─── Public API — trigger risk event ─────────────────────────────────────────

export async function triggerRiskEvent(vaultId: string): Promise<void> {
  init();
  const vault = vaults.find((v) => v.id === vaultId);
  if (!vault) return;

  const eventIdx  = bounded(0, RISK_EVENTS.length - 1, Date.now() + vault.eventCount);
  const riskEvent = RISK_EVENTS[eventIdx];
  const scoreBefore = vault.riskScore;
  const newScore  = Math.min(100, scoreBefore + riskEvent.delta);
  const newLevel  = levelFromScore(newScore);

  // Step 1 — Circuit detection
  updateVault(vaultId, {
    riskScore: newScore, prevScore: scoreBefore,
    circuitLevel: newLevel, phase: "at_risk",
    sophiaState: "monitoring", eventCount: vault.eventCount + 1,
  });
  pushEvent({
    vaultId, kind: "circuit", source: "[CIRCUIT]",
    message: `${riskEvent.label}`,
    outcome: `Risk ${scoreBefore} → ${newScore} · ${newLevel}`,
    scoreBefore, scoreAfter: newScore, severity: newLevel === "CRITICAL" ? "alert" : "warn",
  });

  if (onboardStep === 1) { onboardStep = 2; writeOnboard(2); }

  // Step 2 — Sophia acts after delay
  const strat  = STRATEGIES[vault.strategy];
  const delay  = bounded(strat.delay, strat.delay + 400, Date.now());
  await sleep(delay);

  updateVault(vaultId, { sophiaState: "acting" });
  pushEvent({
    vaultId, kind: "sophia", source: `[${vault.agentId}]`,
    message: `Executing ${strat.label} hedge response`,
    severity: "warn",
  });

  // Step 3 — Risk reduction after strategy delay
  await sleep(bounded(strat.delay * 0.5, strat.delay, delay + 1));
  const reduction = bounded(strat.reductionMin, strat.reductionMax, Date.now());
  const finalScore = Math.max(10, newScore - reduction);
  const finalLevel = levelFromScore(finalScore);

  updateVault(vaultId, {
    riskScore: finalScore, prevScore: newScore,
    circuitLevel: finalLevel, sophiaState: "stabilized",
    phase: phaseFromScore(finalScore),
  });
  pushEvent({
    vaultId, kind: "vault", source: `[${vaultId}]`,
    message: `Risk reduced ${newScore} → ${finalScore}`,
    outcome: `${newLevel} → ${finalLevel} · ${strat.label} response complete`,
    scoreBefore: newScore, scoreAfter: finalScore,
    severity: "info",
  });
  pushEvent({
    vaultId, kind: "sophia", source: `[${vault.agentId}]`,
    message: `Position stabilized · monitoring resumed`,
    severity: "info",
  });

  if (onboardStep === 2) { onboardStep = 3; writeOnboard(3); }
}

// ─── Public API — switch strategy ────────────────────────────────────────────

export function switchStrategy(vaultId: string, strategy: SophiaStrategy) {
  init();
  const vault = vaults.find((v) => v.id === vaultId);
  if (!vault) return;
  updateVault(vaultId, { strategy, sophiaState: "monitoring" });
  pushEvent({
    vaultId, kind: "sophia", source: `[${vault.agentId}]`,
    message: `Strategy switched to ${STRATEGIES[strategy].label}`,
    severity: "info",
  });
}

// ─── Public API — idle tick (called by hook) ──────────────────────────────────

export function idleTick() {
  init();
  if (vaults.length === 0) return;
  const vault  = vaults[0];
  const msgIdx = bounded(0, IDLE_EVENTS.length - 1, Date.now());
  const source = Math.random() > 0.5 ? "[CIRCUIT]" : `[${vault.agentId}]`;
  const kind: EventKind   = source === "[CIRCUIT]" ? "circuit" : "sophia";
  pushEvent({ vaultId: vault.id, kind, source, message: IDLE_EVENTS[msgIdx], severity: "info" });
}

// ─── Demo mode ────────────────────────────────────────────────────────────────

let demoRunning = false;
let demoHandle: ReturnType<typeof setTimeout> | null = null;

export function startDemoMode() {
  init();
  if (demoRunning) return;
  demoRunning = true;

  // Auto-create vault if none
  if (vaults.length === 0) createVault("balanced");

  const loop = async () => {
    if (!demoRunning) return;
    const v = vaults[0];
    if (v) await triggerRiskEvent(v.id);
    const next = bounded(5000, 8000, Date.now());
    demoHandle = setTimeout(loop, next);
  };

  demoHandle = setTimeout(loop, 2000);
  pushEvent({ vaultId: vaults[0]?.id ?? "", kind: "system", source: "[SYSTEM]", message: "Demo mode active — autonomous simulation running", severity: "info" });
  notify();
}

export function stopDemoMode() {
  demoRunning = false;
  if (demoHandle) { clearTimeout(demoHandle); demoHandle = null; }
  notify();
}

export function isDemoRunning() { return demoRunning; }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export function useVaultEngine() {
  const [, setTick] = useState(0);
  const idleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    init();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);

    // Idle ticks — keep system alive
    idleRef.current = setInterval(() => {
      if (vaults.length > 0 && !demoRunning) idleTick();
    }, bounded(10_000, 15_000, Date.now()));

    return () => {
      listeners.delete(fn);
      if (idleRef.current) clearInterval(idleRef.current);
    };
  }, []);

  return {
    vaults:         vaults,
    events:         events,
    onboardStep:    onboardStep,
    demoRunning:    demoRunning,
    createVault,
    triggerRiskEvent,
    switchStrategy,
    startDemoMode,
    stopDemoMode,
  };
}
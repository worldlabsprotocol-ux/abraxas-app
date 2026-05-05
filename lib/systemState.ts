// FILE: lib/systemState.ts
// Unified system state machine. Single source of truth.
// Every UI interaction + every Helius webhook event updates this store.
// State drives UI — UI never drives state.
"use client";

import { useEffect, useState } from "react";

// ─── State types ──────────────────────────────────────────────────────────────

export type VaultState = "UNPROTECTED" | "PROTECTED" | "AT_RISK" | "CIRCUIT_TRIGGERED";
export type CircuitState = "INACTIVE" | "ACTIVE" | "TRIGGERED";
export type AgentRole = "hedge" | "rebalance" | "yield_optimize" | "circuit_guard";

export interface SystemVault {
  id:           string;
  name:         string;
  asset:        string;
  assetType:    string;
  state:        VaultState;
  circuitState: CircuitState;
  agentId:      string | null;
  agentRole:    AgentRole | null;
  policy:       string | null;
  riskScore:    number;           // 0–100
  lastHeliusEvent: HeliusEvent | null;
  lastAction:   string | null;
  createdAt:    number;
  updatedAt:    number;
}

export interface HeliusEvent {
  id:          string;
  ts:          number;
  type:        string;          // "NFT_SALE" | "TRANSFER" | "MINT" | "ANOMALY" | "simulated"
  source:      "helius" | "simulated";
  signature?:  string;
  wallet?:     string;
  amount?:     number;
  description: string;
  riskSignal:  "low" | "medium" | "high" | "none";
  vaultId?:    string;
  stateChange?: string;         // "PROTECTED→AT_RISK" etc
}

export interface SystemEvent {
  id:      string;
  ts:      number;
  kind:    "helius" | "circuit" | "agent" | "vault" | "system";
  source:  string;
  message: string;
  vaultId?: string;
  severity: "info" | "warn" | "alert";
}

// ─── Persistence ──────────────────────────────────────────────────────────────
const VAULT_KEY  = "abraxas_sys_vaults_v1";
const EVENT_KEY  = "abraxas_sys_events_v1";
const HELIUS_KEY = "abraxas_helius_v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)); } catch { return fallback; }
}
function write(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Module state ─────────────────────────────────────────────────────────────
let vaults:       SystemVault[]  = [];
let events:       SystemEvent[]  = [];
let heliusEvents: HeliusEvent[]  = [];
let heliusUrl:    string | null  = null;
let heliusConnected              = false;
let initialized                  = false;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((l) => l()); }

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized   = true;
  vaults        = read<SystemVault[]>(VAULT_KEY, []);
  events        = read<SystemEvent[]>(EVENT_KEY, []).slice(0, 100);
  heliusEvents  = read<HeliusEvent[]>(HELIUS_KEY, []).slice(0, 50);
}

// ─── System event emitter ─────────────────────────────────────────────────────
function emit(e: Omit<SystemEvent, "id" | "ts">) {
  const ev: SystemEvent = { ...e, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, ts: Date.now() };
  events = [ev, ...events].slice(0, 100);
  write(EVENT_KEY, events);
}

// ─── Vault operations ─────────────────────────────────────────────────────────

export function createSystemVault(params: {
  name: string; asset: string; assetType: string;
  agentRole?: AgentRole; policy?: string;
}): SystemVault {
  init();
  const id = `SV-${Date.now().toString(36).slice(-5)}`;
  const vault: SystemVault = {
    id, name: params.name, asset: params.asset, assetType: params.assetType,
    state: "UNPROTECTED", circuitState: "INACTIVE",
    agentId: null, agentRole: params.agentRole ?? null,
    policy: null, riskScore: 50,
    lastHeliusEvent: null, lastAction: null,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  vaults = [vault, ...vaults];
  write(VAULT_KEY, vaults);
  emit({ kind: "vault",  source: `[${id}]`, message: `Vault created — ${params.asset}`, vaultId: id, severity: "info" });
  notify();
  return vault;
}

export function activateProtection(vaultId: string, policy: string, agentRole: AgentRole): void {
  init();
  vaults = vaults.map((v) => {
    if (v.id !== vaultId) return v;
    const next: SystemVault = {
      ...v, state: "PROTECTED", circuitState: "ACTIVE",
      policy, agentRole, agentId: `SOPHIA-${agentRole.toUpperCase().slice(0,3)}`,
      lastAction: "Protection activated — Circuit armed",
      updatedAt: Date.now(),
    };
    emit({ kind: "circuit", source: "[CIRCUIT]", message: `Circuit ACTIVE on ${v.name} — monitoring ${policy}`, vaultId, severity: "info" });
    emit({ kind: "agent",   source: `[${next.agentId}]`, message: `Agent assigned — ${agentRole} strategy armed`, vaultId, severity: "info" });
    return next;
  });
  write(VAULT_KEY, vaults);
  notify();
}

export function ingestHeliusEvent(raw: Omit<HeliusEvent, "id">): void {
  init();
  const ev: HeliusEvent = { ...raw, id: `hev-${Date.now()}-${Math.random().toString(36).slice(2,5)}` };
  heliusEvents = [ev, ...heliusEvents].slice(0, 50);
  write(HELIUS_KEY, heliusEvents);

  emit({ kind: "helius", source: "[HELIUS]", message: `${ev.type}: ${ev.description}`, vaultId: ev.vaultId, severity: ev.riskSignal === "high" ? "alert" : ev.riskSignal === "medium" ? "warn" : "info" });

  // Update vault state if risk signal is high
  if (ev.riskSignal === "high" && ev.vaultId) {
    vaults = vaults.map((v) => {
      if (v.id !== ev.vaultId || v.state === "UNPROTECTED") return v;
      const prev = v.state;
      const next: SystemVault = {
        ...v, state: "AT_RISK", riskScore: Math.min(100, v.riskScore + 25),
        lastHeliusEvent: ev, lastAction: `Circuit evaluation triggered by Helius event`,
        updatedAt: Date.now(),
      };
      emit({ kind: "circuit", source: "[CIRCUIT]", message: `State change ${prev}→AT_RISK on ${v.name}`, vaultId: v.id, severity: "warn" });
      return next;
    });
    write(VAULT_KEY, vaults);
  }
  notify();
}

export function triggerCircuit(vaultId: string): void {
  init();
  vaults = vaults.map((v) => {
    if (v.id !== vaultId) return v;
    const next: SystemVault = {
      ...v, state: "CIRCUIT_TRIGGERED", circuitState: "TRIGGERED",
      riskScore: Math.min(100, v.riskScore + 30),
      lastAction: `Circuit triggered — simulated freeze at block ${(880_000 + Math.floor(Date.now() % 10_000)).toLocaleString()}`,
      updatedAt: Date.now(),
    };
    emit({ kind: "circuit", source: "[CIRCUIT]", message: `CIRCUIT TRIGGERED on ${v.name} — freeze applied`, vaultId, severity: "alert" });
    emit({ kind: "agent",   source: `[${v.agentId ?? "SOPHIA"}]`, message: `Executing ${v.agentRole ?? "hedge"} response`, vaultId, severity: "warn" });
    return next;
  });
  write(VAULT_KEY, vaults);
  notify();
}

export function setHeliusConnection(url: string, connected: boolean) {
  heliusUrl       = url;
  heliusConnected = connected;
  emit({ kind: "system", source: "[SYSTEM]", message: connected ? `Helius connected — ${url}` : `Helius disconnected`, severity: connected ? "info" : "warn" });
  notify();
}

// ─── Simulated Helius events (demo mode) ──────────────────────────────────────
const SIM_EVENTS: Array<Omit<HeliusEvent, "id" | "ts" | "source">> = [
  { type: "NFT_TRANSFER", description: "Mad Lads #4892 transferred to unknown wallet", riskSignal: "medium" },
  { type: "ANOMALY",      description: "Unusual volume spike — 3.2× baseline detected", riskSignal: "high"   },
  { type: "MINT",         description: "New RWA token minted — Collector Crypt pNFT",  riskSignal: "low"    },
  { type: "TRANSFER",     description: "Large SOL movement — 50 SOL to lending protocol", riskSignal: "medium" },
  { type: "NFT_SALE",     description: "Tensorians floor sale — -8.4% price impact",   riskSignal: "high"   },
  { type: "ANOMALY",      description: "Oracle price deviation detected — USDY +22bps", riskSignal: "medium" },
];
let simIdx = 0;

export function simulateHeliusEvent(vaultId?: string): void {
  const template = SIM_EVENTS[simIdx % SIM_EVENTS.length];
  simIdx++;
  ingestHeliusEvent({
    ...template, ts: Date.now(), source: "simulated",
    signature: `sim${Math.random().toString(36).slice(2, 12)}`,
    vaultId,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSystemState() {
  const [, setTick] = useState(0);
  useEffect(() => {
    init();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return {
    vaults, events, heliusEvents, heliusUrl, heliusConnected,
    systemState: (vaults.length === 0 ? "NO_VAULTS"
      : vaults.some((v) => v.state === "CIRCUIT_TRIGGERED") ? "CIRCUIT_TRIGGERED"
      : vaults.some((v) => v.state === "AT_RISK") ? "AT_RISK"
      : vaults.some((v) => v.state === "PROTECTED") ? "PROTECTED"
      : "UNPROTECTED") as "NO_VAULTS" | "UNPROTECTED" | "PROTECTED" | "AT_RISK" | "CIRCUIT_TRIGGERED",
    createSystemVault, activateProtection, triggerCircuit,
    setHeliusConnection, simulateHeliusEvent, ingestHeliusEvent,
  };
}
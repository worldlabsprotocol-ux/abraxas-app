// FILE: lib/protocolStream.ts
// Protocol Event Stream — the storytelling layer.
// Deterministic, client-side. Generates a continuous stream of protocol events.
// Format: [SOURCE] message
// Sources: CIRCUIT, SOPHIA-01..05, VAULT-490..494, SYSTEM
"use client";

import { useEffect, useState, useRef } from "react";

export type StreamEventType = "circuit_detect" | "agent_act" | "vault_update" | "system" | "defense";

export interface StreamEvent {
  id:        string;
  ts:        number;
  type:      StreamEventType;
  source:    string;           // [CIRCUIT], [SOPHIA-01], [VAULT-490], [SYSTEM]
  message:   string;
  severity:  "info" | "warn" | "alert";
  vaultId?:  string;
}

// Static event pool — deterministic, believable, tells the protocol story
const EVENT_POOL: Array<Omit<StreamEvent, "id" | "ts">> = [
  // Circuit detection events
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-490 streaming velocity within threshold — holding position", severity: "info" },
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-491 liquidity depth nominal — no action required", severity: "info", vaultId: "491" },
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-492 rental flow delta within 3.2% of baseline", severity: "info", vaultId: "492" },
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-493 counterparty A-grade — position maintained", severity: "info", vaultId: "493" },
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-490 volume deviation flagged — entering evaluation", severity: "warn", vaultId: "490" },
  { type: "circuit_detect", source: "[CIRCUIT]",  message: "VAULT-494 graduation checkpoint — 15.1% bonding progress", severity: "info", vaultId: "494" },
  { type: "defense",        source: "[CIRCUIT]",  message: "VAULT-491 hedge ratio drift detected — instructing SOPHIA-02", severity: "warn", vaultId: "491" },
  { type: "defense",        source: "[CIRCUIT]",  message: "VAULT-490 drawdown threshold breached — circuit activating", severity: "alert", vaultId: "490" },
  // Agent response events
  { type: "agent_act", source: "[SOPHIA-01]", message: "Catalog weight adjusted +0.19% — yield window captured", severity: "info", vaultId: "490" },
  { type: "agent_act", source: "[SOPHIA-01]", message: "Royalty reinvestment executed — distribution gap 11d → 0d", severity: "info", vaultId: "490" },
  { type: "agent_act", source: "[SOPHIA-02]", message: "Hedge ratio recalculated 0.41 → 0.38 — exposure balanced", severity: "info", vaultId: "491" },
  { type: "agent_act", source: "[SOPHIA-02]", message: "Monthly royalty cycle closed — +2.1% captured to vault", severity: "info", vaultId: "491" },
  { type: "agent_act", source: "[SOPHIA-03]", message: "Rent flow reinvested — vacancy buffer recalibrated", severity: "info", vaultId: "492" },
  { type: "agent_act", source: "[SOPHIA-03]", message: "Position sizing verified — neutral on vacancy exposure", severity: "info", vaultId: "492" },
  { type: "agent_act", source: "[SOPHIA-04]", message: "Counterparty risk scored A-grade — invoice batch accepted", severity: "info", vaultId: "493" },
  { type: "agent_act", source: "[SOPHIA-04]", message: "Pool rotation executed — concentration reduced to 22%", severity: "info", vaultId: "493" },
  { type: "agent_act", source: "[SOPHIA-05]", message: "Bonding checkpoint passed — graduation at 15.1%", severity: "info", vaultId: "494" },
  { type: "agent_act", source: "[SOPHIA-01]", message: "Reserve buffer raised 15% → 22% — circuit response complete", severity: "warn", vaultId: "490" },
  // Vault state events
  { type: "vault_update", source: "[VAULT-490]", message: "Position operating — 8,421 agent actions since inception", severity: "info", vaultId: "490" },
  { type: "vault_update", source: "[VAULT-491]", message: "Yield compounding — +11.4% annualized captured this cycle", severity: "info", vaultId: "491" },
  { type: "vault_update", source: "[VAULT-492]", message: "Rent cycle complete — capital redeployed", severity: "info", vaultId: "492" },
  { type: "vault_update", source: "[VAULT-493]", message: "Invoice batch settled — +1.35% returned to position", severity: "info", vaultId: "493" },
  { type: "vault_update", source: "[VAULT-494]", message: "Catalog indexed — 12 new sync registrations", severity: "info", vaultId: "494" },
  // System events
  { type: "system", source: "[SYSTEM]", message: "All 5 agents reporting — $0 unrecovered across 31 defense events", severity: "info" },
  { type: "system", source: "[SYSTEM]", message: "Circuit engine evaluation cycle complete — 5 vaults assessed", severity: "info" },
  { type: "system", source: "[SYSTEM]", message: "Protocol uptime 99.97% — all circuits nominal", severity: "info" },
];

// Deterministic pick — varies by time slot so each interval feels different
function pickEvent(slot: number): Omit<StreamEvent, "id" | "ts"> {
  const idx = slot % EVENT_POOL.length;
  return EVENT_POOL[idx];
}

let globalStore: StreamEvent[] = [];
const listeners = new Set<() => void>();

// Seed initial events so feed is never empty on first render
function seedInitial(): StreamEvent[] {
  const now = Date.now();
  return EVENT_POOL.slice(0, 12).map((e, i) => ({
    ...e,
    id: `seed-${i}`,
    ts: now - (12 - i) * 18_000, // spread over last 3.6 minutes
  }));
}

if (globalStore.length === 0) {
  globalStore = seedInitial();
}

function emit(event: StreamEvent) {
  globalStore = [event, ...globalStore].slice(0, 80);
  listeners.forEach((l) => l());
}

let ticker: ReturnType<typeof setInterval> | null = null;
let slotCounter = 12; // start after seed entries

function startStream() {
  if (ticker !== null || typeof window === "undefined") return;
  ticker = setInterval(() => {
    const ev = pickEvent(slotCounter++);
    emit({
      ...ev,
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ts: Date.now(),
    });
  }, 6_000); // new event every 6 seconds — feels alive
}

export function useProtocolStream(limit = 20): StreamEvent[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    startStream();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return globalStore.slice(0, limit);
}

// Derive system-level state from recent events
export function useCircuitState(): { state: "SAFE" | "WATCH" | "RISK"; pulse: boolean } {
  const events = useProtocolStream(10);
  const alerts = events.filter((e) => e.severity === "alert").length;
  const warns  = events.filter((e) => e.severity === "warn").length;
  const state  = alerts > 0 ? "RISK" : warns >= 2 ? "WATCH" : "SAFE";
  return { state, pulse: warns > 0 || alerts > 0 };
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
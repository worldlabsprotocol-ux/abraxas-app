// FILE: lib/activityStore.ts
// Unified event system. All protocol events write here. All feeds read from here.
// No separate fake feeds.
"use client";

import { useEffect, useState } from "react";

export type EventType = "deposit" | "mint" | "withdraw" | "rebalance" | "defense" | "agent";

// Protocol event — every action produces one of these
export interface ProtocolEvent {
  id:           string;
  type:         EventType;
  // Location
  userWallet:   string;
  vaultId:      string;
  vaultName:    string;
  assetType:    string;
  // Values
  amount?:      number;
  message:      string;
  // Verification
  txSignature:  string | null;  // null = simulated
  simulated:    boolean;
  ts:           number;
}

// Legacy alias so LiveFeed component still works
export type Activity = ProtocolEvent;
export type ActivityType = EventType;

let store: ProtocolEvent[] = seedEvents();
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function seedEvents(): ProtocolEvent[] {
  const now = Date.now();
  return [
    { id: "s1", type: "agent",    userWallet: "", vaultId: "490", vaultName: "VAULT-490", assetType: "Music IP",     message: "Streaming velocity confirmed — holding position",          txSignature: null, simulated: true, ts: now - 120_000 },
    { id: "s2", type: "deposit",  userWallet: "", vaultId: "492", vaultName: "VAULT-492", assetType: "Real Estate",  message: "Position opened", amount: 5_000,                           txSignature: null, simulated: true, ts: now - 360_000 },
    { id: "s3", type: "mint",     userWallet: "", vaultId: "492", vaultName: "VAULT-492", assetType: "Real Estate",  message: "Token-2022 ABRAP minted to operator wallet",               txSignature: null, simulated: true, ts: now - 360_000 },
    { id: "s4", type: "rebalance",userWallet: "", vaultId: "491", vaultName: "VAULT-491", assetType: "Music IP",     message: "Monthly royalty cycle closed — +2.1%",                     txSignature: null, simulated: true, ts: now - 720_000 },
    { id: "s5", type: "defense",  userWallet: "", vaultId: "490", vaultName: "VAULT-490", assetType: "Music IP",     message: "Circuit defense — volatility threshold. Reserve raised.",   txSignature: null, simulated: true, ts: now - 1_320_000 },
    { id: "s6", type: "deposit",  userWallet: "", vaultId: "490", vaultName: "VAULT-490", assetType: "Music IP",     message: "Position opened", amount: 2_500,                           txSignature: null, simulated: true, ts: now - 1_860_000 },
    { id: "s7", type: "mint",     userWallet: "", vaultId: "490", vaultName: "VAULT-490", assetType: "Music IP",     message: "Token-2022 ABRAP minted to operator wallet",               txSignature: null, simulated: true, ts: now - 1_860_000 },
    { id: "s8", type: "agent",    userWallet: "", vaultId: "493", vaultName: "VAULT-493", assetType: "Receivables",  message: "Counterparty risk scored — A-grade. Position maintained.", txSignature: null, simulated: true, ts: now - 2_640_000 },
    { id: "s9", type: "withdraw", userWallet: "", vaultId: "494", vaultName: "VAULT-494", assetType: "Music IP",     message: "Simulated exit — principal returned",  amount: 1_200,      txSignature: null, simulated: true, ts: now - 3_480_000 },
  ];
}

export function logEvent(e: Omit<ProtocolEvent, "id" | "ts"> & { ts?: number }) {
  const event: ProtocolEvent = {
    ...e,
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
    ts: e.ts ?? Date.now(),
  };
  store = [event, ...store].slice(0, 100);
  emit();
}

// Legacy alias
export const logActivity = logEvent;

export function getEvents(): ProtocolEvent[] { return store; }
export function getActivity(): ProtocolEvent[] { return store; }

// Periodic agent events — deterministic rules, not black-box
const AGENT_RULES = [
  { vault: "490", asset: "Music IP",    rule: "stream_velocity_check",  msg: "Streaming velocity within threshold — holding" },
  { vault: "491", asset: "Music IP",    rule: "royalty_cycle_check",    msg: "Royalty cycle checked — compound triggered" },
  { vault: "492", asset: "Real Estate", rule: "rent_flow_check",        msg: "Rent flow captured — reinvested" },
  { vault: "493", asset: "Receivables", rule: "credit_score_check",     msg: "Counterparty credit score A-grade — maintained" },
  { vault: "494", asset: "Music IP",    rule: "catalog_index_check",    msg: "Catalog index updated — position stable" },
];

let tickerStarted = false;
function startTicker() {
  if (tickerStarted || typeof window === "undefined") return;
  tickerStarted = true;
  setInterval(() => {
    const r = AGENT_RULES[Math.floor(Math.random() * AGENT_RULES.length)];
    logEvent({ type: "agent", userWallet: "", vaultId: r.vault, vaultName: `VAULT-${r.vault}`, assetType: r.asset, message: `[${r.rule}] ${r.msg}`, txSignature: null, simulated: true });
  }, 14_000);
}

export function useActivity(): ProtocolEvent[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    startTicker();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return store;
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
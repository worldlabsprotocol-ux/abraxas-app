// FILE: lib/activityStore.ts
// In-memory activity log. Deposit + withdraw write here. Live feed reads.
"use client";

import { useEffect, useState } from "react";

export type ActivityType = "deposit" | "mint" | "withdraw" | "agent" | "defense";

export interface Activity {
  id:        string;
  type:      ActivityType;
  vaultId:   string;
  vaultName: string;
  asset:     string;
  amount?:   number;
  message:   string;
  txSig?:    string | null;
  ts:        number;
}

// Module-level store + listener pattern
let store: Activity[] = seed();
const listeners = new Set<() => void>();

function emit() { listeners.forEach((l) => l()); }

function seed(): Activity[] {
  const now = Date.now();
  return [
    { id: "a1", type: "agent",    vaultId: "490", vaultName: "VAULT-490", asset: "Music IP",      message: "Streaming velocity confirmed — holding",         ts: now - 1_000 * 60 * 2 },
    { id: "a2", type: "deposit",  vaultId: "492", vaultName: "VAULT-492", asset: "Real Estate",   message: "Position opened",          amount: 5_000,        ts: now - 1_000 * 60 * 6 },
    { id: "a3", type: "mint",     vaultId: "492", vaultName: "VAULT-492", asset: "Real Estate",   message: "Token-2022 minted to operator wallet",           ts: now - 1_000 * 60 * 6 },
    { id: "a4", type: "agent",    vaultId: "491", vaultName: "VAULT-491", asset: "Music IP",      message: "Monthly royalty cycle closed — +2.1%",          ts: now - 1_000 * 60 * 12 },
    { id: "a5", type: "defense",  vaultId: "490", vaultName: "VAULT-490", asset: "Music IP",      message: "Circuit defense — volatility threshold crossed", ts: now - 1_000 * 60 * 22 },
    { id: "a6", type: "deposit",  vaultId: "490", vaultName: "VAULT-490", asset: "Music IP",      message: "Position opened",          amount: 2_500,        ts: now - 1_000 * 60 * 31 },
    { id: "a7", type: "mint",     vaultId: "490", vaultName: "VAULT-490", asset: "Music IP",      message: "Token-2022 minted to operator wallet",           ts: now - 1_000 * 60 * 31 },
    { id: "a8", type: "agent",    vaultId: "493", vaultName: "VAULT-493", asset: "Receivables",   message: "Counterparty risk scored — A-grade",            ts: now - 1_000 * 60 * 44 },
    { id: "a9", type: "withdraw", vaultId: "494", vaultName: "VAULT-494", asset: "Music IP",      message: "Position closed — capital returned",  amount: 1_200, ts: now - 1_000 * 60 * 58 },
    { id: "a10", type: "agent",   vaultId: "492", vaultName: "VAULT-492", asset: "Real Estate",   message: "Rent flow reinvested — +0.20%",                 ts: now - 1_000 * 60 * 71 },
  ];
}

export function logActivity(a: Omit<Activity, "id" | "ts"> & { ts?: number }) {
  const entry: Activity = {
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: a.ts ?? Date.now(),
    ...a,
  };
  store = [entry, ...store].slice(0, 60);
  emit();
}

export function getActivity(): Activity[] {
  return store;
}

// Periodic agent activity — keeps the feed alive
const AGENT_LINES = [
  { vault: "VAULT-490", asset: "Music IP",    msg: "Catalog weight adjusted — +0.19%" },
  { vault: "VAULT-491", asset: "Music IP",    msg: "Distribution flow captured — +0.24%" },
  { vault: "VAULT-492", asset: "Real Estate", msg: "Vacancy buffer recalibrated — stable" },
  { vault: "VAULT-493", asset: "Receivables", msg: "Invoice batch settled — +1.35%" },
  { vault: "VAULT-494", asset: "Music IP",    msg: "Catalog indexed — +0.12%" },
];
let tickerStarted = false;
function startTicker() {
  if (tickerStarted) return;
  if (typeof window === "undefined") return;
  tickerStarted = true;
  setInterval(() => {
    const pick = AGENT_LINES[Math.floor(Math.random() * AGENT_LINES.length)];
    const id = pick.vault.split("-")[1];
    logActivity({ type: "agent", vaultId: id, vaultName: pick.vault, asset: pick.asset, message: pick.msg });
  }, 14_000);
}

export function useActivity(): Activity[] {
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
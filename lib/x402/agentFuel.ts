// FILE: lib/x402/agentFuel.ts
// x402 Machine Economy layer.
// Each Sophia agent holds an "operational wallet" balance.
// Every Circuit evaluation or ElevenLabs call deducts micro-USDC.
// This is the x402 payment protocol pattern — agents pay for their own intelligence.
// Current: simulated ledger. Production: connect to Pay.sh USDC micropayments.
"use client";

import { useEffect, useState } from "react";

export interface AgentWallet {
  agentId:     string;
  balanceUsdc: number;    // simulated USDC balance
  spent:       number;    // total spent this session
  txCount:     number;    // number of paid operations
  lowFuel:     boolean;   // true when < 0.50 USDC
}

// Cost per operation (micro-USDC) — matches Pay.sh x402 pricing model
export const OPERATION_COSTS = {
  circuit_eval:      0.001,  // $0.001 per Circuit evaluation
  helius_event:      0.0005, // $0.0005 per Helius event processed
  voice_brief:       0.02,   // $0.02 per ElevenLabs TTS call
  agent_decision:    0.002,  // $0.002 per Sophia decision
} as const;

const LOW_FUEL_THRESHOLD = 0.50;
const STORE_KEY = "abraxas_agent_fuel_v1";

function readStore(): Record<string, AgentWallet> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}"); } catch { return {}; }
}
function writeStore(d: Record<string, AgentWallet>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(d));
}

let wallets: Record<string, AgentWallet> = {};
const listeners = new Set<() => void>();

function init() {
  if (Object.keys(wallets).length === 0 && typeof window !== "undefined") {
    wallets = readStore();
  }
}

function getOrCreate(agentId: string): AgentWallet {
  if (!wallets[agentId]) {
    wallets[agentId] = { agentId, balanceUsdc: 5.0, spent: 0, txCount: 0, lowFuel: false };
  }
  return wallets[agentId];
}

export function chargeAgent(agentId: string, operation: keyof typeof OPERATION_COSTS): {
  ok: boolean; cost: number; remaining: number; txId: string;
} {
  init();
  const cost   = OPERATION_COSTS[operation];
  const wallet = getOrCreate(agentId);

  if (wallet.balanceUsdc < cost) {
    return { ok: false, cost, remaining: wallet.balanceUsdc, txId: "" };
  }

  wallet.balanceUsdc = Math.round((wallet.balanceUsdc - cost) * 10_000) / 10_000;
  wallet.spent       = Math.round((wallet.spent + cost) * 10_000) / 10_000;
  wallet.txCount++;
  wallet.lowFuel     = wallet.balanceUsdc < LOW_FUEL_THRESHOLD;
  wallets[agentId]   = wallet;
  writeStore(wallets);
  listeners.forEach((l) => l());

  const txId = `x402-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return { ok: true, cost, remaining: wallet.balanceUsdc, txId };
}

export function topUpAgent(agentId: string, amount = 5.0): void {
  init();
  const wallet = getOrCreate(agentId);
  wallet.balanceUsdc = Math.round((wallet.balanceUsdc + amount) * 10_000) / 10_000;
  wallet.lowFuel     = wallet.balanceUsdc < LOW_FUEL_THRESHOLD;
  wallets[agentId]   = wallet;
  writeStore(wallets);
  listeners.forEach((l) => l());
}

export function useAgentFuel(agentId: string): AgentWallet {
  const [, setTick] = useState(0);
  useEffect(() => {
    init();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  init();
  return getOrCreate(agentId);
}
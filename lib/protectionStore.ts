// FILE: lib/protectionStore.ts
// Protection state machine. Single source of truth for asset protection.
// ONLY models: asset + protection status + policy + last event.
// NOT a portfolio tracker. NOT a trading system.
"use client";

import { useEffect, useState } from "react";

export type ProtectionStatus = "unprotected" | "protected" | "triggered";

export interface ProtectedAsset {
  id:          string;
  name:        string;
  assetType:   string;   // "Music IP" | "Real Estate" | "NFT" | etc
  floor?:      string;   // optional display value
  status:      ProtectionStatus;
  policy:      string | null;   // null = no policy
  policyArmed: boolean;
  createdAt:   number;
  lastEvent:   AssetEvent | null;
}

export interface AssetEvent {
  ts:      number;
  type:    "policy_armed" | "risk_detected" | "action_triggered" | "status_changed";
  message: string;
}

const STORE_KEY = "abraxas_protection_v1";

function readStore(): ProtectedAsset[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]"); } catch { return []; }
}
function writeStore(a: ProtectedAsset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(a));
}

let assets: ProtectedAsset[] = [];
const listeners = new Set<() => void>();
function notify() { listeners.forEach((l) => l()); }

function init() {
  if (assets.length === 0 && typeof window !== "undefined") {
    assets = readStore();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function protectAsset(params: {
  name: string; assetType: string; floor?: string; policy?: string;
}): ProtectedAsset {
  init();
  const id    = `PA-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const asset: ProtectedAsset = {
    id, name: params.name, assetType: params.assetType, floor: params.floor,
    status: "protected",
    policy: params.policy ?? "Quick Protect (Recommended)",
    policyArmed: true,
    createdAt: Date.now(),
    lastEvent: { ts: Date.now(), type: "policy_armed", message: `Policy armed — monitoring active` },
  };
  assets = [asset, ...assets];
  writeStore(assets);
  notify();
  return asset;
}

export function triggerProtection(id: string): void {
  init();
  assets = assets.map((a) => {
    if (a.id !== id) return a;
    const event: AssetEvent = {
      ts: Date.now(), type: "action_triggered",
      message: `Policy triggered — simulated freeze applied at block ${(880000 + Math.floor(Math.random() * 10000)).toLocaleString()}`,
    };
    return { ...a, status: "triggered", lastEvent: event };
  });
  writeStore(assets);
  notify();
}

export function removeProtection(id: string): void {
  init();
  assets = assets.filter((a) => a.id !== id);
  writeStore(assets);
  notify();
}

export function getAssets(): ProtectedAsset[] { init(); return assets; }

export function useProtectionStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    init();
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return {
    assets,
    protectedCount:    assets.filter((a) => a.status === "protected").length,
    triggeredCount:    assets.filter((a) => a.status === "triggered").length,
    unprotectedAssets: assets.filter((a) => a.status === "unprotected"),
    protectAsset,
    triggerProtection,
    removeProtection,
  };
}
// FILE: lib/positionStore.ts
// Position model — single source of truth for user positions.
// Persisted in localStorage. All UI reads from this store only.
"use client";

import { useEffect, useState } from "react";

export type PositionStatus = "created" | "active" | "operating" | "withdrawn" | "error";

// Full position model — every field required by UI must be here
export interface Position {
  id:               string;
  userWallet:       string;
  vaultId:          string;
  vaultName:        string;
  assetType:        string;
  // Custom metadata entered by user before mint
  displayName:      string;
  description:      string;
  // Capital accounting — deterministic, no guessing
  principal:        number;   // USD deposited
  accruedYield:     number;   // calculated from apy + time elapsed
  totalValue:       number;   // principal + accruedYield
  apy:              number;
  // Token-2022 position token
  mintAddress:      string;
  txSignature:      string;
  explorerUrl:      string;
  tokenName:        string;
  tokenSymbol:      string;
  simulated:        boolean;
  // Lifecycle
  status:           PositionStatus;
  createdAt:        number;
  updatedAt:        number;
  withdrawnAt?:     number;
}

const KEY = "abraxas_positions_v2";
const listeners = new Set<() => void>();

function read(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Position[]) : [];
  } catch { return []; }
}

function write(rows: Position[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {}
  listeners.forEach((l) => l());
}

// Deterministic yield calculation: apy × principal × elapsed days / 365
export function computeYield(position: Position): number {
  const elapsedMs   = Date.now() - position.createdAt;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  return Math.round(position.principal * (position.apy / 100) * (elapsedDays / 365) * 100) / 100;
}

export function addPosition(p: Omit<Position, "id" | "accruedYield" | "totalValue" | "createdAt" | "updatedAt">): Position {
  const now = Date.now();
  const row: Position = {
    ...p,
    id:           `pos-${now}-${Math.random().toString(36).slice(2, 6)}`,
    accruedYield: 0,
    totalValue:   p.principal,
    createdAt:    now,
    updatedAt:    now,
  };
  write([row, ...read()]);
  return row;
}

export function withdrawPosition(id: string) {
  const rows = read().map((p) => {
    if (p.id !== id) return p;
    const accrued = computeYield(p);
    return {
      ...p,
      status:       "withdrawn" as PositionStatus,
      accruedYield: accrued,
      totalValue:   p.principal + accrued,
      updatedAt:    Date.now(),
      withdrawnAt:  Date.now(),
    };
  });
  write(rows);
}

export function getPositions(): Position[] { return read(); }

export function usePositions(): Position[] {
  const [rows, setRows] = useState<Position[]>([]);
  useEffect(() => {
    setRows(read());
    const fn = () => setRows(read());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return rows;
}
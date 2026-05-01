// FILE: lib/positionStore.ts
// User positions. Persists in localStorage. Drives Dashboard + Withdraw.
"use client";

import { useEffect, useState } from "react";

export interface Position {
  id:           string;
  vaultId:      string;
  vaultName:    string;
  asset:        string;
  amount:       number;          // USD
  apy:          number;
  mintAddress:  string;          // Token-2022 mint
  txSig:        string;
  status:       "active" | "closed";
  openedAt:     number;
  closedAt?:    number;
}

const KEY = "abraxas_positions_v1";
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

export function addPosition(p: Omit<Position, "id" | "openedAt" | "status">): Position {
  const row: Position = {
    ...p,
    id:       `pos-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    openedAt: Date.now(),
    status:   "active",
  };
  write([row, ...read()]);
  return row;
}

export function closePosition(id: string) {
  const rows = read().map((p) => p.id === id ? { ...p, status: "closed" as const, closedAt: Date.now() } : p);
  write(rows);
}

export function getPositions(): Position[] {
  return read();
}

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
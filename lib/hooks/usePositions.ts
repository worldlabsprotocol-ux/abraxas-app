// FILE: lib/hooks/usePositions.ts
"use client";
export interface Position { id:string; protocol:string; amount:number; }
export function usePositions() {
  return { positions: [] as Position[], loading: false };
}
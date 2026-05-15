// FILE: lib/hooks/useProtocolStats.ts
"use client";
export interface ProtocolStats {
  totalMinted:   number | null;
  totalValueUsd: number | null;
  activeLoans:   number | null;
  tvl:           number | null;
}
export function useProtocolStats(): { stats: ProtocolStats; loading: boolean } {
  return {
    stats: { totalMinted:null, totalValueUsd:null, activeLoans:null, tvl:null },
    loading: false,
  };
}
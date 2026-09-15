// FILE: lib/settlement/validation.ts
// Input validation for settlement authorization.

import { isAddress, getAddress } from "viem";
import type { ArcSettlementConfigRow } from "@/lib/settlement/types";

export function normalizeEvmAddress(address: string): `0x${string}` | null {
  if (!address || !isAddress(address)) return null;
  try {
    return getAddress(address) as `0x${string}`;
  } catch {
    return null;
  }
}

export function validateSettlementAmount(
  config: ArcSettlementConfigRow,
  amountMicroUsdc: bigint,
): { ok: true } | { ok: false; code: string } {
  if (amountMicroUsdc <= BigInt(0)) {
    return { ok: false, code: "settlement_invalid_amount" };
  }
  if (amountMicroUsdc < BigInt(config.minimum_amount_micro_usdc)) {
    return { ok: false, code: "settlement_amount_below_minimum" };
  }
  if (amountMicroUsdc > BigInt(config.maximum_amount_micro_usdc)) {
    return { ok: false, code: "settlement_amount_above_maximum" };
  }
  return { ok: true };
}

export function addressesEqual(a: string, b: string): boolean {
  const na = normalizeEvmAddress(a);
  const nb = normalizeEvmAddress(b);
  if (!na || !nb) return false;
  return na.toLowerCase() === nb.toLowerCase();
}

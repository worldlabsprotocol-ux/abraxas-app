// FILE: lib/cielo/treasury.ts
// Cielo USDC treasury config for Sui payments.

import { getSponsorAddressFromEnv } from "@/lib/sui/passportIssuer";

export function getCieloTreasuryAddress(): string | null {
  const explicit = process.env.SUI_TREASURY_ADDRESS?.trim();
  if (explicit) return explicit;
  return getSponsorAddressFromEnv();
}

export function getCieloTreasuryLabel(): string {
  return process.env.NEXT_PUBLIC_CIRCUIT_WALLET ?? "circuit.skr";
}

export function getUsdcCoinType(): string | null {
  const t = process.env.SUI_USDC_COIN_TYPE?.trim();
  return t || null;
}

export function getSuiNetwork(): string {
  return process.env.SUI_NETWORK ?? "devnet";
}

export function usdcBaseUnits(humanAmount: number): bigint {
  return BigInt(Math.round(humanAmount * 1_000_000));
}

export function humanUsdcFromBaseUnits(base: bigint): number {
  return Number(base) / 1_000_000;
}

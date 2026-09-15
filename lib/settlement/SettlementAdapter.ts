// FILE: lib/settlement/SettlementAdapter.ts
// Chain independent settlement adapter interface.

import type { SignedSettlementAuthorization } from "@/lib/settlement/types";

export interface SettlementAdapterPrepareInput {
  chainId: number;
  contractAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  explorerBaseUrl: string;
  testnet: boolean;
}

export interface SettlementTransactionView {
  transactionHash: string;
  blockNumber: number | null;
  explorerUrl: string;
  confirmed: boolean;
}

export interface SettlementAdapter {
  readonly chainId: number;
  readonly networkLabel: string;
  readonly testnet: boolean;
  readonly usdcTokenAddress: `0x${string}`;
  readonly explorerBaseUrl: string;

  formatMicroUsdc(amountMicroUsdc: bigint): string;
  parseUsdcToMicro(amount: string): bigint;
  buildExplorerTxUrl(transactionHash: string): string;
  buildContractExplorerUrl(contractAddress: string): string;
  getSettlementContractAbi(): readonly Record<string, unknown>[];
  verifyTransactionConfirmed(transactionHash: string): Promise<SettlementTransactionView | null>;
}

export interface SettlementAdapterFactory {
  create(config: SettlementAdapterPrepareInput): SettlementAdapter;
}

const MICRO_USDC = BigInt(1_000_000);

export function microUsdcToDisplay(amountMicroUsdc: bigint, decimals = 6): string {
  const whole = amountMicroUsdc / MICRO_USDC;
  const fraction = amountMicroUsdc % MICRO_USDC;
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionStr.length > 0 ? `${whole}.${fractionStr}` : whole.toString();
}

export function displayUsdcToMicro(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("invalid_usdc_amount");
  }
  const [whole, fraction = ""] = trimmed.split(".");
  const fractionPadded = fraction.padEnd(6, "0").slice(0, 6);
  return BigInt(whole) * MICRO_USDC + BigInt(fractionPadded || "0");
}

export type { SignedSettlementAuthorization };

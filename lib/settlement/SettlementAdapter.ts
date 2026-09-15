// FILE: lib/settlement/SettlementAdapter.ts
// Chain independent settlement adapter interface.

import { parseUsdcAmountMicro, formatUsdcAmountMicro } from "@/lib/settlement/usdcAmount";

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

export function microUsdcToDisplay(amountMicroUsdc: bigint): string {
  return formatUsdcAmountMicro(amountMicroUsdc);
}

export function displayUsdcToMicro(amount: string): bigint {
  const parsed = parseUsdcAmountMicro(amount);
  if (!parsed.ok) throw new Error("invalid_usdc_amount");
  return parsed.amountMicroUsdc;
}

export type { SignedSettlementAuthorization };

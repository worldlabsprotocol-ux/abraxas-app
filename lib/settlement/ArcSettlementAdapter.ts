// FILE: lib/settlement/ArcSettlementAdapter.ts
// Arc Testnet settlement adapter. Production Arc is not supported.

import { createPublicClient, http, type Hex } from "viem";
import {
  ARC_ENVIRONMENTS,
  ARC_TESTNET_CHAIN_ID,
  type ArcEnvironment,
} from "@/lib/settlement/constants";
import type {
  SettlementAdapter,
  SettlementAdapterPrepareInput,
  SettlementTransactionView,
} from "@/lib/settlement/SettlementAdapter";
import { microUsdcToDisplay, displayUsdcToMicro } from "@/lib/settlement/SettlementAdapter";
import { PROOF_GATED_SETTLEMENT_ABI } from "@/lib/settlement/contractAbi";

export function resolveArcEnvironment(env: string): ArcEnvironment | null {
  if (env === "arc_testnet") return "arc_testnet";
  return null;
}

export class ArcSettlementAdapter implements SettlementAdapter {
  readonly chainId: number;
  readonly networkLabel: string;
  readonly testnet: boolean;
  readonly usdcTokenAddress: `0x${string}`;
  readonly explorerBaseUrl: string;
  readonly rpcUrl: string;
  readonly contractAddress: `0x${string}`;

  constructor(input: SettlementAdapterPrepareInput & { rpcUrl: string; networkLabel: string }) {
    this.chainId = input.chainId;
    this.contractAddress = input.contractAddress;
    this.usdcTokenAddress = input.tokenAddress;
    this.explorerBaseUrl = input.explorerBaseUrl;
    this.rpcUrl = input.rpcUrl;
    this.networkLabel = input.networkLabel;
    this.testnet = input.testnet;
  }

  formatMicroUsdc(amountMicroUsdc: bigint): string {
    return microUsdcToDisplay(amountMicroUsdc);
  }

  parseUsdcToMicro(amount: string): bigint {
    return displayUsdcToMicro(amount);
  }

  buildExplorerTxUrl(transactionHash: string): string {
    return `${this.explorerBaseUrl}/tx/${transactionHash}`;
  }

  buildContractExplorerUrl(contractAddress: string): string {
    return `${this.explorerBaseUrl}/address/${contractAddress}`;
  }

  getSettlementContractAbi(): readonly Record<string, unknown>[] {
    return PROOF_GATED_SETTLEMENT_ABI;
  }

  async verifyTransactionConfirmed(transactionHash: string): Promise<SettlementTransactionView | null> {
    const client = createPublicClient({
      transport: http(this.rpcUrl),
    });
    try {
      const receipt = await client.getTransactionReceipt({ hash: transactionHash as Hex });
      if (!receipt || receipt.status !== "success") {
        return {
          transactionHash,
          blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
          explorerUrl: this.buildExplorerTxUrl(transactionHash),
          confirmed: false,
        };
      }
      return {
        transactionHash,
        blockNumber: Number(receipt.blockNumber),
        explorerUrl: this.buildExplorerTxUrl(transactionHash),
        confirmed: true,
      };
    } catch {
      return null;
    }
  }
}

export function createArcSettlementAdapter(
  arcEnvironment: ArcEnvironment,
  contractAddress: `0x${string}`,
): ArcSettlementAdapter {
  const env = ARC_ENVIRONMENTS[arcEnvironment];
  if (!env) {
    throw new Error("arc_environment_unsupported");
  }
  return new ArcSettlementAdapter({
    chainId: env.chainId,
    contractAddress,
    tokenAddress: env.usdcTokenAddress,
    explorerBaseUrl: env.explorerUrl,
    rpcUrl: env.rpcUrl,
    networkLabel: env.label,
    testnet: env.testnet,
  });
}

export function assertArcTestnetChainId(chainId: number): void {
  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error("arc_testnet_chain_required");
  }
}

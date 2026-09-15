// FILE: lib/settlement/arcRpc.server.ts
// Server controlled Arc Testnet RPC access. Never accept RPC URLs from clients.

import "server-only";

import {
  createPublicClient,
  http,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { ARC_ENVIRONMENTS, ARC_TESTNET_CHAIN_ID } from "@/lib/settlement/constants";

const DEFAULT_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

function resolveArcRpcUrl(): string {
  const configured = process.env.ARC_TESTNET_RPC_URL?.trim();
  if (configured) {
    if (!configured.startsWith("https://")) {
      throw new Error("settlement_rpc_invalid");
    }
    return configured;
  }
  return ARC_ENVIRONMENTS.arc_testnet.rpcUrl;
}

export function createArcPublicClient(): PublicClient {
  const rpcUrl = resolveArcRpcUrl();
  return createPublicClient({
    transport: http(rpcUrl, {
      timeout: DEFAULT_TIMEOUT_MS,
      retryCount: 0,
    }),
    chain: {
      id: ARC_TESTNET_CHAIN_ID,
      name: "Arc Testnet",
      nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    },
  });
}

export async function withArcRpcRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("settlement_rpc_unavailable");
}

export async function fetchArcTransactionReceipt(
  transactionHash: Hex,
): Promise<TransactionReceipt | null> {
  const client = createArcPublicClient();
  return withArcRpcRetry(async () => {
    const receipt = await client.getTransactionReceipt({ hash: transactionHash });
    return receipt ?? null;
  }).catch(() => null);
}

export async function fetchArcChainId(): Promise<number | null> {
  const client = createArcPublicClient();
  try {
    return await withArcRpcRetry(() => client.getChainId());
  } catch {
    return null;
  }
}

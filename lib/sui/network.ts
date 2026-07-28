// FILE: lib/sui/network.ts
// Network-aware Sui RPC, explorer, and zkLogin prover config.

import { getFullnodeUrl } from "@mysten/sui/client";

export type SuiNetwork = "devnet" | "testnet" | "mainnet";

export function getSuiNetwork(): SuiNetwork {
  const raw =
    process.env.SUI_NETWORK ??
    process.env.NEXT_PUBLIC_SUI_NETWORK ??
    "devnet";
  if (raw === "mainnet" || raw === "testnet") return raw;
  return "devnet";
}

export function getSuiRpcUrl(): string {
  const explicit =
    process.env.SUI_RPC_URL?.trim()
    ?? process.env.NEXT_PUBLIC_SUI_RPC_URL?.trim();
  if (explicit) return explicit;
  const network = getSuiNetwork();
  return getFullnodeUrl(network);
}

/** Sui Foundation GraphQL — reliable for epoch reads when JSON-RPC is unavailable. */
export function getSuiGraphqlUrl(): string {
  const explicit = process.env.SUI_GRAPHQL_URL?.trim();
  if (explicit) return explicit;
  const network = getSuiNetwork();
  return `https://graphql.${network}.sui.io/graphql`;
}

export function getSuiExplorerTxBase(): string {
  const explicit = process.env.SUI_EXPLORER_TX_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const network = getSuiNetwork();
  if (network === "mainnet") return "https://suiscan.xyz/mainnet/tx";
  if (network === "testnet") return "https://suiscan.xyz/testnet/tx";
  return "https://suiscan.xyz/devnet/tx";
}

export function suiExplorerTxUrl(digest: string): string {
  return `${getSuiExplorerTxBase()}/${digest}`;
}

/** Mysten prover — devnet/testnet use prover-dev; mainnet uses production prover. */
export function getZkLoginProverUrl(): string {
  const explicit =
    process.env.ZKLOGIN_PROVER_URL?.trim() ??
    process.env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL?.trim();
  if (explicit) return explicit;

  return getSuiNetwork() === "mainnet"
    ? "https://prover.mystenlabs.com/v1"
    : "https://prover-dev.mystenlabs.com/v1";
}

export function getPublicSuiConfig() {
  const network = getSuiNetwork();
  return {
    network,
    rpc_configured: Boolean(
      process.env.SUI_RPC_URL?.trim() || process.env.NEXT_PUBLIC_SUI_RPC_URL?.trim(),
    ),
    explorer_tx_base: getSuiExplorerTxBase(),
    is_mainnet: network === "mainnet",
  };
}

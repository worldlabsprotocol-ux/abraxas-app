// FILE: lib/auth/passportSolanaAuth/network.ts

import { getVercelDeploymentEnv } from "@/lib/app/publicAppOrigin";

const ALLOWED = new Set(["mainnet-beta", "devnet", "testnet"]);

export function canonicalizeSolanaNetwork(input: string): string | null {
  const trimmed = input.trim();
  if (!ALLOWED.has(trimmed)) return null;
  return trimmed;
}

export function resolveAuthorizedSolanaNetworkFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_SOLANA_NETWORK?.trim()
    ?? process.env.NEXT_PUBLIC_PASSPORT_SOLANA_NETWORK?.trim();
  const deploymentEnv = getVercelDeploymentEnv();
  if (!raw) {
    if (deploymentEnv === "development") return "devnet";
    if (deploymentEnv === "production" || process.env.VERCEL_ENV === "production") {
      return "mainnet-beta";
    }
    return null;
  }
  return canonicalizeSolanaNetwork(raw);
}

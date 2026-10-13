// FILE: lib/auth/passportEvmAuth/network.ts

import { getVercelDeploymentEnv } from "@/lib/app/publicAppOrigin";

export function resolveAuthorizedEvmChainIdFromEnv(): number | null {
  const raw = process.env.NEXT_PUBLIC_EVM_CHAIN_ID?.trim()
    ?? process.env.NEXT_PUBLIC_PASSPORT_EVM_CHAIN_ID?.trim();
  const deploymentEnv = getVercelDeploymentEnv();

  if (!raw) {
    if (deploymentEnv === "development") return 1;
    return null;
  }

  const chainId = Number.parseInt(raw, 10);
  if (!Number.isFinite(chainId) || chainId <= 0) return null;
  return chainId;
}

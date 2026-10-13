// FILE: lib/auth/passportWalletAuth/network.ts

import { getVercelDeploymentEnv } from "@/lib/app/publicAppOrigin";

export const SUPPORTED_SUI_NETWORK_IDS = [
  "sui:mainnet",
  "sui:testnet",
  "sui:devnet",
  "sui:localnet",
] as const;

export type SupportedSuiNetworkId = (typeof SUPPORTED_SUI_NETWORK_IDS)[number];

const BARE_NETWORK_ALIASES: Record<string, SupportedSuiNetworkId> = {
  mainnet: "sui:mainnet",
  testnet: "sui:testnet",
  devnet: "sui:devnet",
  localnet: "sui:localnet",
};

/**
 * Strict allowlist — exact `sui:<tier>` or bare tier alias only (no prefix extensions).
 */
const EXACT_SUI_NETWORK = /^sui:(mainnet|testnet|devnet|localnet)$/;

export function canonicalizeSupportedSuiNetwork(input: string): SupportedSuiNetworkId | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length !== input.length) return null;

  const lower = trimmed.toLowerCase();
  const exact = lower.match(EXACT_SUI_NETWORK);
  if (exact) {
    return `sui:${exact[1]}` as SupportedSuiNetworkId;
  }

  if (lower.startsWith("sui:")) {
    return null;
  }

  return BARE_NETWORK_ALIASES[lower] ?? null;
}

export type DeploymentSuiNetworkPolicy =
  | { ok: true; network: SupportedSuiNetworkId }
  | { ok: false; code: "network_config_invalid" };

/**
 * Resolve deployment-authorized Sui network from env.
 * Local development may omit NEXT_PUBLIC_SUI_NETWORK (defaults to sui:devnet).
 * Preview and Production require an explicit valid network — no silent fallback.
 */
export function resolveDeploymentSuiNetworkPolicy(): DeploymentSuiNetworkPolicy {
  const raw = process.env.NEXT_PUBLIC_SUI_NETWORK?.trim();
  const deploymentEnv = getVercelDeploymentEnv();

  if (!raw) {
    if (deploymentEnv === "development") {
      return { ok: true, network: "sui:devnet" };
    }
    return { ok: false, code: "network_config_invalid" };
  }

  const canonical = canonicalizeSupportedSuiNetwork(raw);
  if (!canonical) {
    return { ok: false, code: "network_config_invalid" };
  }

  return { ok: true, network: canonical };
}

export function resolveAuthorizedSuiNetworkFromEnv(): SupportedSuiNetworkId | null {
  const policy = resolveDeploymentSuiNetworkPolicy();
  return policy.ok ? policy.network : null;
}

/** @deprecated use resolveDeploymentSuiNetworkPolicy */
export function resolveExpectedSuiNetworkFromEnv(): SupportedSuiNetworkId | null {
  return resolveAuthorizedSuiNetworkFromEnv();
}

export function isSupportedSuiNetwork(chain: string): boolean {
  return canonicalizeSupportedSuiNetwork(chain) !== null;
}

/** Network must be on the allowlist and match this deployment's configured Sui network. */
export function networkMatchesDeploymentPolicy(chain: string): boolean {
  const policy = resolveDeploymentSuiNetworkPolicy();
  if (!policy.ok) return false;
  const canonical = canonicalizeSupportedSuiNetwork(chain);
  if (!canonical) return false;
  return canonical === policy.network;
}

export type NetworkTripleValidation =
  | { ok: true; network: SupportedSuiNetworkId }
  | { ok: false; code: "wrong_network" | "network_config_invalid" };

/** Require exact agreement: challenged (stored), submitted (client), authorized (env). */
export function validatePassportWalletNetworkTriple(input: {
  challengedNetwork: string;
  submittedNetwork: string;
}): NetworkTripleValidation {
  const policy = resolveDeploymentSuiNetworkPolicy();
  if (!policy.ok) {
    return policy;
  }
  const authorized = policy.network;
  const challenged = canonicalizeSupportedSuiNetwork(input.challengedNetwork);
  const submitted = canonicalizeSupportedSuiNetwork(input.submittedNetwork);

  if (!challenged || !submitted) {
    return { ok: false, code: "wrong_network" };
  }

  if (challenged !== authorized || submitted !== authorized || challenged !== submitted) {
    return { ok: false, code: "wrong_network" };
  }

  return { ok: true, network: authorized };
}

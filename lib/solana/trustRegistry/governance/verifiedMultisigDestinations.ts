import { PublicKey } from "@solana/web3.js";

/** Founder-controlled allowlist for devnet governance nomination targets (Squads vault PDAs, etc.). */
export const VERIFIED_DEVNET_MULTISIG_DESTINATIONS: readonly string[] = [
  // Populate after Squads devnet multisig creation — never nominate to unverified pubkeys in production flows.
];

export type MultisigDestinationVerification =
  | { ok: true; destination: string; source: "allowlist" | "env_override" }
  | { ok: false; destination: string; reason: string };

export function parseVerifiedMultisigDestinationsFromEnv(envValue: string | undefined): string[] {
  if (!envValue?.trim()) return [];
  return envValue
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function verifyMultisigDestination(
  destination: string,
  options?: { envAllowlist?: string },
): MultisigDestinationVerification {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(destination);
  } catch {
    return { ok: false, destination, reason: "invalid_pubkey" };
  }
  if (pubkey.equals(PublicKey.default)) {
    return { ok: false, destination: pubkey.toBase58(), reason: "default_pubkey" };
  }

  const envList = parseVerifiedMultisigDestinationsFromEnv(options?.envAllowlist);
  const combined = new Set([...VERIFIED_DEVNET_MULTISIG_DESTINATIONS, ...envList]);
  if (combined.size === 0) {
    return {
      ok: false,
      destination: pubkey.toBase58(),
      reason: "no_verified_multisig_destinations_configured",
    };
  }
  if (!combined.has(pubkey.toBase58())) {
    return { ok: false, destination: pubkey.toBase58(), reason: "destination_not_in_verified_allowlist" };
  }
  return {
    ok: true,
    destination: pubkey.toBase58(),
    source: envList.includes(pubkey.toBase58()) ? "env_override" : "allowlist",
  };
}

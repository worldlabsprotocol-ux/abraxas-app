import { parseVerifiedMultisigDestinationsFromEnv } from "@/lib/solana/trustRegistry/governance/verifiedMultisigDestinations";

/** Minimum vault balance (lamports) before treating custody as execution-ready on devnet. */
export const INSTITUTIONAL_VAULT_MIN_LAMPORTS = 1_000_000;

export type InstitutionalCustodyEnvConfig = {
  protocolUpgradeMultisigPda: string | null;
  registryAdminMultisigPda: string | null;
  protocolUpgradeVaultIndex: number;
  registryAdminVaultIndex: number;
  /** Expected vault PDAs (allowlist) — may be derived from multisig + index when multisig PDAs are set. */
  verifiedVaultPdas: string[];
  verifiedProtocolUpgradeVaultPda: string | null;
  verifiedRegistryAdminVaultPda: string | null;
  squadsMemberPubkeysDocumented: string[];
  squadsThresholdDocumented: number | null;
};

function parseVaultIndex(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 255) return fallback;
  return n;
}

/**
 * Founder-controlled configuration for dual Squads v4 custody (Build #539).
 * No private keys — pubkeys and PDAs only.
 */
export function parseInstitutionalCustodyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): InstitutionalCustodyEnvConfig {
  const verifiedVaultPdas = [
    ...parseVerifiedMultisigDestinationsFromEnv(env.ABRAXAS_VERIFIED_MULTISIG_DESTINATIONS),
    ...(env.ABRAXAS_VERIFIED_PROTOCOL_UPGRADE_VAULT_PDA?.trim()
      ? [env.ABRAXAS_VERIFIED_PROTOCOL_UPGRADE_VAULT_PDA.trim()]
      : []),
    ...(env.ABRAXAS_VERIFIED_REGISTRY_ADMIN_VAULT_PDA?.trim()
      ? [env.ABRAXAS_VERIFIED_REGISTRY_ADMIN_VAULT_PDA.trim()]
      : []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const members = (env.ABRAXAS_SQUADS_MEMBER_PUBKEYS ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const threshold = env.ABRAXAS_SQUADS_THRESHOLD?.trim()
    ? Number(env.ABRAXAS_SQUADS_THRESHOLD)
    : null;

  const verifiedProtocolUpgradeVaultPda =
    env.ABRAXAS_VERIFIED_PROTOCOL_UPGRADE_VAULT_PDA?.trim() || verifiedVaultPdas[0] || null;
  const verifiedRegistryAdminVaultPda =
    env.ABRAXAS_VERIFIED_REGISTRY_ADMIN_VAULT_PDA?.trim() || verifiedVaultPdas[1] || null;

  return {
    protocolUpgradeMultisigPda: env.ABRAXAS_PROTOCOL_UPGRADE_MULTISIG_PDA?.trim() || null,
    registryAdminMultisigPda: env.ABRAXAS_REGISTRY_ADMIN_MULTISIG_PDA?.trim() || null,
    protocolUpgradeVaultIndex: parseVaultIndex(env.ABRAXAS_PROTOCOL_UPGRADE_VAULT_INDEX, 0),
    registryAdminVaultIndex: parseVaultIndex(env.ABRAXAS_REGISTRY_ADMIN_VAULT_INDEX, 0),
    verifiedVaultPdas,
    verifiedProtocolUpgradeVaultPda,
    verifiedRegistryAdminVaultPda,
    squadsMemberPubkeysDocumented: members,
    squadsThresholdDocumented: threshold,
  };
}

/**
 * Institutional custody domains (Build #538).
 * Protocol upgrades and registry administration MUST NOT share a single operational hot wallet at steady state.
 * Operational publisher/revoker keys remain outside both multisig domains.
 */

export type AuthorityDomainId =
  | "protocol_upgrade"
  | "registry_administration"
  | "operational_publisher";

export type AuthorityDomainSpec = {
  id: AuthorityDomainId;
  label: string;
  intendedCustody: "squads_v4_multisig_vault" | "operational_hot_signer";
  /** Squads vault PDA once provisioned — null until founder-authorized activation. */
  configuredVaultPda: string | null;
  threshold: number | null;
  memberCount: number | null;
  notes: string[];
};

export const OPERATIONAL_PUBLISHER_SCOPE =
  "Policy/commitment publish and authorized revoke under current on-chain governance authority — not program upgrade or governance transfer." as const;

export function defaultInstitutionalAuthorityDomains(): Record<AuthorityDomainId, AuthorityDomainSpec> {
  return {
    protocol_upgrade: {
      id: "protocol_upgrade",
      label: "Protocol upgrade authority (BPF Upgradeable Loader)",
      intendedCustody: "squads_v4_multisig_vault",
      configuredVaultPda: null,
      threshold: null,
      memberCount: null,
      notes: [
        "Controls SetAuthority on program data for EN29YNgH… trust registry.",
        "Must be disjoint from registry administration vault.",
      ],
    },
    registry_administration: {
      id: "registry_administration",
      label: "Registry governance authority (in-program)",
      intendedCustody: "squads_v4_multisig_vault",
      configuredVaultPda: null,
      threshold: null,
      memberCount: null,
      notes: [
        "Nominate/accept/cancel governance transfer after layout extend.",
        "Accept requires vault PDA signer via Squads execute path.",
      ],
    },
    operational_publisher: {
      id: "operational_publisher",
      label: "Operational publisher / revoker",
      intendedCustody: "operational_hot_signer",
      configuredVaultPda: null,
      threshold: null,
      memberCount: null,
      notes: [OPERATIONAL_PUBLISHER_SCOPE],
    },
  };
}

export function mergeConfiguredVaults(
  base: Record<AuthorityDomainId, AuthorityDomainSpec>,
  config: {
    protocolUpgradeVaultPda?: string | null;
    registryAdministrationVaultPda?: string | null;
    protocolUpgradeThreshold?: number | null;
    registryAdministrationThreshold?: number | null;
    protocolUpgradeMembers?: number | null;
    registryAdministrationMembers?: number | null;
  },
): Record<AuthorityDomainId, AuthorityDomainSpec> {
  return {
    ...base,
    protocol_upgrade: {
      ...base.protocol_upgrade,
      configuredVaultPda: config.protocolUpgradeVaultPda ?? null,
      threshold: config.protocolUpgradeThreshold ?? null,
      memberCount: config.protocolUpgradeMembers ?? null,
    },
    registry_administration: {
      ...base.registry_administration,
      configuredVaultPda: config.registryAdministrationVaultPda ?? null,
      threshold: config.registryAdministrationThreshold ?? null,
      memberCount: config.registryAdministrationMembers ?? null,
    },
    operational_publisher: base.operational_publisher,
  };
}

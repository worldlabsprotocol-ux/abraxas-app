import { describe, expect, it } from "vitest";
import { SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import { runSquadsV4CustodyPreflight } from "@/lib/solana/trustRegistry/governance/squadsV4CustodyPreflight";
import type { SquadsV4MultisigObservation } from "@/lib/solana/trustRegistry/governance/observeSquadsV4Multisig";

function mockObs(overrides: Partial<SquadsV4MultisigObservation> & Pick<SquadsV4MultisigObservation, "multisigPda" | "derivedVaultPda">): SquadsV4MultisigObservation {
  return {
    schema: "squads_v4_multisig_observation_v539",
    vaultIndex: 0,
    squadsProgramId: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
    accountOwner: "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf",
    accountPresent: true,
    threshold: 2,
    memberCount: 3,
    members: [
      { pubkey: "A1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      { pubkey: "A2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      { pubkey: "A3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
    ],
    sdkVaultPda: overrides.derivedVaultPda,
    vaultPdaDerivationMatchesSdk: true,
    expectedVaultPda: overrides.derivedVaultPda,
    vaultPdaMatchesExpected: true,
    vaultLamports: 2_000_000,
    vaultOwner: "11111111111111111111111111111111",
    createKey: "11111111111111111111111111111112",
    configAuthority: "11111111111111111111111111111112",
    errors: [],
    ...overrides,
  };
}

describe("Squads v4 custody preflight (Build #539)", () => {
  it("passes for disjoint healthy multisigs on devnet genesis", () => {
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
      members: [
        { pubkey: "P1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "P2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "P3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      ],
    });
    const registry = mockObs({
      multisigPda: "Reg11111111111111111111111111111111111111",
      derivedVaultPda: "VaultR111111111111111111111111111111111111",
      members: [
        { pubkey: "R1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      ],
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: registry,
      env: {
        protocolUpgradeMultisigPda: protocol.multisigPda,
        registryAdminMultisigPda: registry.multisigPda,
        protocolUpgradeVaultIndex: 0,
        registryAdminVaultIndex: 0,
        verifiedVaultPdas: [protocol.derivedVaultPda, registry.derivedVaultPda],
        squadsMemberPubkeysDocumented: ["P1", "P2", "P3", "R1", "R2", "R3"],
        squadsThresholdDocumented: 2,
      },
    });
    expect(result.ok).toBe(true);
  });

  it("blocks vault substitution", () => {
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
      expectedVaultPda: "Wrong111111111111111111111111111111111111",
      vaultPdaMatchesExpected: false,
      errors: ["vault_pda_substitution_detected"],
    });
    const registry = mockObs({
      multisigPda: "Reg11111111111111111111111111111111111111",
      derivedVaultPda: "VaultR111111111111111111111111111111111111",
      members: [
        { pubkey: "R1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      ],
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: registry,
    });
    expect(result.ok).toBe(false);
    expect(result.blockers.some((b) => b.includes("vault_allowlist_mismatch"))).toBe(true);
  });

  it("blocks common custody concentration", () => {
    const sharedVault = "Shared111111111111111111111111111111111111";
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: sharedVault,
      members: [
        { pubkey: "P1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "P2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "P3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      ],
    });
    const registry = mockObs({
      multisigPda: "Reg11111111111111111111111111111111111111",
      derivedVaultPda: sharedVault,
      members: [
        { pubkey: "R1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
        { pubkey: "R3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      ],
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: registry,
    });
    expect(result.blockers).toContain("common_custody_vault_concentration");
  });

  it("blocks wrong cluster genesis", () => {
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: "wrong-genesis",
      protocolUpgrade: protocol,
      registryAdministration: null,
    });
    expect(result.blockers).toContain("cluster_genesis_not_devnet");
  });

  it("blocks insufficient quorum threshold", () => {
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
      threshold: 1,
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: null,
    });
    expect(result.blockers.some((b) => b.includes("threshold_below_minimum"))).toBe(true);
  });

  it("blocks incorrect vault index derivation mismatch", () => {
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
      vaultPdaDerivationMatchesSdk: false,
      errors: ["local_vault_pda_differs_from_sqds_sdk"],
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: null,
    });
    expect(result.blockers.some((b) => b.includes("vault_derivation_sdk_mismatch"))).toBe(true);
  });

  it("blocks identical member sets across domains", () => {
    const members = [
      { pubkey: "S1", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      { pubkey: "S2", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
      { pubkey: "S3", permissionsMask: 7, hasInitiate: true, hasVote: true, hasExecute: true },
    ];
    const protocol = mockObs({
      multisigPda: "Prot1111111111111111111111111111111111111",
      derivedVaultPda: "VaultP111111111111111111111111111111111111",
      members,
    });
    const registry = mockObs({
      multisigPda: "Reg11111111111111111111111111111111111111",
      derivedVaultPda: "VaultR111111111111111111111111111111111111",
      members,
    });
    const result = runSquadsV4CustodyPreflight({
      clusterGenesisHash: SOLANA_DEVNET_GENESIS_HASH,
      protocolUpgrade: protocol,
      registryAdministration: registry,
    });
    expect(result.blockers).toContain("identical_member_sets_across_domains");
  });
});

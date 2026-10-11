// Machine-verifiable Solana mainnet governance evidence — no self-reported PASS env flags.

import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { inspectProgram, SOLANA_DEVNET_GENESIS_HASH } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import type { PublicSolanaAccountSource, PublicSolanaGenesisSource } from "@/lib/partner/testnetGateDeploymentKit/solanaDevnetChainPrecheck";
import { observeSolanaDualRpc, type DualRpcObservation } from "@/lib/institutional/solanaDualRpcObservation";

export const SOLANA_MAINNET_GENESIS_HASH = "5eykt4UsFv8P8NJdTREpY1vzqKqZKQdp4v7D4bon8SegG59Q1Q3kEk8";

export type GovernanceEvidenceSource =
  | "local_assertion"
  | "rpc_observation"
  | "independent_rpc"
  | "registry_contract";

export type GovernanceEvidenceOutcome = "PASS" | "FAIL" | "BLOCKED";

export type SolanaGovernanceEvidence = {
  id: string;
  label: string;
  source: GovernanceEvidenceSource;
  observed_at: string;
  environment: "mainnet_governance_preflight" | "devnet_cross_check";
  outcome: GovernanceEvidenceOutcome;
  detail: string;
  evidence_ref: string;
};

export type SolanaMainnetGovernanceReport = {
  schema: "solana_mainnet_governance_verifier_v1";
  overall: GovernanceEvidenceOutcome;
  mainnet_issuance_disabled: boolean;
  devnet_proof_sufficient_for_mainnet: false;
  rpc_cluster_agreement: boolean | null;
  live_dual_rpc_observation: DualRpcObservation | null;
  evidence: SolanaGovernanceEvidence[];
  emergency_disable_ref: string;
};

const EMERGENCY_DISABLE_REF = "lib/partner/networkCapability/registry#mainnet_disabled";

export type SolanaGovernanceVerifierDeps = {
  now?: Date;
  primaryGenesis?: PublicSolanaGenesisSource;
  independentGenesis?: PublicSolanaGenesisSource;
  readAccount?: PublicSolanaAccountSource;
  reviewedProgramId?: string;
  expectedElfSha256?: string;
  upgradeAuthorityObserved?: string | null;
  expectedUpgradeAuthority?: string | null;
  receiptCommitmentSampleOk?: boolean | null;
  registryApprovalProvenanceOk?: boolean | null;
  signerCustodyDocumented?: boolean;
  signerRotationDocumented?: boolean;
  finalizedConfirmationPolicyDocumented?: boolean;
};

function item(
  partial: Omit<SolanaGovernanceEvidence, "observed_at"> & { now: Date },
): SolanaGovernanceEvidence {
  return { ...partial, observed_at: partial.now.toISOString() };
}

export async function runSolanaMainnetGovernanceVerification(
  deps: SolanaGovernanceVerifierDeps = {},
): Promise<SolanaMainnetGovernanceReport> {
  const now = deps.now ?? new Date();
  const evidence: SolanaGovernanceEvidence[] = [];
  const mainnetCap = getNetworkCapability("solana_mainnet");
  const mainnetEnabled = mainnetCap?.status === "available" || mainnetCap?.status === "configured";

  evidence.push(item({
    now,
    id: "mainnet_issuance_product_gate",
    label: "Mainnet issuance disabled in product",
    source: "local_assertion",
    environment: "mainnet_governance_preflight",
    outcome: mainnetEnabled ? "FAIL" : "PASS",
    detail: mainnetCap?.status ?? "unknown",
    evidence_ref: EMERGENCY_DISABLE_REF,
  }));

  const primaryRpc = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() ?? "";
  const independentRpc = process.env.ABRAXAS_SOLANA_INDEPENDENT_RPC_URL?.trim() ?? "";
  const programId = process.env.ABRAXAS_SOLANA_GATE_PROGRAM_ID?.trim() || SOLANA_GATE_V2_RELEASE.program_id;

  let liveObservation: DualRpcObservation | null = null;
  if (primaryRpc && !deps.primaryGenesis) {
    try {
      liveObservation = await observeSolanaDualRpc({
        primaryRpcUrl: primaryRpc,
        independentRpcUrl: independentRpc || null,
        programId,
        now,
      });
    } catch {
      liveObservation = null;
    }
  }

  if (liveObservation) {
    evidence.push(item({
      now,
      id: "primary_rpc",
      label: "Primary observation RPC configured",
      source: "local_assertion",
      environment: "mainnet_governance_preflight",
      outcome: "PASS",
      detail: liveObservation.primary.url_redacted,
      evidence_ref: "ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL",
    }));
    evidence.push(item({
      now,
      id: "rpc_host_independence",
      label: "RPC host independence (hostname-only heuristic)",
      source: "local_assertion",
      environment: "mainnet_governance_preflight",
      outcome: liveObservation.likely_same_operator === true ? "BLOCKED" : liveObservation.independent ? "PASS" : "BLOCKED",
      detail: liveObservation.likely_same_operator === true
        ? "same_host_not_independent"
        : liveObservation.independent
          ? "distinct_hosts_observed"
          : "missing_independent_rpc",
      evidence_ref: "lib/institutional/solanaDualRpcObservation.ts",
    }));
    if (liveObservation.primary_genesis) {
      const isMainnet = liveObservation.primary_genesis === SOLANA_MAINNET_GENESIS_HASH;
      const isDevnet = liveObservation.primary_genesis === SOLANA_DEVNET_GENESIS_HASH;
      evidence.push(item({
        now,
        id: "primary_rpc_cluster",
        label: "Primary RPC cluster genesis verification",
        source: "rpc_observation",
        environment: isMainnet ? "mainnet_governance_preflight" : "devnet_cross_check",
        outcome: liveObservation.cluster === "disagreement" ? "FAIL" : isMainnet || isDevnet ? "PASS" : "FAIL",
        detail: liveObservation.cluster,
        evidence_ref: "getGenesisHash",
      }));
    } else {
      evidence.push(item({
        now,
        id: "primary_rpc_genesis",
        label: "Primary RPC genesis observed",
        source: "rpc_observation",
        environment: "mainnet_governance_preflight",
        outcome: "BLOCKED",
        detail: "rpc_unavailable",
        evidence_ref: liveObservation.primary.url_redacted,
      }));
    }
    if (liveObservation.independent) {
      evidence.push(item({
        now,
        id: "independent_rpc_agreement",
        label: "Independent RPC genesis agreement",
        source: "independent_rpc",
        environment: "mainnet_governance_preflight",
        outcome: liveObservation.genesis_agreement == null ? "BLOCKED" : liveObservation.genesis_agreement ? "PASS" : "FAIL",
        detail: liveObservation.genesis_agreement == null ? "independent_genesis_missing" : liveObservation.genesis_agreement ? "genesis_match" : "rpc_disagreement",
        evidence_ref: liveObservation.independent.url_redacted,
      }));
    }
    if (liveObservation.program) {
      const expectedSha = deps.expectedElfSha256 ?? SOLANA_GATE_V2_RELEASE.elf_sha256;
      const shaMatch = liveObservation.program.elf_sha256?.toLowerCase() === expectedSha.toLowerCase();
      evidence.push(item({
        now,
        id: "program_executable",
        label: "Program account executable and loader-owned",
        source: "rpc_observation",
        environment: "devnet_cross_check",
        outcome: liveObservation.program.executable && liveObservation.program.owner === SOLANA_UPGRADEABLE_LOADER ? "PASS" : "FAIL",
        detail: `executable=${liveObservation.program.executable}`,
        evidence_ref: liveObservation.program.program_id,
      }));
      evidence.push(item({
        now,
        id: "program_elf_digest",
        label: "Deployed program ELF digest vs reviewed artifact",
        source: "rpc_observation",
        environment: "devnet_cross_check",
        outcome: liveObservation.program.elf_sha256 ? (shaMatch ? "PASS" : "FAIL") : "BLOCKED",
        detail: liveObservation.program_elf_agreement === false ? "elf_mismatch_across_rpcs" : liveObservation.program.elf_sha256 ?? "unavailable",
        evidence_ref: SOLANA_GATE_V2_RELEASE.provenance_ref,
      }));
      const expectedUpgrade = process.env.ABRAXAS_SOLANA_EXPECTED_UPGRADE_AUTHORITY?.trim() || deps.expectedUpgradeAuthority;
      if (expectedUpgrade && liveObservation.program.upgrade_authority) {
        evidence.push(item({
          now,
          id: "upgrade_authority_custody",
          label: "Upgrade authority identity vs governance record",
          source: "rpc_observation",
          environment: "mainnet_governance_preflight",
          outcome: liveObservation.program.upgrade_authority === expectedUpgrade ? "PASS" : "FAIL",
          detail: liveObservation.program.upgrade_authority === expectedUpgrade ? "match" : "authority_mismatch",
          evidence_ref: "program_data_upgrade_authority",
        }));
      }
    }
  }

  let rpcClusterAgreement: boolean | null = liveObservation?.genesis_agreement ?? null;
  if (primaryRpc && !liveObservation && !deps.primaryGenesis) {
    evidence.push(item({
      now,
      id: "primary_rpc_live_observation",
      label: "Live primary RPC observation",
      source: "rpc_observation",
      environment: "mainnet_governance_preflight",
      outcome: "BLOCKED",
      detail: "live_observation_failed",
      evidence_ref: "lib/institutional/solanaDualRpcObservation.ts",
    }));
  }
  if (!primaryRpc && !deps.primaryGenesis) {
    evidence.push(item({
      now,
      id: "primary_rpc",
      label: "Primary observation RPC configured",
      source: "local_assertion",
      environment: "mainnet_governance_preflight",
      outcome: "BLOCKED",
      detail: "missing_primary_rpc",
      evidence_ref: "ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL",
    }));
  } else if (!liveObservation && deps.primaryGenesis) {
    const genesis = await deps.primaryGenesis();
    if (!genesis) {
      evidence.push(item({
        now,
        id: "primary_rpc_genesis",
        label: "Primary RPC genesis observed",
        source: "rpc_observation",
        environment: "mainnet_governance_preflight",
        outcome: "BLOCKED",
        detail: "rpc_unavailable",
        evidence_ref: primaryRpc.replace(/\/\/[^@]+@/, "//***@"),
      }));
    } else {
      const isMainnet = genesis === SOLANA_MAINNET_GENESIS_HASH;
      const isDevnet = genesis === SOLANA_DEVNET_GENESIS_HASH;
      evidence.push(item({
        now,
        id: "primary_rpc_cluster",
        label: "Primary RPC cluster genesis verification",
        source: "rpc_observation",
        environment: isMainnet ? "mainnet_governance_preflight" : "devnet_cross_check",
        outcome: isMainnet || isDevnet ? "PASS" : "FAIL",
        detail: isMainnet ? "mainnet_genesis" : isDevnet ? "devnet_genesis_not_mainnet_proof" : "wrong_cluster",
        evidence_ref: "getGenesisHash",
      }));
      if (deps.independentGenesis && independentRpc) {
        const independent = await deps.independentGenesis();
        rpcClusterAgreement = independent != null && genesis === independent;
        evidence.push(item({
          now,
          id: "independent_rpc_agreement",
          label: "Independent RPC genesis agreement",
          source: "independent_rpc",
          environment: "mainnet_governance_preflight",
          outcome: independent == null ? "BLOCKED" : rpcClusterAgreement ? "PASS" : "FAIL",
          detail: independent == null ? "independent_rpc_unavailable" : rpcClusterAgreement ? "genesis_match" : "rpc_disagreement",
          evidence_ref: "ABRAXAS_SOLANA_INDEPENDENT_RPC_URL",
        }));
      } else {
        evidence.push(item({
          now,
          id: "independent_rpc",
          label: "Independent RPC observation",
          source: "independent_rpc",
          environment: "mainnet_governance_preflight",
          outcome: "BLOCKED",
          detail: independentRpc ? "genesis_source_missing" : "missing_independent_rpc",
          evidence_ref: "ABRAXAS_SOLANA_INDEPENDENT_RPC_URL",
        }));
      }
    }
  }

  if (!liveObservation?.program && deps.readAccount && deps.reviewedProgramId) {
    const programState = await inspectProgram(
      {
        programId: deps.reviewedProgramId,
        elfBytes: 278184,
        keccak: SOLANA_GATE_V2_RELEASE.program_data_digest,
        sha256: deps.expectedElfSha256 ?? SOLANA_GATE_V2_RELEASE.elf_sha256,
      },
      deps.readAccount,
    );
    evidence.push(item({
      now,
      id: "program_elf_digest",
      label: "Deployed program ELF digest vs reviewed artifact",
      source: "rpc_observation",
      environment: "devnet_cross_check",
      outcome: programState === "matched" ? "PASS" : programState === "unavailable" ? "BLOCKED" : "FAIL",
      detail: programState,
      evidence_ref: SOLANA_GATE_V2_RELEASE.provenance_ref,
    }));
  } else if (!liveObservation?.program) {
    evidence.push(item({
      now,
      id: "program_elf_digest",
      label: "Deployed program ELF digest vs reviewed artifact",
      source: "rpc_observation",
      environment: "mainnet_governance_preflight",
      outcome: "BLOCKED",
      detail: "observation_not_run",
      evidence_ref: SOLANA_GATE_V2_RELEASE.provenance_ref,
    }));
  }

  const upgradeObserved = liveObservation?.program?.upgrade_authority ?? deps.upgradeAuthorityObserved ?? null;
  const upgradeExpected =
    process.env.ABRAXAS_SOLANA_EXPECTED_UPGRADE_AUTHORITY?.trim()
    || deps.expectedUpgradeAuthority
    || null;
  if (!evidence.some(e => e.id === "upgrade_authority_custody") && upgradeObserved && upgradeExpected) {
    evidence.push(item({
      now,
      id: "upgrade_authority_custody",
      label: "Upgrade authority identity vs governance record",
      source: "rpc_observation",
      environment: "mainnet_governance_preflight",
      outcome: upgradeObserved === upgradeExpected ? "PASS" : "FAIL",
      detail: upgradeObserved === upgradeExpected ? "match" : "authority_mismatch",
      evidence_ref: "program_data_upgrade_authority",
    }));
  } else {
    evidence.push(item({
      now,
      id: "upgrade_authority_custody",
      label: "Upgrade authority identity vs governance record",
      source: "registry_contract",
      environment: "mainnet_governance_preflight",
      outcome: "BLOCKED",
      detail: "missing_upgrade_authority_evidence",
      evidence_ref: "docs/solana-devnet-config-preflight.md",
    }));
  }

  evidence.push(item({
    now,
    id: "signer_custody",
    label: "Chain attestation signer custody controls",
    source: "registry_contract",
    environment: "mainnet_governance_preflight",
    outcome: deps.signerCustodyDocumented ? "PASS" : "BLOCKED",
    detail: deps.signerCustodyDocumented ? "documented" : "signer_unavailable",
    evidence_ref: "lib/partner/chainAttestation/signerLifecycle",
  }));

  evidence.push(item({
    now,
    id: "signer_rotation",
    label: "Signer rotation procedure",
    source: "local_assertion",
    environment: "mainnet_governance_preflight",
    outcome: deps.signerRotationDocumented ? "PASS" : "FAIL",
    detail: deps.signerRotationDocumented ? "documented" : "missing_runbook",
    evidence_ref: "lib/partner/chainAttestation/signerLifecycle",
  }));

  evidence.push(item({
    now,
    id: "finalized_confirmation",
    label: "Finalized transaction confirmation policy",
    source: "local_assertion",
    environment: "mainnet_governance_preflight",
    outcome: deps.finalizedConfirmationPolicyDocumented ? "PASS" : "FAIL",
    detail: deps.finalizedConfirmationPolicyDocumented ? "documented" : "missing_policy",
    evidence_ref: "lib/decisionReceipts/solanaCommitment/config",
  }));

  evidence.push(item({
    now,
    id: "registry_provenance",
    label: "Deployment registry approval provenance",
    source: "registry_contract",
    environment: "mainnet_governance_preflight",
    outcome: deps.registryApprovalProvenanceOk === true ? "PASS" : deps.registryApprovalProvenanceOk === false ? "FAIL" : "BLOCKED",
    detail: deps.registryApprovalProvenanceOk === true ? "provenance_ok" : deps.registryApprovalProvenanceOk === false ? "provenance_mismatch" : "requires_operator_verification",
    evidence_ref: "lib/partner/onchainGateDeployments",
  }));

  evidence.push(item({
    now,
    id: "receipt_commitment_consistency",
    label: "Receipt-to-chain commitment consistency",
    source: "rpc_observation",
    environment: "devnet_cross_check",
    outcome: deps.receiptCommitmentSampleOk === true ? "PASS" : deps.receiptCommitmentSampleOk === false ? "FAIL" : "BLOCKED",
    detail: deps.receiptCommitmentSampleOk === true ? "consistent" : deps.receiptCommitmentSampleOk === false ? "mismatch" : "requires_devnet_proof",
    evidence_ref: "lib/decisionReceipts/solanaCommitments",
  }));

  evidence.push(item({
    now,
    id: "devnet_not_mainnet_proof",
    label: "Devnet observation does not establish mainnet security",
    source: "local_assertion",
    environment: "mainnet_governance_preflight",
    outcome: "PASS",
    detail: "explicit_non_equivalence",
    evidence_ref: "scripts/solana-devnet-chain-precheck.ts",
  }));

  const hasFail = evidence.some(e => e.outcome === "FAIL") || mainnetEnabled;
  const allPass = evidence.every(e => e.outcome === "PASS");
  const overall: GovernanceEvidenceOutcome = hasFail ? "FAIL" : allPass ? "PASS" : "BLOCKED";

  return {
    schema: "solana_mainnet_governance_verifier_v1",
    overall,
    mainnet_issuance_disabled: !mainnetEnabled,
    devnet_proof_sufficient_for_mainnet: false,
    rpc_cluster_agreement: rpcClusterAgreement,
    live_dual_rpc_observation: liveObservation,
    evidence,
    emergency_disable_ref: EMERGENCY_DISABLE_REF,
  };
}

export function mapGovernanceReportToPromotionInputs(
  report: SolanaMainnetGovernanceReport,
): {
  deployment_registry_integrity_ok?: boolean;
  verified_program_id_match?: boolean;
  upgrade_authority_documented?: boolean;
  signer_active?: boolean;
  signer_rotation_documented?: boolean;
  rpc_url_configured?: boolean;
  rpc_is_devnet?: boolean;
  independent_observation_present?: boolean;
  receipt_commitment_consistency_ok?: boolean;
} {
  const byId = new Map(report.evidence.map(e => [e.id, e]));
  const pass = (id: string) => byId.get(id)?.outcome === "PASS";
  const primaryCluster = byId.get("primary_rpc_cluster");
  return {
    deployment_registry_integrity_ok: pass("registry_provenance"),
    verified_program_id_match: pass("program_elf_digest"),
    upgrade_authority_documented: pass("upgrade_authority_custody"),
    signer_active: pass("signer_custody"),
    signer_rotation_documented: pass("signer_rotation"),
    rpc_url_configured: Boolean(process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim()),
    rpc_is_devnet: primaryCluster?.detail === "devnet_genesis_not_mainnet_proof",
    independent_observation_present: pass("independent_rpc_agreement"),
    receipt_commitment_consistency_ok: pass("receipt_commitment_consistency"),
  };
}

// Read-only Solana mainnet promotion gate — no deploy, no mainnet transactions.

import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";

export type PromotionCheckVerdict = "PASS" | "FAIL" | "BLOCKED";

export type SolanaMainnetPromotionCheck = {
  id: string;
  label: string;
  verdict: PromotionCheckVerdict;
  evidence_ref: string;
  detail: string;
};

export type SolanaMainnetPromotionReport = {
  schema: "solana_mainnet_promotion_gate_v1";
  overall: PromotionCheckVerdict;
  mainnet_programs_enabled: boolean;
  devnet_proof_sufficient_for_mainnet: false;
  checks: SolanaMainnetPromotionCheck[];
  rollback_procedure_ref: string;
};

const ROLLBACK_REF = "docs/solana-devnet-proof-packet.md#rollback";

export function evaluateSolanaMainnetPromotionGate(input: {
  deployment_registry_integrity_ok?: boolean;
  verified_program_id_match?: boolean;
  upgrade_authority_documented?: boolean;
  signer_active?: boolean;
  signer_rotation_documented?: boolean;
  rpc_url_configured?: boolean;
  rpc_is_devnet?: boolean;
  independent_observation_present?: boolean;
  receipt_commitment_consistency_ok?: boolean;
  conformance_vectors_pass?: boolean;
}): SolanaMainnetPromotionReport {
  const mainnetCap = getNetworkCapability("solana_mainnet");
  const mainnetProgramsEnabled = mainnetCap?.status === "available" || mainnetCap?.status === "configured";

  const checks: SolanaMainnetPromotionCheck[] = [
    {
      id: "mainnet_network_disabled",
      label: "Solana mainnet issuance disabled in product",
      verdict: mainnetProgramsEnabled ? "FAIL" : "PASS",
      evidence_ref: "lib/partner/networkCapability/registry",
      detail: mainnetCap?.status ?? "unknown",
    },
    {
      id: "deployment_registry",
      label: "Verified deployment registry integrity",
      verdict: input.deployment_registry_integrity_ok ? "PASS" : "BLOCKED",
      evidence_ref: "lib/partner/onchainGateDeployments",
      detail: input.deployment_registry_integrity_ok ? "registry_ok" : "requires_operator_verification",
    },
    {
      id: "program_identity",
      label: "Program IDs match reviewed release artifacts",
      verdict: input.verified_program_id_match ? "PASS" : "BLOCKED",
      evidence_ref: "solana/abraxas-eligibility-gate/REPRODUCIBLE_RELEASE.md",
      detail: input.verified_program_id_match ? "match" : "requires_elf_digest_check",
    },
    {
      id: "upgrade_authority",
      label: "Upgrade authority documented and governed",
      verdict: input.upgrade_authority_documented ? "PASS" : "FAIL",
      evidence_ref: "docs/solana-devnet-config-preflight.md",
      detail: input.upgrade_authority_documented ? "documented" : "missing_governance_record",
    },
    {
      id: "signer_custody",
      label: "Chain attestation signer active",
      verdict: input.signer_active ? "PASS" : "BLOCKED",
      evidence_ref: "lib/partner/chainAttestation/signerLifecycle",
      detail: input.signer_active ? "active" : "signer_unavailable",
    },
    {
      id: "signer_rotation",
      label: "Signer rotation procedure documented",
      verdict: input.signer_rotation_documented ? "PASS" : "FAIL",
      evidence_ref: "lib/partner/chainAttestation/signerLifecycle",
      detail: input.signer_rotation_documented ? "documented" : "missing_runbook",
    },
    {
      id: "rpc_config",
      label: "RPC endpoint configured for observation",
      verdict: input.rpc_url_configured ? "PASS" : "BLOCKED",
      evidence_ref: "ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL",
      detail: input.rpc_url_configured ? "configured" : "missing_rpc",
    },
    {
      id: "rpc_not_mainnet_claim",
      label: "Preflight RPC not treated as mainnet proof",
      verdict: input.rpc_is_devnet === false ? "FAIL" : "PASS",
      evidence_ref: "scripts/solana-devnet-chain-precheck.ts",
      detail: "Devnet observation does not establish mainnet security",
    },
    {
      id: "independent_observation",
      label: "Independent on-chain observation recorded",
      verdict: input.independent_observation_present ? "PASS" : "BLOCKED",
      evidence_ref: "lib/partner/onchainVerifierConformance",
      detail: input.independent_observation_present ? "observation_present" : "observation_required",
    },
    {
      id: "receipt_commitment_consistency",
      label: "Receipt-to-chain commitment consistency checks",
      verdict: input.receipt_commitment_consistency_ok ? "PASS" : "BLOCKED",
      evidence_ref: "lib/decisionReceipts/solanaCommitments",
      detail: input.receipt_commitment_consistency_ok ? "consistent" : "requires_devnet_proof",
    },
    {
      id: "conformance_vectors",
      label: "Verifier conformance vectors",
      verdict: input.conformance_vectors_pass ? "PASS" : "BLOCKED",
      evidence_ref: "lib/partner/onchainVerifierConformance/vectors",
      detail: input.conformance_vectors_pass ? "vectors_pass" : "run_abraxas_conformance",
    },
  ];

  let overall: PromotionCheckVerdict = "PASS";
  for (const check of checks) {
    if (check.verdict === "FAIL") {
      overall = "FAIL";
      break;
    }
    if (check.verdict === "BLOCKED") {
      overall = "BLOCKED";
    }
  }
  if (mainnetProgramsEnabled) overall = "FAIL";

  return {
    schema: "solana_mainnet_promotion_gate_v1",
    overall,
    mainnet_programs_enabled: mainnetProgramsEnabled,
    devnet_proof_sufficient_for_mainnet: false,
    checks,
    rollback_procedure_ref: ROLLBACK_REF,
  };
}

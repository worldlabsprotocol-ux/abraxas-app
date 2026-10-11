#!/usr/bin/env npx tsx
/** Read-only Solana governance evidence capture for operators. */

import { writeFileSync, mkdirSync } from "node:fs";
import { observeSolanaDualRpc } from "@/lib/institutional/solanaDualRpcObservation";
import { runSolanaMainnetGovernanceVerification } from "@/lib/institutional/solanaMainnetGovernanceVerifier";
import { SOLANA_GATE_V2_RELEASE } from "@/lib/partner/onchainGateDeployments/solanaV2Release";

async function main() {
  const primary = process.env.ABRAXAS_SOLANA_GATE_VERIFY_RPC_URL?.trim() ?? "";
  const independent = process.env.ABRAXAS_SOLANA_INDEPENDENT_RPC_URL?.trim() ?? "";
  const programId = process.env.ABRAXAS_SOLANA_GATE_PROGRAM_ID?.trim() || SOLANA_GATE_V2_RELEASE.program_id;

  const observation = primary
    ? await observeSolanaDualRpc({
        primaryRpcUrl: primary,
        independentRpcUrl: independent || null,
        programId,
      })
    : null;

  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: Boolean(process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true"),
    signerCustodyDocumented: Boolean(process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true"),
    finalizedConfirmationPolicyDocumented: true,
  });

  const bundle = {
    schema: "institutional_solana_governance_evidence_v1",
    captured_at: new Date().toISOString(),
    observation,
    governance,
    stop_ship_blockers: governance.evidence.filter(e => e.outcome === "FAIL" || e.outcome === "BLOCKED").map(e => ({
      id: e.id,
      outcome: e.outcome,
      detail: e.detail,
      evidence_ref: e.evidence_ref,
    })),
    mainnet_issuance_enabled: !governance.mainnet_issuance_disabled,
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync("/opt/cursor/artifacts/institutional-solana-governance-evidence.json", JSON.stringify(bundle, null, 2));
  console.log(JSON.stringify(bundle, null, 2));
  process.exit(governance.overall === "PASS" ? 0 : 2);
}

void main();

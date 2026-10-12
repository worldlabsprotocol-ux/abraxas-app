#!/usr/bin/env npx tsx
/** Build #537 — governance execution evidence packet (dry-run + local test pointers). */
import { createHash } from "crypto";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { runGovernanceExecutionPreflight, defaultDevnetGenesisExpectation } from "@/lib/solana/trustRegistry/governance/governanceExecutionPreflight";
import { squadsVaultAcceptCompatibilityReview } from "@/lib/solana/trustRegistry/governance/squadsVault";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const SO = "solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const OUT = "/opt/cursor/artifacts/trust-registry-governance-execution-v537.json";

function sha256File(path: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

const elf = sha256File(SO);
const squads = squadsVaultAcceptCompatibilityReview();

const preflight = runGovernanceExecutionPreflight({
  clusterGenesisHash: defaultDevnetGenesisExpectation(),
  expectedGenesisHash: defaultDevnetGenesisExpectation(),
  programId: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
  elfSha256: elf,
  vaultPda: "11111111111111111111111111111111",
});

const packet = {
  schema: "trust_registry_governance_execution_v537",
  generated_at: new Date().toISOString(),
  trust_registry_program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
  elf_sha256: elf,
  local_rehearsal: {
    vault_pda_cpi_accept: "cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_vault_pda_accept",
    upgrade_authority_rehearsal:
      "cargo test -p abraxas-eligibility-gate-integration-tests --test trust_registry_upgrade_authority_rehearsal",
    governance_vault_rehearsal_program_id: "HfU7eUQ56yCyipjcAja73Fhwf4yKv8YAm4wNiLW4kYXb",
  },
  squads_devnet_execution: {
    status: "BLOCKED",
    reason: "requires_verified_multisig_vault_and_member_signatures",
    notes: squads.notes,
  },
  preflight_sample: preflight,
  transaction_evidence_schema: {
    required_fields: [
      "cluster",
      "slot",
      "signature",
      "program_id",
      "registry_pda",
      "governance_authority_before",
      "governance_authority_after",
      "transfer_seq",
      "vault_pda",
      "multisig_pda",
      "squads_proposal_state",
    ],
  },
};

mkdirSync("/opt/cursor/artifacts", { recursive: true });
writeFileSync(OUT, JSON.stringify(packet, null, 2));
console.log(JSON.stringify(packet, null, 2));

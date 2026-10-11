#!/usr/bin/env npx tsx
import { writeFileSync, mkdirSync } from "node:fs";
import { buildTrustArchitectureGraph } from "@/lib/protocol/trust/trustArchitectureGraph";
import { getBlockchainTrustBoundarySpec } from "@/lib/protocol/trust/blockchainTrustBoundary";
import { runSolanaMainnetGovernanceVerification } from "@/lib/institutional/solanaMainnetGovernanceVerifier";

const OUT = "/opt/cursor/artifacts/protocol-sovereignty-evidence-v529.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const graph = buildTrustArchitectureGraph();
  const boundary = getBlockchainTrustBoundarySpec();
  const governance = await runSolanaMainnetGovernanceVerification({
    signerRotationDocumented: process.env.ABRAXAS_CHAIN_SIGNER_ROTATION_DOCUMENTED === "true",
    signerCustodyDocumented: process.env.ABRAXAS_CHAIN_ATTESTATION_SIGNER_ACTIVE === "true",
    finalizedConfirmationPolicyDocumented: true,
  });

  const report = {
    schema: "protocol_sovereignty_evidence_v529",
    generated_at: new Date().toISOString(),
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    dependency_graph: graph,
    blockchain_trust_boundary: boundary,
    guarantee_enforcement: {
      cryptography: graph.nodes.filter(n => n.class === "protocol_cryptography").map(n => n.id),
      blockchain: graph.nodes.filter(n => n.class === "blockchain_enforced").map(n => n.id),
      abraxas_infrastructure: graph.nodes.filter(n => n.class === "abraxas_operated_infrastructure").map(n => n.id),
      optional_storage: graph.nodes.filter(n => n.class === "optional_internal_storage").map(n => n.id),
    },
    partner_integration_independence: {
      https_api: "POST /api/v1/institutional/eligibility/consume",
      reference_client: "lib/institutional/integration/InstitutionalReferenceClient.ts",
      requires_supabase_credentials: false,
      requires_partner_wallet_for_verify: false,
      chain_verification_public_data: true,
    },
    chain_observation: {
      mainnet_governance_overall: governance.overall,
      mainnet_issuance_enabled: false,
      devnet_gate_program: "lib/partner/chainAttestation/solanaGate.ts",
      receipt_commitment_protocol: "abx-rcpt",
    },
    mainnet_blockers: [
      "Mainnet program promotion gate not PASS",
      "No mainnet deployment performed in this build",
      "Dual-RPC governance observation may be BLOCKED without operator RPC URLs",
    ],
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT, graph_nodes: graph.nodes.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

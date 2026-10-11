#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { verifyIndependentTrustDecision } from "@/lib/protocol/trust/independent/verifyIndependentTrustDecision";
import { INDEPENDENT_TRUST_VERIFIER_SCHEMA } from "@/lib/protocol/trust/independent/contract";
import { getBlockchainTrustBoundarySpec } from "@/lib/protocol/trust/blockchainTrustBoundary";

const OUT = "/opt/cursor/artifacts/independent-on-chain-trust-evidence-v530.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });

  const boundary = getBlockchainTrustBoundarySpec();
  const report = {
    schema: "independent_on_chain_trust_evidence_v530",
    generated_at: new Date().toISOString(),
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    independent_verifier_contract: INDEPENDENT_TRUST_VERIFIER_SCHEMA,
    verifier_entrypoint: "lib/protocol/trust/independent/verifyIndependentTrustDecision.ts",
    example_script: "scripts/examples/independent-relying-party-verify-530.ts",
    requires_supabase: false,
    requires_abraxas_service_role: false,
    verification_phases: ["local_cryptographic", "chain_observation"],
    blockchain_trust_boundary_ref: boundary.schema,
    chain_environment: {
      mainnet_issuance_enabled: false,
      default_cluster: "devnet",
      rpc_source: "ABRAXAS_SOLANA_RECEIPT_COMMITMENT_RPC_URL or devnet public RPC",
    },
    live_chain_evidence: {
      status: "blocked",
      reasons: [
        "No confirmed devnet commitment transaction supplied in this evidence run",
        "Independent verifier fails closed — missing chain evidence is BLOCKED not PASS",
      ],
    },
    adversarial_suite: "lib/protocol/trust/independent/adversarialVerification530.suite.test.ts",
    mainnet_blockers: [
      "Mainnet program promotion gate not PASS",
      "No mainnet deployment or issuance in Build #530",
      "Live chain proof requires operator-provided commitment fixtures on devnet",
    ],
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT, verifier: INDEPENDENT_TRUST_VERIFIER_SCHEMA }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

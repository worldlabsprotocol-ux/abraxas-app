#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { getBlockchainAuthorizationLifecycleSpec } from "@/lib/protocol/trust/lifecycle/blockchainAuthorizationLifecycle";
import { CONTINUOUS_TRUST_VERIFIER_SCHEMA } from "@/lib/protocol/trust/independent/continuousContract";
import { SOLANA_REVOCATION_MEMO_PROTOCOL } from "@/lib/decisionReceipts/solanaCommitment/revocationMemo";

const OUT = "/opt/cursor/artifacts/continuous-authorization-evidence-v532.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const lifecycle = getBlockchainAuthorizationLifecycleSpec();

  const report = {
    schema: "continuous_authorization_evidence_v532",
    generated_at: new Date().toISOString(),
    commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    integration_base_note: "Build #529 + #530 merged at origin/cursor/protocol-sovereignty-storage-independence-529-5ffe (5016d1aa); Build #531 not present",
    lifecycle,
    continuous_verifier: CONTINUOUS_TRUST_VERIFIER_SCHEMA,
    on_chain_revocation_protocol: SOLANA_REVOCATION_MEMO_PROTOCOL,
    guarantees: {
      implemented: [
        "Lifecycle state machine ISSUED/ACTIVE/EXPIRED/REVOKED/SUPERSEDED",
        "Continuous outcomes PERMIT/DENY/PENDING/UNAVAILABLE",
        "abx-rvkt digest-only revocation memos + RPC verifier",
        "Invalidation-after-commitment slot ordering",
        "Bounded verification cache with high-assurance fail-closed stale rejection",
      ],
      locally_tested: [
        "lib/protocol/trust/independent/adversarialLifecycle532.suite.test.ts",
        "lib/decisionReceipts/solanaCommitment/revocationMemo.test.ts",
        "npm run test:protocol-532",
      ],
      independently_observed_devnet: {
        status: "blocked",
        reasons: [
          "No authorized devnet revocation/commitment transaction fixtures in this environment",
        ],
      },
      mainnet_blocked: [
        "No mainnet contract deployment",
        "Memo observation is not program-enforced revocation",
        "Mainnet promotion gates unchanged",
      ],
    },
  };

  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

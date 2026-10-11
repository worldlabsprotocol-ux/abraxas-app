#!/usr/bin/env npx tsx
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const OUT = "/opt/cursor/artifacts/governed-trust-registry-evidence-v533.json";
const SO_PATH = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";

function artifactDigest(): string | null {
  if (!existsSync(SO_PATH)) return null;
  const bytes = readFileSync(SO_PATH);
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const digest = artifactDigest();
  const report = {
    schema: "governed_trust_registry_evidence_v533",
    generated_at: new Date().toISOString(),
    integration_base_sha: "30e5fed152d1b606301a7d59f8d8d9b3a95d4b08",
    program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    program_artifact_digest_sha256: digest,
    idl_path: "solana/abraxas-eligibility-gate/target/idl/abraxas_trust_registry.json",
    guarantees: {
      implemented: [
        "Anchor trust registry with governed issuers/revokers/publishers",
        "Program-level unauthorized revoker rejection",
        "Monotonic commitment sequence + REVOKED/SUPERSEDED states",
        "RPC account verifier with memo-only rejection for program-enforced policies",
      ],
      locally_tested: [
        "lib/protocol/trust/independent/programEnforced533.suite.test.ts",
        "solana/abraxas-eligibility-gate/integration-tests/tests/trust_registry.rs (requires cargo)",
        "npm run test:protocol-533",
      ],
      independently_observed_devnet: {
        status: "blocked",
        reasons: ["No automatic devnet deploy; operator signer required"],
      },
      mainnet_blocked: [
        "No mainnet deployment",
        "Audit + custody + upgrade governance required",
      ],
    },
  };
  writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: OUT, digest }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

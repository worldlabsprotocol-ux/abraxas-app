#!/usr/bin/env npx tsx
/** Build #535 Phase 5 — aggregate sanitized evidence packet. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function readJson(path: string) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

async function main() {
  const gitSha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const packet = {
    schema: "trust_registry_devnet_evidence_v535",
    build: 535,
    git_sha: gitSha,
    integration_base_sha: "71ac9efa6efa92f652d54a99ea974aba23bfd2ed",
    phase_1_release_integrity: readJson("/opt/cursor/artifacts/trust-registry-release-integrity-v535.json"),
    phase_2_preflight: readJson("/opt/cursor/artifacts/trust-registry-devnet-preflight-v535.json"),
    phase_3_live_proof: readJson("/opt/cursor/artifacts/trust-registry-devnet-live-proof-v535.json"),
    phase_4_independent_verify: readJson("/opt/cursor/artifacts/trust-registry-independent-verify-v535.json"),
    classification: {
      local_tests: "anchor/cargo integration + vitest protocol-534/535",
      live_devnet: "blocked unless operator executes txs and supplies session JSON",
      mainnet: "blocked — devnet-only build",
    },
    mainnet_blockers: [
      "No mainnet deploy authorization",
      "No mainnet artifact promotion pipeline",
      "Upgrade authority multisig not configured in this build",
    ],
  };

  const out = "/opt/cursor/artifacts/trust-registry-devnet-evidence-v535.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(packet, null, 2));
  console.log(JSON.stringify({ out, live_status: packet.phase_3_live_proof?.status ?? "unknown" }, null, 2));
}

main();

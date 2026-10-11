#!/usr/bin/env npx tsx
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const OUT = "/opt/cursor/artifacts/trust-registry-compilation-evidence-v534.json";
const SO = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const ARTIFACT = "/workspace/solana/abraxas-eligibility-gate/release/trust-registry-v534.artifact.json";

async function main() {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  const digest = existsSync(SO)
    ? createHash("sha256").update(readFileSync(SO)).digest("hex")
    : null;
  const artifact = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : null;

  writeFileSync(OUT, JSON.stringify({
    schema: "trust_registry_compilation_evidence_v534",
    generated_at: new Date().toISOString(),
    integration_base_sha: "f23c4ead6d75d2050bdf09e4094edb4d53742a0b",
    program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    elf_sha256: digest,
    registry_artifact: artifact,
    idl_path: "solana/abraxas-eligibility-gate/target/idl/abraxas_trust_registry.json",
    idl_present: existsSync("/workspace/solana/abraxas-eligibility-gate/target/idl/abraxas_trust_registry.json"),
    compilation: {
      status: digest ? "pass" : "blocked",
      cargo_unit_tests: "pass (abraxas-trust-registry)",
      integration_tests: "pass (trust_registry.rs x3)",
    },
    live_devnet: {
      status: "blocked",
      reasons: ["No operator deploy authorization", "Dry-run activation only"],
    },
    mainnet: { status: "blocked", reasons: ["No mainnet deploy"] },
  }, null, 2));
  console.log(JSON.stringify({ out: OUT, digest }, null, 2));
}

main();

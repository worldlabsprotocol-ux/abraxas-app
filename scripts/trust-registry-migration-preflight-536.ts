#!/usr/bin/env npx tsx
/** Build #536 — migration preflight (dry-run, no chain writes). */
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { squadsVaultAcceptCompatibilityReview } from "@/lib/solana/trustRegistry/governance/squadsVault";
import { buildTrustRegistryIdl536 } from "@/lib/solana/trustRegistry/idl/buildTrustRegistryIdl536";

const SO = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const OUT = "/opt/cursor/artifacts/trust-registry-migration-preflight-v536.json";

function sha256File(path: string): string | null {
  try {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
  } catch {
    return null;
  }
}

const blockers: string[] = [];
const digest = sha256File(SO);
if (!digest) blockers.push("Missing SBF artifact — run npm run build:trust-registry-sbf");

const idl = buildTrustRegistryIdl536();
if (idl.instructions.length < 17) blockers.push("IDL #536 governance surface incomplete");

const squads = squadsVaultAcceptCompatibilityReview();

const report = {
  schema: "trust_registry_migration_preflight_v536",
  generated_at: new Date().toISOString(),
  elf_sha256: digest,
  blockers,
  squads_compatibility: squads,
  idl_instruction_count: idl.instructions.length,
  dry_run: true,
};

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(blockers.length ? 2 : 0);

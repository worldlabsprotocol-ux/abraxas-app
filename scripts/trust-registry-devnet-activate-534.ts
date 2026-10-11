#!/usr/bin/env npx tsx
/**
 * Operator-only devnet activation (Build #534). Default: DRY RUN — no transactions.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { ABRAXAS_TRUST_REGISTRY_PROGRAM_ID } from "@/lib/solana/trustRegistry/constants";

const SO = "/workspace/solana/abraxas-eligibility-gate/target/deploy/abraxas_trust_registry.so";
const ARTIFACT = "/workspace/solana/abraxas-eligibility-gate/release/trust-registry-v534.artifact.json";

function sha256File(path: string): string | null {
  if (!existsSync(path)) return null;
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function main() {
  const dryRun = process.env.ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED !== "true";
  const digest = sha256File(SO);
  const artifact = existsSync(ARTIFACT) ? JSON.parse(readFileSync(ARTIFACT, "utf8")) : null;

  const checklist = {
    cluster: process.env.SOLANA_CLUSTER ?? "devnet",
    program_id: ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
    expected_artifact_digest: artifact?.elf_sha256 ?? null,
    observed_artifact_digest: digest,
    digest_match: digest != null && artifact?.elf_sha256 === digest,
    deploy_wallet: process.env.SOLANA_DEPLOY_WALLET ?? "UNSET",
    upgrade_authority: process.env.SOLANA_UPGRADE_AUTHORITY ?? "UNSET",
    deploy_authorized_env: process.env.ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED === "true",
  };

  const report = {
    schema: "trust_registry_devnet_activation_v534",
    mode: dryRun ? "DRY_RUN" : "LIVE_ATTEMPT",
    checklist,
    actions: dryRun
      ? ["Review checklist", "Set ABRAXAS_TRUST_REGISTRY_DEPLOY_AUTHORIZED=true to allow live deploy script extension"]
      : ["BLOCKED: live deploy transactions not implemented in agent — operator must run solana program deploy manually"],
    live_devnet_proof: {
      status: "blocked",
      reasons: dryRun
        ? ["Dry-run default; no operator authorization"]
        : ["Agent does not submit deployment transactions"],
    },
  };

  console.log(JSON.stringify(report, null, 2));
  if (!dryRun) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

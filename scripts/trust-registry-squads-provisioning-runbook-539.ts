#!/usr/bin/env npx tsx
/** Build #539 — print founder-controlled Squads v4 provisioning runbook (no on-chain actions). */
import { mkdirSync, writeFileSync } from "fs";
import { squadsV4InstitutionalProvisioningRunbook } from "@/lib/solana/trustRegistry/governance/squadsV4ProvisioningRunbook";

function main() {
  const runbook = squadsV4InstitutionalProvisioningRunbook();
  const out = "/opt/cursor/artifacts/trust-registry-squads-provisioning-runbook-v539.json";
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(out, JSON.stringify(runbook, null, 2));
  console.log(JSON.stringify(runbook, null, 2));
}

main();

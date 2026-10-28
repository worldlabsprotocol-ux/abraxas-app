#!/usr/bin/env npx tsx
// FILE: scripts/execution-contract-guard/check.ts
// Blocking CI guard — execution contract integrity (Build 889).

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { assertLaunchpadStarterKitContractIntegrity } from "../../lib/partner/executionContracts/registry";

const REPO_ROOT = resolve(__dirname, "../..");

function main(): void {
  const errors = assertLaunchpadStarterKitContractIntegrity();
  if (errors.length > 0) {
    console.error("\nExecution contract guard FAILED:\n");
    for (const err of errors) console.error(`  • ${err}`);
    process.exit(1);
  }

  console.log("Execution contract static checks passed. Running vitest suite…");
  execSync(
    "./node_modules/.bin/vitest run lib/partner/executionContracts/executionContracts.test.ts lib/partner/starterKit/prepareLaunchpadStarterKitBody.test.ts lib/partner/launchpad/starterKitLaunchpadRoute.test.ts lib/developers/serverAuthoritativeJourney.test.ts lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts",
    { cwd: REPO_ROOT, stdio: "inherit" },
  );
  console.log("\n✓ Execution contract guard passed.");
}

main();

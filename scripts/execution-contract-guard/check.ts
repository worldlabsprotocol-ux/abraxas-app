#!/usr/bin/env npx tsx
// FILE: scripts/execution-contract-guard/check.ts
// Blocking CI guard — execution contract integrity (Build 889 / 890).

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { assertExecutionContractRegistryIntegrity } from "../../lib/partner/executionContracts/registry";

const REPO_ROOT = resolve(__dirname, "../..");

const VITEST_SUITES = [
  "lib/partner/executionContracts/executionContracts.test.ts",
  "lib/partner/starterKit/prepareLaunchpadStarterKitBody.test.ts",
  "lib/partner/launchpad/starterKitLaunchpadRoute.test.ts",
  "lib/partner/hostedHandoff/partnerHandoffRoute.test.ts",
  "lib/auth/ephemeralWallet/walletActionChallengeRoute.test.ts",
  "lib/auth/ephemeralWallet/sandboxValidateRoute.test.ts",
  "lib/developers/serverAuthoritativeJourney.test.ts",
  "lib/developers/integrationStudioWalletSurface.test.ts",
  "lib/institutional/mandate/build889InstitutionalReliability.adversarial.test.ts",
  "examples/portable-relying-party/portable-relying-party.test.ts",
  "examples/external-node-partner/externalPartner.test.ts",
];

function main(): void {
  const errors = assertExecutionContractRegistryIntegrity();
  if (errors.length > 0) {
    console.error("\nExecution contract guard FAILED:\n");
    for (const err of errors) console.error(`  • ${err}`);
    process.exit(1);
  }

  console.log("Execution contract static checks passed. Running vitest suite…");
  execSync(`./node_modules/.bin/vitest run ${VITEST_SUITES.join(" ")}`, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  console.log("\n✓ Execution contract guard passed.");
}

main();

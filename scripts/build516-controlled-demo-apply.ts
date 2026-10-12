#!/usr/bin/env npx tsx
/**
 * Build #516 — controlled Demo apply for migrations 134–138 only after hard-stop gate.
 */

import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { createDemoPgClient } from "./demo/lib/demoPgClient";
import {
  applySolanaIncrementalMigrations,
  validateApplyDemoMigrationConfig,
} from "./demo/lib/solanaIncrementalMigrationRunner";

const ROOT = resolve(__dirname, "..");

async function main() {
  execSync("tsx scripts/build516/pre-apply-safety-gate.ts", {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  const confirm = process.argv.find(a => a.startsWith("--confirm="))?.slice("--confirm=".length)
    ?? process.argv[process.argv.indexOf("--confirm") + 1];
  if (confirm !== "ocntwbxarpjeixdnzide") {
    console.error("STOP: --confirm=ocntwbxarpjeixdnzide required");
    process.exit(2);
  }

  const config = validateApplyDemoMigrationConfig(process.env);
  const { applied, skipped } = await applySolanaIncrementalMigrations({
    config,
    confirmation: confirm,
    env: process.env,
    createClient: createDemoPgClient,
  });
  console.log(JSON.stringify({ applied, skipped }, null, 2));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

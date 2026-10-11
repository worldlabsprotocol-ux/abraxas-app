#!/usr/bin/env npx tsx
// Apply Solana incremental migrations 134–138 on Demo only — requires explicit --confirm.

import { createDemoPgClient } from "./lib/demoPgClient";
import { DemoProjectGuardError, redactSecrets } from "./lib/demoProjectGuard";
import { DemoDatabaseUrlError, redactDatabaseSecrets } from "./lib/demoDatabaseUrl";
import { DemoSslRootCertError } from "./lib/demoSslRootCert";
import {
  applySolanaIncrementalMigrations,
  buildSolanaIncrementalDryRunReport,
  formatSolanaIncrementalDryRunReport,
  validateApplyDemoMigrationConfig,
  validateDryRunDemoMigrationConfig,
} from "./lib/solanaIncrementalMigrationRunner";

function parseArgs(argv: string[]): { apply: boolean; confirm?: string } {
  let apply = false;
  let confirm: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--confirm") {
      confirm = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--confirm=")) {
      confirm = arg.slice("--confirm=".length);
    }
  }
  return { apply, confirm };
}

async function main(): Promise<number> {
  const { apply, confirm } = parseArgs(process.argv.slice(2));

  if (!apply) {
    try {
      const config = validateDryRunDemoMigrationConfig(process.env);
      const report = buildSolanaIncrementalDryRunReport(config);
      console.log(formatSolanaIncrementalDryRunReport(report));
      return 0;
    } catch (error) {
      const message = error instanceof DemoProjectGuardError
        ? `Configuration error [${error.code}]: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
      console.error(redactSecrets(message));
      return 2;
    }
  }

  let config;
  try {
    config = validateApplyDemoMigrationConfig(process.env);
  } catch (error) {
    if (error instanceof DemoProjectGuardError || error instanceof DemoDatabaseUrlError || error instanceof DemoSslRootCertError) {
      console.error(redactDatabaseSecrets(redactSecrets(error.message), process.env));
      return 2;
    }
    console.error(redactDatabaseSecrets(redactSecrets(String(error)), process.env));
    return 2;
  }

  try {
    const { applied, skipped } = await applySolanaIncrementalMigrations({
      config,
      confirmation: confirm,
      env: process.env,
      createClient: createDemoPgClient,
    });
    console.log("Solana incremental apply complete");
    console.log(`Applied: ${applied.length}`, applied);
    console.log(`Skipped (ledger): ${skipped.length}`, skipped);
    return 0;
  } catch (error) {
    console.error(redactDatabaseSecrets(redactSecrets(error instanceof Error ? error.message : String(error)), process.env));
    return 1;
  }
}

main().then(code => process.exit(code));

// FILE: scripts/demo/apply-demo-migrations.ts
// Manifest-scoped demo migration runner — dry-run offline by default.

import {
  applyDemoMigrations,
  buildDryRunReport,
  formatApplyReport,
  formatDryRunReport,
  validateApplyDemoMigrationConfig,
  validateDryRunDemoMigrationConfig,
} from "./lib/demoMigrationRunner";
import { createDemoPgClient } from "./lib/demoPgClient";
import { DemoProjectGuardError, redactSecrets } from "./lib/demoProjectGuard";
import { DemoDatabaseUrlError, redactDatabaseSecrets } from "./lib/demoDatabaseUrl";
import { DemoSslRootCertError } from "./lib/demoSslRootCert";

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
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  return { apply, confirm };
}

async function main(): Promise<number> {
  const { apply, confirm } = parseArgs(process.argv.slice(2));

  if (!apply) {
    try {
      const config = validateDryRunDemoMigrationConfig(process.env);
      const report = buildDryRunReport(config);
      console.log(formatDryRunReport(report));
      return 0;
    } catch (error) {
      if (error instanceof DemoProjectGuardError) {
        console.error(redactSecrets(`Configuration error [${error.code}]: ${error.message}`));
        return 2;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error(redactSecrets(message));
      return 2;
    }
  }

  let config;
  try {
    config = validateApplyDemoMigrationConfig(process.env);
  } catch (error) {
    if (error instanceof DemoProjectGuardError) {
      console.error(redactSecrets(`Configuration error [${error.code}]: ${error.message}`));
      return 2;
    }
    if (error instanceof DemoDatabaseUrlError) {
      console.error(redactDatabaseSecrets(redactSecrets(error.message), process.env));
      return 2;
    }
    if (error instanceof DemoSslRootCertError) {
      console.error(redactDatabaseSecrets(redactSecrets(error.message), process.env));
      return 2;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), process.env));
    return 2;
  }

  try {
    const report = await applyDemoMigrations({
      config,
      confirmation: confirm,
      env: process.env,
      createClient: createDemoPgClient,
    });
    console.log(formatApplyReport(report));
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), process.env));
    return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), process.env));
    process.exit(2);
  });

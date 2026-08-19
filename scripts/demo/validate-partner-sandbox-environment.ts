// FILE: scripts/demo/validate-partner-sandbox-environment.ts
// Read-only Partner Sandbox demo environment validator — Phase A.

import { createDemoRestReadClient } from "./lib/demoRestClient";
import { validateCatalogDemoConfig } from "./lib/demoCatalogConfig";
import {
  formatCatalogValidationReport,
  runCatalogEnvironmentChecks,
} from "./lib/demoCatalogValidator";
import {
  formatValidationReport,
  runEnvironmentChecks,
} from "./lib/demoEnvironmentChecks";
import { assertReadOnlyPolicyModules } from "./lib/demoReadOnlyPolicy";
import { DemoDatabaseUrlError, redactDatabaseSecrets } from "./lib/demoDatabaseUrl";
import {
  DemoProjectGuardError,
  maskProjectRef,
  redactSecrets,
  validateReadOnlyDemoConfig,
} from "./lib/demoProjectGuard";
import { DemoSslRootCertError } from "./lib/demoSslRootCert";

assertReadOnlyPolicyModules();

function parseArgs(argv: string[]): { catalog: boolean; confirm?: string } {
  let catalog = false;
  let confirm: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--catalog") {
      catalog = true;
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

  return { catalog, confirm };
}

async function runRestValidation(): Promise<number> {
  let guardConfig;
  try {
    guardConfig = validateReadOnlyDemoConfig(process.env);
  } catch (error) {
    if (error instanceof DemoProjectGuardError) {
      console.error(redactSecrets(`Configuration error [${error.code}]: ${error.message}`));
      return 2;
    }
    throw error;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    console.error(redactSecrets("Configuration error: SUPABASE_SERVICE_ROLE_KEY is required for read-only validation"));
    return 2;
  }

  const client = createDemoRestReadClient(supabaseUrl!, serviceRoleKey);

  console.log("Partner Sandbox Environment Validation");
  console.log("======================================");
  console.log(`Target project: ${guardConfig.maskedSupabaseUrl}`);
  console.log(`Demo ref:       ${maskProjectRef(guardConfig.demoProjectRef)}`);
  console.log(`Production ref: ${maskProjectRef(guardConfig.productionProjectRef)}`);
  console.log("");

  const report = await runEnvironmentChecks({
    client,
    demoSubjectId: process.env.PARTNER_SANDBOX_DEMO_SUBJECT_ID,
  });

  console.log(formatValidationReport(report));
  return report.exitCode;
}

async function runCatalogValidation(confirm?: string): Promise<number> {
  let config;
  try {
    config = validateCatalogDemoConfig({
      env: process.env,
      confirmation: confirm,
    });
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

  const report = await runCatalogEnvironmentChecks({
    config,
    env: process.env,
  });

  console.log(formatCatalogValidationReport(config, report));
  return report.exitCode;
}

async function main(): Promise<number> {
  const { catalog, confirm } = parseArgs(process.argv.slice(2));

  if (catalog) {
    return runCatalogValidation(confirm);
  }

  return runRestValidation();
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactDatabaseSecrets(redactSecrets(message), process.env));
    process.exit(2);
  });

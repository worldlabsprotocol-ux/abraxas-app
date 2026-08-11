// FILE: scripts/demo/validate-partner-sandbox-environment.ts
// Read-only Partner Sandbox demo environment validator — Phase A.

import { createClient } from "@supabase/supabase-js";
import {
  formatValidationReport,
  runEnvironmentChecks,
} from "./lib/demoEnvironmentChecks";
import { assertReadOnlyPolicyModules } from "./lib/demoReadOnlyPolicy";
import {
  DemoProjectGuardError,
  maskProjectRef,
  redactSecrets,
  validateReadOnlyDemoConfig,
} from "./lib/demoProjectGuard";

assertReadOnlyPolicyModules();

async function main(): Promise<number> {
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

  const client = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(redactSecrets(`Fatal error: ${message}`));
    process.exit(2);
  });

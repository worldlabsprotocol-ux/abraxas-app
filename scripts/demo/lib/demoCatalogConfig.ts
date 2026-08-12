// FILE: scripts/demo/lib/demoCatalogConfig.ts
// Offline validation for catalog-mode demo environment checks.

import {
  assertDatabaseUrlMatchesDemoRef,
  DemoDatabaseUrlError,
  type DemoDatabaseTransport,
  maskDatabaseTarget,
} from "./demoDatabaseUrl";
import { assertApplyConfirmation } from "./demoMigrationRunner";
import {
  assertNodeTlsVerificationEnabled,
  assertSslRootCertPathConfigured,
} from "./demoSslRootCert";
import { validateReadOnlyDemoConfig } from "./demoProjectGuard";

export interface DemoCatalogValidationConfig {
  demoProjectRef: string;
  productionProjectRef: string;
  maskedSupabaseUrl: string;
  maskedDatabaseTarget: string;
  databaseUrl: string;
  databaseTransport: DemoDatabaseTransport;
}

export function validateCatalogDemoConfig(input: {
  env: Record<string, string | undefined>;
  confirmation?: string;
}): DemoCatalogValidationConfig {
  assertNodeTlsVerificationEnabled();

  const guard = validateReadOnlyDemoConfig(input.env);
  assertApplyConfirmation(input.confirmation, guard.demoProjectRef);

  const databaseUrl = input.env.DEMO_SUPABASE_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new DemoDatabaseUrlError(
      "DEMO_SUPABASE_DATABASE_URL is required for catalog validation",
    );
  }

  const parsed = assertDatabaseUrlMatchesDemoRef(databaseUrl, guard.demoProjectRef);
  if (parsed.transport === "supabase_session_pooler") {
    assertSslRootCertPathConfigured(input.env);
  }

  return {
    demoProjectRef: guard.demoProjectRef,
    productionProjectRef: guard.productionProjectRef,
    maskedSupabaseUrl: guard.maskedSupabaseUrl,
    maskedDatabaseTarget: maskDatabaseTarget(parsed),
    databaseUrl,
    databaseTransport: parsed.transport,
  };
}

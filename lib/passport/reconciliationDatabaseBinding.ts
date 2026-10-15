// FILE: lib/passport/reconciliationDatabaseBinding.ts
// Bind reconciliation authorization to active Postgres + PostgREST identity agreement.

import type { PoolClient } from "pg";
import { SOVEREIGN_DISPOSABLE_REF } from "@/lib/databaseRecovery/manifestGuard";
import {
  PASSPORT_HYBRID_PROJECT_REF_ENV,
  validatePassportHybridPostgresBinding,
} from "@/lib/persistence/passportHybridPostgres";
import { VERIFIED_DATABASE_PROJECT_REF_ENV } from "./holderIdentityReconciliationAuth";

export type ReconciliationDatabaseBinding =
  | {
      ok: true;
      bindingMode: "supabase_dual_identity" | "disposable_local_test";
      /** Authoritative identity derived from the active direct Postgres URL / hybrid validation. */
      derivedProjectRef: string;
      postgrestProjectRef: string | null;
      configuredCrossCheckRef: string | null;
    }
  | { ok: false; code: string; detail: string };

export async function assertReconciliationDatabaseBinding(input: {
  env?: Record<string, string | undefined>;
  client: PoolClient;
}): Promise<ReconciliationDatabaseBinding> {
  const env = input.env ?? process.env;
  await input.client.query("select 1 as reconciliation_connection_probe");

  const validation = validatePassportHybridPostgresBinding(env);
  if (!validation.ok) {
    return { ok: false, code: validation.code, detail: "Hybrid Postgres binding validation failed." };
  }

  const configuredCrossCheckRef =
    env[VERIFIED_DATABASE_PROJECT_REF_ENV]?.trim()
    || env[PASSPORT_HYBRID_PROJECT_REF_ENV]?.trim()
    || null;

  if (validation.binding_mode === "disposable_local_test") {
    const derivedProjectRef = SOVEREIGN_DISPOSABLE_REF;
    if (configuredCrossCheckRef && configuredCrossCheckRef !== derivedProjectRef) {
      return {
        ok: false,
        code: "configured_ref_overrides_derived_identity",
        detail: "Configured project ref must not disagree with disposable derived identity.",
      };
    }
    return {
      ok: true,
      bindingMode: "disposable_local_test",
      derivedProjectRef,
      postgrestProjectRef: null,
      configuredCrossCheckRef,
    };
  }

  const derivedProjectRef = validation.direct_project_ref;
  const postgrestProjectRef = validation.postgrest_project_ref;
  if (postgrestProjectRef !== derivedProjectRef) {
    return {
      ok: false,
      code: "postgrest_direct_identity_mismatch",
      detail: "PostgREST and direct PostgreSQL project identities disagree.",
    };
  }

  if (configuredCrossCheckRef && configuredCrossCheckRef !== derivedProjectRef) {
    return {
      ok: false,
      code: "configured_ref_overrides_derived_identity",
      detail: "Configured project ref cross-check disagrees with connection-derived identity.",
    };
  }

  return {
    ok: true,
    bindingMode: "supabase_dual_identity",
    derivedProjectRef,
    postgrestProjectRef,
    configuredCrossCheckRef,
  };
}

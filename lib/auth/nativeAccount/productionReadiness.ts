// FILE: lib/auth/nativeAccount/productionReadiness.ts
// Operator-facing production native auth readiness (no secret values).

import { resolvePersistenceBackend } from "@/lib/persistence/env";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import { isNativeAccountAuthEnabled, nativeAccountMemoryStoreEnabled } from "./featureFlag";
import {
  getNativeAuthRuntimeDiagnostics,
  interpretNativeAuthFlagState,
  type NativeAuthRuntimeDiagnostics,
} from "./runtimeDiagnostics";
import type { NativeAuthSchemaProbe } from "./schemaReadiness";

export type NativeAuthProductionReadiness = {
  diagnostics: NativeAuthRuntimeDiagnostics;
  persistence_backend: string;
  vercel_env_configured: boolean;
  vercel_runtime_enabled: boolean;
  /** True when Vercel has flag but runtime still disabled — redeploy required. */
  redeploy_required_for_env: boolean;
  blockers: string[];
  rollback: { disable_flag: string; data_retained: boolean };
};

export function assessNativeAuthProductionReadiness(input: {
  env?: Record<string, string | undefined>;
  schema?: NativeAuthSchemaProbe | null;
  hostHeader?: string | null;
}): NativeAuthProductionReadiness {
  const env = input.env ?? process.env;
  const diagnostics = getNativeAuthRuntimeDiagnostics(env);
  const config = validateNativeAuthRuntimeConfig(env);
  const flagState = interpretNativeAuthFlagState(env);
  const vercelConfigured = flagState === "enabled";
  const runtimeEnabled = isNativeAccountAuthEnabled(env);

  const blockers: string[] = [];
  if (nativeAccountMemoryStoreEnabled(env)) blockers.push("memory_store_forbidden_in_production");
  if (!diagnostics.session_secret_configured) blockers.push("session_secret_missing");
  if (!diagnostics.webauthn_rp_id_configured && env.NODE_ENV === "production") {
    blockers.push("webauthn_rp_id_env_recommended");
  }
  if (input.schema && !input.schema.ok && runtimeEnabled) {
    blockers.push(input.schema.code ?? "schema_not_ready");
  }
  if (!config.ok && runtimeEnabled) blockers.push(config.code);
  if (vercelConfigured && !runtimeEnabled && env.VERCEL_ENV === "production") {
    blockers.push("production_flag_set_but_runtime_disabled_redeploy");
  }

  return {
    diagnostics,
    persistence_backend: resolvePersistenceBackend(env),
    vercel_env_configured: vercelConfigured,
    vercel_runtime_enabled: runtimeEnabled,
    redeploy_required_for_env: vercelConfigured && !runtimeEnabled,
    blockers,
    rollback: {
      disable_flag: "ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED=false",
      data_retained: true,
    },
  };
}

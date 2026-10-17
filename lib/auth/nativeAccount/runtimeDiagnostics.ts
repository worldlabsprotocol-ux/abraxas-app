// FILE: lib/auth/nativeAccount/runtimeDiagnostics.ts
// Non-secret native auth readiness snapshot for staging operators.

import { extractSupabaseProjectRefFromConfiguredUrl } from "@/lib/partner/launchpad/stagingEnvironment";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import { isNativeAccountAuthEnabled, nativeAccountMemoryStoreEnabled } from "./featureFlag";

export type NativeAuthFlagState = "unset" | "enabled" | "disabled";

export function interpretNativeAuthFlagState(
  env: Record<string, string | undefined> = process.env,
): NativeAuthFlagState {
  const raw = env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED?.trim().toLowerCase();
  if (!raw) return "unset";
  if (raw === "1" || raw === "true" || raw === "enabled") return "enabled";
  if (raw === "0" || raw === "false" || raw === "disabled") return "disabled";
  return "disabled";
}

export type NativeAuthRuntimeDiagnostics = {
  enabled: boolean;
  config_ok: boolean;
  config_code: string | null;
  native_auth_flag_state: NativeAuthFlagState;
  memory_store: boolean;
  session_secret_configured: boolean;
  webauthn_rp_id_configured: boolean;
  supabase_project_ref: string | null;
  deployment_environment: string | null;
  node_env: string | null;
};

export function getNativeAuthRuntimeDiagnostics(
  env: Record<string, string | undefined> = process.env,
): NativeAuthRuntimeDiagnostics {
  const enabled = isNativeAccountAuthEnabled(env);
  const config = validateNativeAuthRuntimeConfig(env);
  const secret =
    env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || env.ABRAXAS_SIGNING_KEY?.trim();

  return {
    enabled,
    config_ok: config.ok,
    config_code: config.ok ? null : config.code,
    native_auth_flag_state: interpretNativeAuthFlagState(env),
    memory_store: nativeAccountMemoryStoreEnabled(env),
    session_secret_configured: Boolean(secret && secret.length >= 32),
    webauthn_rp_id_configured: Boolean(env.ABRAXAS_WEBAUTHN_RP_ID?.trim()),
    supabase_project_ref: extractSupabaseProjectRefFromConfiguredUrl(env.NEXT_PUBLIC_SUPABASE_URL),
    deployment_environment: env.VERCEL_ENV?.trim() ?? null,
    node_env: env.NODE_ENV?.trim() ?? null,
  };
}

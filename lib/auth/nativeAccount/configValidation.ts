// FILE: lib/auth/nativeAccount/configValidation.ts

import { isNativeAccountAuthEnabled } from "./featureFlag";
import { isNativeAccountDirectPostgresEnabled } from "@/lib/persistence/nativeAccountPg";
import {
  isSovereignNativeAccountMode,
  validateSovereignNativeAccountDatabase,
} from "@/lib/persistence/sovereignNativeAccount";

export type NativeAuthConfigState =
  | { ok: true }
  | {
      ok: false;
      code:
        | "disabled"
        | "session_secret_missing"
        | "memory_forbidden_in_production"
        | "sovereign_database_missing"
        | "sovereign_supabase_host_rejected";
    };

export function validateNativeAuthRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): NativeAuthConfigState {
  if (!isNativeAccountAuthEnabled(env)) {
    return { ok: false, code: "disabled" };
  }

  if (env.NODE_ENV === "production") {
    const memory = env.ABRAXAS_NATIVE_ACCOUNT_MEMORY?.trim().toLowerCase();
    if (memory === "1" || memory === "true") {
      return { ok: false, code: "memory_forbidden_in_production" };
    }
  }

  const secret =
    env.ABRAXAS_ACCOUNT_SESSION_SECRET?.trim()
    || env.ABRAXAS_BROWSER_SESSION_SECRET?.trim()
    || env.ABRAXAS_SIGNING_KEY?.trim();

  if (!secret || secret.length < 32) {
    return { ok: false, code: "session_secret_missing" };
  }

  if (isSovereignNativeAccountMode(env)) {
    const dbCheck = validateSovereignNativeAccountDatabase(env);
    if (!dbCheck.ok) {
      return {
        ok: false,
        code: dbCheck.code === "supabase_host_rejected"
          ? "sovereign_supabase_host_rejected"
          : "sovereign_database_missing",
      };
    }
    if (env.NODE_ENV === "production" && !isNativeAccountDirectPostgresEnabled(env)) {
      return { ok: false, code: "sovereign_database_missing" };
    }
  }

  return { ok: true };
}

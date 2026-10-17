// FILE: lib/auth/nativeAccount/configValidation.ts

import { isNativeAccountAuthEnabled } from "./featureFlag";

export type NativeAuthConfigState =
  | { ok: true }
  | { ok: false; code: "disabled" | "session_secret_missing" | "memory_forbidden_in_production" };

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

  return { ok: true };
}

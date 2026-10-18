// FILE: lib/auth/nativeAccount/featureFlag.ts

import { isSovereignNativeAccountMode } from "@/lib/persistence/sovereignNativeAccount";
import { extractSupabaseProjectRefFromConfiguredUrl } from "@/lib/partner/launchpad/stagingEnvironment";

/** Native passkey account auth — off in production until staging validation. */
export function isNativeAccountAuthEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "enabled") return true;
  if (raw === "0" || raw === "false" || raw === "disabled") return false;
  if (env.VITEST === "true" || env.NODE_ENV === "test") return true;
  return false;
}

export function nativeAccountMemoryStoreEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env.ABRAXAS_NATIVE_ACCOUNT_MEMORY?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "disabled") return false;
  if (env.NODE_ENV === "production") return false;
  if (raw === "1" || raw === "true") return true;
  if (isSovereignNativeAccountMode(env)) return false;
  if (extractSupabaseProjectRefFromConfiguredUrl(env.NEXT_PUBLIC_SUPABASE_URL)) return false;
  return env.VITEST === "true" || env.NODE_ENV === "test";
}

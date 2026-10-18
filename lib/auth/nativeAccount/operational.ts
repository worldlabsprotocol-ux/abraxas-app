// FILE: lib/auth/nativeAccount/operational.ts
// Runtime operational gate — flag alone does not mean Connect can run passkey ceremonies.

import { isNativeAccountAuthEnabled } from "./featureFlag";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import type { NativeAuthSchemaProbe } from "./schemaReadiness";

export function resolveNativeAuthOperational(input: {
  schema: NativeAuthSchemaProbe;
  env?: Record<string, string | undefined>;
}): {
  flag_enabled: boolean;
  config_ok: boolean;
  schema_ok: boolean;
  operational: boolean;
  degraded_reason: string | null;
} {
  const env = input.env ?? process.env;
  const flag_enabled = isNativeAccountAuthEnabled(env);
  const config = validateNativeAuthRuntimeConfig(env);
  const config_ok = config.ok;
  const schema_ok = input.schema.ok;
  const operational = flag_enabled && config_ok && schema_ok;

  let degraded_reason: string | null = null;
  if (flag_enabled && !operational) {
    if (!config_ok && config.code !== "disabled") degraded_reason = config.code;
    else if (!schema_ok) degraded_reason = input.schema.code ?? "schema_not_ready";
    else degraded_reason = "native_auth_not_operational";
  }

  return { flag_enabled, config_ok, schema_ok, operational, degraded_reason };
}

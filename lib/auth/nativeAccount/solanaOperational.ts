// FILE: lib/auth/nativeAccount/solanaOperational.ts

import { isNativeAccountAuthEnabled } from "./featureFlag";
import { validateNativeAuthRuntimeConfig } from "./configValidation";
import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import type { SolanaAccountAuthSchemaProbe } from "./solanaSchemaReadiness";

export function resolveSolanaAccountAuthOperational(input: {
  schema: SolanaAccountAuthSchemaProbe;
  env?: Record<string, string | undefined>;
}): {
  flag_enabled: boolean;
  config_ok: boolean;
  network_ok: boolean;
  schema_ok: boolean;
  operational: boolean;
  degraded_reason: string | null;
} {
  const env = input.env ?? process.env;
  const flag_enabled = isNativeAccountAuthEnabled(env);
  const config = validateNativeAuthRuntimeConfig(env);
  const config_ok = config.ok;
  const network_ok = Boolean(resolveAuthorizedSolanaNetworkFromEnv());
  const schema_ok = input.schema.ok;
  const operational = flag_enabled && config_ok && network_ok && schema_ok;

  let degraded_reason: string | null = null;
  if (flag_enabled && !operational) {
    if (!config_ok && config.code !== "disabled") degraded_reason = config.code;
    else if (!network_ok) degraded_reason = "solana_network_not_configured";
    else if (!schema_ok) degraded_reason = input.schema.code ?? "schema_not_ready";
    else degraded_reason = "solana_account_auth_not_operational";
  }

  return { flag_enabled, config_ok, network_ok, schema_ok, operational, degraded_reason };
}

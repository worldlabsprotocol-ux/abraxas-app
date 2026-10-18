// FILE: lib/auth/ephemeralWallet/operational.ts

import { validateEphemeralWalletRuntimeConfig } from "./configValidation";
import { isEphemeralWalletAuthEnabled } from "./featureFlag";
import { probeEphemeralChallengeStore } from "./challengeStore";
import { probeEphemeralSessionStore } from "./sessionStore";

export async function resolveEphemeralWalletAuthOperationalAsync(
  env: Record<string, string | undefined> = process.env,
): Promise<{
  flag_enabled: boolean;
  config_ok: boolean;
  state_store_ok: boolean;
  operational: boolean;
  degraded_reason: string | null;
  state_backend: string | null;
}> {
  const flag_enabled = isEphemeralWalletAuthEnabled(env);
  const config = validateEphemeralWalletRuntimeConfig(env);
  const config_ok = config.ok;

  let state_store_ok = false;
  let state_backend: string | null = null;
  if (flag_enabled && config_ok) {
    const [challengeProbe, sessionProbe] = await Promise.all([
      probeEphemeralChallengeStore(env),
      probeEphemeralSessionStore(env),
    ]);
    state_store_ok = challengeProbe.ok && sessionProbe.ok;
    state_backend = challengeProbe.backend;
  }

  const operational = flag_enabled && config_ok && state_store_ok;
  let degraded_reason: string | null = null;
  if (flag_enabled && !operational) {
    if (!config_ok && config.code !== "disabled") degraded_reason = config.code;
    else if (!state_store_ok) degraded_reason = "ephemeral_state_unavailable";
    else degraded_reason = "ephemeral_wallet_auth_not_operational";
  }

  return {
    flag_enabled,
    config_ok,
    state_store_ok,
    operational,
    degraded_reason,
    state_backend,
  };
}

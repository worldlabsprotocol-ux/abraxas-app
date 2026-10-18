// FILE: lib/auth/ephemeralWallet/operational.ts

import { validateEphemeralWalletRuntimeConfig } from "./configValidation";
import { isEphemeralWalletAuthEnabled } from "./featureFlag";
import { probeEphemeralChallengeStore } from "./challengeStore";
import { probeEphemeralSessionStore } from "./sessionStore";
import {
  authoritativeChallengeReplayBackend,
  distributedReplayEnforced,
  missingDistributedReplayCapability,
  resolveEphemeralRevocationMode,
  resolveTransientStateBackend,
} from "./transientStatePolicy";

export async function resolveEphemeralWalletAuthOperationalAsync(
  env: Record<string, string | undefined> = process.env,
): Promise<{
  flag_enabled: boolean;
  config_ok: boolean;
  state_store_ok: boolean;
  operational: boolean;
  degraded_reason: string | null;
  state_backend: string | null;
  transient_backend: "process" | "redis";
  distributed_replay_enforced: boolean;
  revocation_mode: string;
  challenge_replay_backend: "redis" | "process" | "none";
  production_activation_blocked: boolean;
  missing_capability: string | null;
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

  const missingCapability = missingDistributedReplayCapability(env);
  const operational = flag_enabled && config_ok && state_store_ok && !missingCapability;
  let degraded_reason: string | null = null;
  if (flag_enabled && !operational) {
    if (missingCapability) degraded_reason = missingCapability;
    else if (!config_ok && config.code !== "disabled") degraded_reason = config.code;
    else if (!state_store_ok) degraded_reason = "ephemeral_state_unavailable";
    else degraded_reason = "ephemeral_wallet_auth_not_operational";
  }

  const challengeBackend = authoritativeChallengeReplayBackend(env);

  return {
    flag_enabled,
    config_ok,
    state_store_ok,
    operational,
    degraded_reason,
    state_backend,
    transient_backend: resolveTransientStateBackend(env),
    distributed_replay_enforced: distributedReplayEnforced(env),
    revocation_mode: resolveEphemeralRevocationMode(env),
    challenge_replay_backend: challengeBackend,
    production_activation_blocked: Boolean(missingCapability),
    missing_capability: missingCapability,
  };
}

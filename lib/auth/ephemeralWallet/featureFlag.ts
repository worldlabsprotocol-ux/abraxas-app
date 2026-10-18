// FILE: lib/auth/ephemeralWallet/featureFlag.ts

export const EPHEMERAL_WALLET_AUTH_ENV = "ABRAXAS_EPHEMERAL_WALLET_AUTH" as const;

export function isEphemeralWalletAuthEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const raw = env[EPHEMERAL_WALLET_AUTH_ENV]?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "enabled") return true;
  if (raw === "0" || raw === "false" || raw === "disabled") return false;
  if (env.VITEST === "true" || env.NODE_ENV === "test") {
    return env.ABRAXAS_EPHEMERAL_INTEGRATION_TEST === "1";
  }
  return false;
}

// FILE: lib/auth/walletLogin/featureFlag.ts
// Environment-scoped wallet-first auth rollout.

export function isWalletFirstAuthEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const server = env.ABRAXAS_WALLET_FIRST_AUTH?.trim().toLowerCase();
  const client = env.NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH?.trim().toLowerCase();
  return server === "true" || server === "1" || client === "true" || client === "1";
}

// FILE: lib/auth/walletLogin/clientFeatureFlag.ts

export function isWalletFirstAuthEnabledClient(): boolean {
  const v = process.env.NEXT_PUBLIC_ABRAXAS_WALLET_FIRST_AUTH?.trim().toLowerCase();
  return v === "true" || v === "1";
}

// FILE: lib/auth/solanaNative/clientFeatureFlag.ts

export function isSolanaNativeProductEnabledClient(): boolean {
  const v = process.env.NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE?.trim().toLowerCase();
  return v === "true" || v === "1";
}

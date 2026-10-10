// FILE: lib/auth/solanaNative/featureFlag.ts

export function isSolanaNativeProductEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const server = env.ABRAXAS_SOLANA_NATIVE?.trim().toLowerCase();
  const client = env.NEXT_PUBLIC_ABRAXAS_SOLANA_NATIVE?.trim().toLowerCase();
  return server === "true" || server === "1" || client === "true" || client === "1";
}

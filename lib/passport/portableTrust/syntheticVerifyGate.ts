// FILE: lib/passport/portableTrust/syntheticVerifyGate.ts

/** Synthetic independent-verify is demo/sandbox only — production fails closed. */
export function isSyntheticIndependentVerifyAllowed(): boolean {
  if (process.env.ABRAXAS_PORTABLE_TRUST_SYNTHETIC_VERIFY === "1") return true;
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  if (process.env.NODE_ENV !== "production") return true;
  return false;
}

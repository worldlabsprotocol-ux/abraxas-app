// FILE: lib/passport/reusableCredential/sandboxGate.ts

/** Reusable credential demo issuance — not production institutional certification. */
export function isPassportReusableCredentialDemoAllowed(): boolean {
  if (process.env.ABRAXAS_PASSPORT_REUSABLE_CREDENTIAL_DEMO === "1") return true;
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  return process.env.NODE_ENV !== "production";
}

// FILE: examples/verify-with-abraxas-external/lib/config.ts
// External-developer configuration — public PartnerKit surface only.

export interface ExternalVerifyConfig {
  partnerId: string;
  policyId: string;
  policyPackId: string;
  applicationId: string;
  environment: "sandbox" | "production";
  abraxasBaseUrl: string;
  returnUrl: string;
}

export function loadExternalVerifyConfig(env: Record<string, string | undefined>): ExternalVerifyConfig {
  return {
    partnerId: env.ABRAXAS_PARTNER_ID ?? "partner-sandbox-example",
    policyId: env.ABRAXAS_POLICY_ID ?? "partner-sandbox-age_21_retail-v1",
    policyPackId: env.ABRAXAS_PACK_ID ?? "age_21_retail",
    applicationId: env.ABRAXAS_APP_ID ?? "app_sandbox_example",
    environment: env.ABRAXAS_ENVIRONMENT === "production" ? "production" : "sandbox",
    abraxasBaseUrl: env.ABRAXAS_BASE_URL ?? "https://abraxasworld.xyz",
    returnUrl: env.ABRAXAS_CALLBACK_URL ?? "https://your-app.example.com/auth/abraxas/callback",
  };
}

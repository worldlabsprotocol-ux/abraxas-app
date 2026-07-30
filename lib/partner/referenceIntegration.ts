// FILE: lib/partner/referenceIntegration.ts
// Generic relying-party integration config — Good Trouble is the reference implementation.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";

export interface PartnerIntegrationConfig {
  partnerId: string;
  policyId: string;
  /** Partner callback path on the relying party origin (e.g. /good-trouble/enter). */
  enterPath: string;
  displayName: string;
}

export function resolvePartnerReturnUrl(config: PartnerIntegrationConfig, origin = APP_URL): string {
  return `${origin.replace(/\/$/, "")}${config.enterPath}`;
}

export function buildPartnerVerifyUrl(
  config: PartnerIntegrationConfig,
  options?: { origin?: string; returnUrl?: string },
): string {
  const returnUrl = options?.returnUrl ?? resolvePartnerReturnUrl(config, options?.origin);
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: returnUrl,
  });
  const base = (options?.origin ?? APP_URL).replace(/\/$/, "");
  return `${base}/partner/verify?${params.toString()}`;
}

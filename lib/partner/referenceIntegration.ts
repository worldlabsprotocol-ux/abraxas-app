// FILE: lib/partner/referenceIntegration.ts
// Generic relying-party integration config — Good Trouble is the reference implementation.

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";

export interface PartnerIntegrationConfig {
  partnerId: string;
  policyId: string;
  /** Partner callback path on the relying party origin (e.g. /good-trouble/enter). */
  enterPath: string;
  displayName: string;
}

export function resolvePartnerReturnUrl(config: PartnerIntegrationConfig, origin?: string): string {
  const base = (origin ?? getPublicAppOrigin()).replace(/\/$/, "");
  return `${base}${config.enterPath}`;
}

export function buildPartnerVerifyUrl(
  config: PartnerIntegrationConfig,
  options?: { origin?: string; returnUrl?: string },
): string {
  const origin = (options?.origin ?? getPublicAppOrigin()).replace(/\/$/, "");
  const returnUrl = options?.returnUrl ?? resolvePartnerReturnUrl(config, origin);
  const params = new URLSearchParams({
    partner_id: config.partnerId,
    policy_id: config.policyId,
    return_url: returnUrl,
  });
  return `${origin}/partner/verify?${params.toString()}`;
}

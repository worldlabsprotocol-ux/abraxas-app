// FILE: scripts/launchpad-staging-smoke/provisionPayload.ts
// Launchpad sandbox provision body for staging smoke — matches wizard semantics.

import { isValidPartnerId } from "@/lib/partner/partnerIdFormat";
import { slugifyLaunchpadApplication, isValidLaunchpadPublicSlug } from "@/lib/partner/launchpad/slug";

export interface SmokeProvisionPayload {
  application_name: string;
  display_name: string;
  partner_id: string;
  policy_template_id: string;
  return_url: string;
  idempotency_key: string;
}

/** Lowercase partner_id aligned with PartnerLaunchpadClient slugify defaults and RPC patterns. */
export function buildSmokePartnerId(testId: string): string {
  return slugifyLaunchpadApplication(testId).slice(0, 48);
}

export function buildSmokeProvisionPayload(input: {
  testId: string;
  approvedReturnUrl: string;
}): SmokeProvisionPayload {
  const partnerId = buildSmokePartnerId(input.testId);
  return {
    application_name: `Staging smoke ${input.testId}`,
    display_name: `Staging smoke ${input.testId}`,
    partner_id: partnerId,
    policy_template_id: "age_21_retail",
    return_url: input.approvedReturnUrl,
    idempotency_key: `${input.testId}-provision`,
  };
}

export function assertSmokeProvisionPayloadValid(payload: SmokeProvisionPayload): void {
  if (!isValidPartnerId(payload.partner_id)) {
    throw new Error(`invalid smoke partner_id: ${payload.partner_id}`);
  }
  const derivedSlug = slugifyLaunchpadApplication(payload.application_name);
  if (!isValidLaunchpadPublicSlug(derivedSlug)) {
    throw new Error(`invalid derived public_slug: ${derivedSlug}`);
  }
}

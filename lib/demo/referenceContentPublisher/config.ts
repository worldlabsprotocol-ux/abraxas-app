// FILE: lib/demo/referenceContentPublisher/config.ts
// Env-overridable sandbox publisher configuration.

import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import { buildPartnerFlowEntryUrl } from "@/lib/partner/partnerFlowIntegratorKit";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
  SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
} from "@/lib/provenance/constants";
import {
  REFERENCE_PUBLISHER_CALLBACK_PATH,
  REFERENCE_PUBLISHER_ENV,
  REFERENCE_PUBLISHER_PURPOSE,
} from "./contract";

export interface ReferencePublisherConfig {
  partner_id: string;
  policy_id: string;
  app_slug: string | null;
  display_name: string;
  pack_id: typeof CONTENT_ORIGIN_DISCLOSURE_PACK_ID;
  purpose: typeof REFERENCE_PUBLISHER_PURPOSE;
  callback_url: string;
  configured: boolean;
}

function resolveOrigin(origin?: string): string {
  return (origin ?? getPublicAppOrigin()).replace(/\/$/, "");
}

export function referencePublisherCallbackUrl(origin?: string): string {
  return `${resolveOrigin(origin)}${REFERENCE_PUBLISHER_CALLBACK_PATH}`;
}

export function resolveReferencePublisherConfig(origin?: string): ReferencePublisherConfig {
  const env = process.env;
  const baseOrigin = resolveOrigin(origin);
  const partnerId = env[REFERENCE_PUBLISHER_ENV.partnerId]?.trim()
    || SANDBOX_CONTENT_PUBLISHER_PARTNER_ID;
  const policyId = env[REFERENCE_PUBLISHER_ENV.policyId]?.trim()
    || buildLaunchpadPolicyId(partnerId, CONTENT_ORIGIN_DISCLOSURE_PACK_ID);
  const appSlug = env[REFERENCE_PUBLISHER_ENV.appSlug]?.trim() || null;
  const displayName = env[REFERENCE_PUBLISHER_ENV.displayName]?.trim() || "Fieldnotes Publisher";
  const callbackUrl = referencePublisherCallbackUrl(baseOrigin);

  const configured = Boolean(partnerId && policyId && callbackUrl);

  return {
    partner_id: partnerId,
    policy_id: policyId,
    app_slug: appSlug,
    display_name: displayName,
    pack_id: CONTENT_ORIGIN_DISCLOSURE_PACK_ID,
    purpose: REFERENCE_PUBLISHER_PURPOSE,
    callback_url: callbackUrl,
    configured,
  };
}

export function buildReferencePublisherVerifyUrl(input: {
  origin?: string;
  publishAttemptId: string;
  expectedContentHash: string;
}): string {
  const config = resolveReferencePublisherConfig(input.origin);
  const returnUrl = new URL(config.callback_url);
  returnUrl.searchParams.set("publish_attempt_id", input.publishAttemptId);

  return buildPartnerFlowEntryUrl({
    partnerId: config.partner_id,
    policyId: config.policy_id,
    returnUrl: returnUrl.toString(),
    origin: resolveOrigin(input.origin),
    purpose: config.purpose,
    expectedContentHash: input.expectedContentHash,
    appSlug: config.app_slug,
  });
}

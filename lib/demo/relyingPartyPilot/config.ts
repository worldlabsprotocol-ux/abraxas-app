// FILE: lib/demo/relyingPartyPilot/config.ts
// Pilot merchant slots — env overrides for live sandbox partners; defaults are documentation placeholders.

import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import { buildPartnerFlowEntryUrl } from "@/lib/partner/partnerFlowIntegratorKit";
import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  RELYING_PARTY_PILOT_CALLBACK_PATH,
  RELYING_PARTY_PILOT_PACK_ID,
  RELYING_PARTY_PILOT_PURPOSE,
  type RelyingPartyPilotSlot,
} from "./contract";

export const RELYING_PARTY_PILOT_ENV = {
  partnerAId: "RELYING_PARTY_PILOT_PARTNER_A_ID",
  partnerAPolicyId: "RELYING_PARTY_PILOT_PARTNER_A_POLICY_ID",
  partnerAName: "RELYING_PARTY_PILOT_PARTNER_A_NAME",
  partnerAAppSlug: "RELYING_PARTY_PILOT_PARTNER_A_APP_SLUG",
  partnerBId: "RELYING_PARTY_PILOT_PARTNER_B_ID",
  partnerBPolicyId: "RELYING_PARTY_PILOT_PARTNER_B_POLICY_ID",
  partnerBName: "RELYING_PARTY_PILOT_PARTNER_B_NAME",
  partnerBAppSlug: "RELYING_PARTY_PILOT_PARTNER_B_APP_SLUG",
} as const;

export interface RelyingPartyPilotMerchantConfig {
  slot: RelyingPartyPilotSlot;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  display_name: string;
  purpose: string;
  pack_id: typeof RELYING_PARTY_PILOT_PACK_ID;
  app_slug: string | null;
  callback_url: string;
  verify_url: string;
  configured: boolean;
}

const DEFAULT_PARTNER_IDS: Record<RelyingPartyPilotSlot, string> = {
  a: "pilot-merchant-a",
  b: "pilot-merchant-b",
};

const DEFAULT_DISPLAY_NAMES: Record<RelyingPartyPilotSlot, string> = {
  a: "Pilot Merchant A",
  b: "Pilot Merchant B",
};

function callbackUrl(origin: string, slot: RelyingPartyPilotSlot): string {
  return `${origin.replace(/\/$/, "")}${RELYING_PARTY_PILOT_CALLBACK_PATH}?slot=${slot}`;
}

function resolveSlot(
  slot: RelyingPartyPilotSlot,
  env: Record<string, string | undefined>,
  origin: string,
): RelyingPartyPilotMerchantConfig {
  const isA = slot === "a";
  const partnerId = (
    isA ? env[RELYING_PARTY_PILOT_ENV.partnerAId] : env[RELYING_PARTY_PILOT_ENV.partnerBId]
  )?.trim() || DEFAULT_PARTNER_IDS[slot];
  const policyId = (
    isA ? env[RELYING_PARTY_PILOT_ENV.partnerAPolicyId] : env[RELYING_PARTY_PILOT_ENV.partnerBPolicyId]
  )?.trim() || buildLaunchpadPolicyId(partnerId, RELYING_PARTY_PILOT_PACK_ID);
  const displayName = (
    isA ? env[RELYING_PARTY_PILOT_ENV.partnerAName] : env[RELYING_PARTY_PILOT_ENV.partnerBName]
  )?.trim() || DEFAULT_DISPLAY_NAMES[slot];
  const appSlug = (
    isA ? env[RELYING_PARTY_PILOT_ENV.partnerAAppSlug] : env[RELYING_PARTY_PILOT_ENV.partnerBAppSlug]
  )?.trim() || null;
  const returnUrl = callbackUrl(origin, slot);
  const verifyUrl = appSlug
    ? `${origin.replace(/\/$/, "")}/partner/verify?app=${encodeURIComponent(appSlug)}&return_url=${encodeURIComponent(returnUrl)}`
    : buildPartnerFlowEntryUrl({
      partnerId,
      policyId,
      returnUrl,
      origin,
    });

  const envConfigured = Boolean(
    (isA ? env[RELYING_PARTY_PILOT_ENV.partnerAId] : env[RELYING_PARTY_PILOT_ENV.partnerBId])?.trim()
    && (isA ? env[RELYING_PARTY_PILOT_ENV.partnerAPolicyId] : env[RELYING_PARTY_PILOT_ENV.partnerBPolicyId])?.trim(),
  );

  return {
    slot,
    partner_id: partnerId,
    policy_id: policyId,
    policy_version: 1,
    display_name: displayName,
    purpose: RELYING_PARTY_PILOT_PURPOSE,
    pack_id: RELYING_PARTY_PILOT_PACK_ID,
    app_slug: appSlug,
    callback_url: returnUrl,
    verify_url: verifyUrl,
    configured: envConfigured || Boolean(appSlug),
  };
}

export function resolveRelyingPartyPilotMerchant(
  slot: RelyingPartyPilotSlot,
  env: Record<string, string | undefined> = process.env,
  origin?: string,
): RelyingPartyPilotMerchantConfig {
  const base = getPublicAppOrigin();
  return resolveSlot(slot, env, origin ?? base);
}

export function resolveRelyingPartyPilotConfig(
  env: Record<string, string | undefined> = process.env,
  origin?: string,
) {
  const base = origin ?? getPublicAppOrigin();
  return {
    pack_id: RELYING_PARTY_PILOT_PACK_ID,
    purpose: RELYING_PARTY_PILOT_PURPOSE,
    merchants: {
      a: resolveSlot("a", env, base),
      b: resolveSlot("b", env, base),
    },
    integration_studio_href: `/developers/integration-studio?pack=${RELYING_PARTY_PILOT_PACK_ID}&path=hosted_partner_flow&platform=universal_https`,
  };
}

export function mergePilotMerchantOverride(
  base: RelyingPartyPilotMerchantConfig,
  override: Partial<Pick<RelyingPartyPilotMerchantConfig, "partner_id" | "policy_id" | "display_name" | "app_slug">>,
  origin?: string,
): RelyingPartyPilotMerchantConfig {
  const appOrigin = origin ?? getPublicAppOrigin();
  const partnerId = override.partner_id?.trim() || base.partner_id;
  const policyId = override.policy_id?.trim() || base.policy_id;
  const displayName = override.display_name?.trim() || base.display_name;
  const appSlug = override.app_slug?.trim() || base.app_slug;
  const returnUrl = callbackUrl(appOrigin, base.slot);
  const verifyUrl = appSlug
    ? `${appOrigin.replace(/\/$/, "")}/partner/verify?app=${encodeURIComponent(appSlug)}&return_url=${encodeURIComponent(returnUrl)}`
    : buildPartnerFlowEntryUrl({ partnerId, policyId, returnUrl, origin: appOrigin });
  return {
    ...base,
    partner_id: partnerId,
    policy_id: policyId,
    display_name: displayName,
    app_slug: appSlug,
    callback_url: returnUrl,
    verify_url: verifyUrl,
    configured: true,
  };
}

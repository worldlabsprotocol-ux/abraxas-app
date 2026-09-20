// FILE: lib/privacy/selectiveDisclosure/profiles.ts
// One server-authoritative profile per catalog pack. No new claims.

import {
  POLICY_PACK_LIST,
  policyPackIsSandboxOnly,
  resolvePolicyPack,
  type PolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import {
  DISCLOSURE_CATALOG_VERSION,
  SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES,
  SHARED_SURFACE_FIELDS,
  type SelectiveDisclosureProfile,
} from "./contract";

export function profileFromPack(pack: PolicyPack): SelectiveDisclosureProfile {
  const sandboxOnly = policyPackIsSandboxOnly(pack);
  return {
    pack_id: pack.id,
    catalog_version: DISCLOSURE_CATALOG_VERSION,
    result_category: pack.disclosed_result,
    partner_visible_result: pack.partner_receives,
    withheld: pack.partner_does_not_receive,
    sandbox_only: sandboxOnly,
    production_use: sandboxOnly ? "sandbox_only" : "reviewed_production",
    public_receipt_fields: SHARED_SURFACE_FIELDS.public_receipt,
    partner_kit_fields: SHARED_SURFACE_FIELDS.partner_kit,
    webhook_fields: SHARED_SURFACE_FIELDS.webhook_event,
    holder_brief_fields: SHARED_SURFACE_FIELDS.holder_brief,
    consent_fields: SHARED_SURFACE_FIELDS.consent_preview,
    passport_activity_fields: SHARED_SURFACE_FIELDS.passport_activity,
    action_contract_fields: SHARED_SURFACE_FIELDS.action_contract,
    trading_action_fields: SHARED_SURFACE_FIELDS.trading_action,
    payment_action_fields: SHARED_SURFACE_FIELDS.payment_action,
    launchpad_summary_fields: SHARED_SURFACE_FIELDS.launchpad_summary,
    forbidden_classes: SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES,
  };
}

export const GENERIC_MINIMAL_PROFILE: SelectiveDisclosureProfile = {
  pack_id: "age_21_retail",
  catalog_version: DISCLOSURE_CATALOG_VERSION,
  result_category: "eligibility confirmed",
  partner_visible_result: "A yes/no policy result. Not documents or date of birth.",
  withheld: ["date of birth", "government ID images", "legal name", "email"],
  sandbox_only: true,
  production_use: "sandbox_only",
  public_receipt_fields: SHARED_SURFACE_FIELDS.public_receipt,
  partner_kit_fields: SHARED_SURFACE_FIELDS.partner_kit,
  webhook_fields: SHARED_SURFACE_FIELDS.webhook_event,
  holder_brief_fields: SHARED_SURFACE_FIELDS.holder_brief,
  consent_fields: SHARED_SURFACE_FIELDS.consent_preview,
  passport_activity_fields: SHARED_SURFACE_FIELDS.passport_activity,
  action_contract_fields: SHARED_SURFACE_FIELDS.action_contract,
  trading_action_fields: SHARED_SURFACE_FIELDS.trading_action,
  payment_action_fields: SHARED_SURFACE_FIELDS.payment_action,
  launchpad_summary_fields: SHARED_SURFACE_FIELDS.launchpad_summary,
  forbidden_classes: SELECTIVE_DISCLOSURE_FORBIDDEN_CLASSES,
};

export const SELECTIVE_DISCLOSURE_PROFILES = POLICY_PACK_LIST.reduce(
  (acc, pack) => {
    acc[pack.id] = profileFromPack(pack);
    return acc;
  },
  {} as Record<PolicyPackId, SelectiveDisclosureProfile>,
);

export type DisclosureResolveResult =
  | { ok: true; profile: SelectiveDisclosureProfile }
  | { ok: false; reason: "disclosure_unavailable" | "disclosure_invalid" };

export function resolveDisclosureProfile(
  packId: string | null | undefined,
  catalogVersion?: number,
): DisclosureResolveResult {
  if (!packId || typeof packId !== "string") {
    return { ok: false, reason: "disclosure_unavailable" };
  }
  const pack = resolvePolicyPack(packId);
  if (!pack) return { ok: false, reason: "disclosure_unavailable" };
  if (catalogVersion != null && catalogVersion !== DISCLOSURE_CATALOG_VERSION) {
    return { ok: false, reason: "disclosure_invalid" };
  }
  const profile = SELECTIVE_DISCLOSURE_PROFILES[pack.id];
  if (!profile || !profile.result_category || !profile.withheld.length) {
    return { ok: false, reason: "disclosure_unavailable" };
  }
  return { ok: true, profile };
}

export function allowedFieldsForSurface(
  profile: SelectiveDisclosureProfile,
  surface: keyof typeof SHARED_SURFACE_FIELDS,
): readonly string[] {
  switch (surface) {
    case "public_receipt":
      return profile.public_receipt_fields;
    case "partner_kit":
      return profile.partner_kit_fields;
    case "webhook_event":
      return profile.webhook_fields;
    case "holder_brief":
      return profile.holder_brief_fields;
    case "consent_preview":
      return profile.consent_fields;
    case "passport_activity":
      return profile.passport_activity_fields;
    case "action_contract":
      return profile.action_contract_fields;
    case "trading_action":
      return profile.trading_action_fields;
    case "payment_action":
      return profile.payment_action_fields;
    case "launchpad_summary":
      return profile.launchpad_summary_fields;
    default:
      return [];
  }
}

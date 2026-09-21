import { ORGANIZATION_ELIGIBILITY_TTL_MS, ORGANIZATION_RESULT_CATEGORIES, type OrganizationResultCategory } from "./contract";
import { mapReviewedOrganizationIssuer } from "./mapIssuer";
import {
  newOrganizationSeed,
  opaqueActorRef,
  opaqueOrganizationRef,
  organizationAudienceHash,
  organizationDerivationHash,
  organizationPartnerHmac,
} from "./opaque";
import { organizationPolicyContract } from "./policies";
import { consumeOrganizationConsent } from "./consent";
import { findOrganizationByDerivation, saveOrganizationEligibility } from "./store";
import type { OrganizationEligibilityRecord } from "./types";

const ISSUE_KEYS = ["consent_ref", "subject_binding_hash"] as const;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export function organizationIssueOverride(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return true;
  return Object.keys(body as Record<string, unknown>).some((key) => !(ISSUE_KEYS as readonly string[]).includes(key));
}

export async function issueOrganizationEligibility(input: {
  partnerId: string;
  consent_ref: string;
  subject_binding_hash?: string | null;
  issuer_key?: string;
  organization_seed?: string;
  actor_seed?: string;
  now?: number;
}): Promise<OrganizationEligibilityRecord> {
  const partner_hmac = organizationPartnerHmac(input.partnerId);
  const consent = consumeOrganizationConsent({ consent_ref: input.consent_ref, partnerHmac: partner_hmac });
  if (!consent) fail("consent_required");
  if (!(ORGANIZATION_RESULT_CATEGORIES as readonly string[]).includes(consent.result_category)) fail("unknown_policy");
  const policy = organizationPolicyContract(consent.result_category);
  if (!policy || policy.live_policy || policy.self_publishable || policy.wallet_control_qualifies) fail("unknown_policy");

  const mapped = mapReviewedOrganizationIssuer({
    issuer_key: input.issuer_key ?? "abraxas.organization_eligibility",
    result_category: consent.result_category as OrganizationResultCategory,
    now: input.now,
  });
  if (!mapped.ok) fail(mapped.reason);

  const organization_ref = opaqueOrganizationRef(input.organization_seed ?? newOrganizationSeed());
  const actor_ref = opaqueActorRef(input.actor_seed ?? newOrganizationSeed());
  const issued_at = new Date(input.now ?? Date.now()).toISOString();
  const expires_at = new Date((input.now ?? Date.now()) + ORGANIZATION_ELIGIBILITY_TTL_MS).toISOString();
  const derivation_hash = organizationDerivationHash([
    partner_hmac,
    organization_ref,
    actor_ref,
    consent.result_category,
    policy.id,
    String(1),
    consent.action,
    consent.environment,
    mapped.issuer_ref,
  ]);
  if (await findOrganizationByDerivation(derivation_hash)) fail("replayed");

  const record: OrganizationEligibilityRecord = {
    organization_ref,
    actor_ref,
    partner_hmac,
    audience_hash: organizationAudienceHash(input.partnerId),
    issuer_ref: mapped.issuer_ref,
    method_category: mapped.method_category,
    assurance_level: mapped.assurance_level,
    result_category: consent.result_category,
    policy_id: policy.id,
    policy_version: 1,
    purpose: consent.purpose,
    action: consent.action,
    action_scope: consent.action_scope,
    environment: consent.environment,
    status: "issued",
    consent_bound: true,
    currently_valid: true,
    issued_at,
    expires_at,
    revoked_at: null,
    withdrawn_at: null,
    derivation_hash,
    presentation_ref: null,
    subject_binding_hash: input.subject_binding_hash?.trim() || null,
  };
  await saveOrganizationEligibility(record);
  return record;
}

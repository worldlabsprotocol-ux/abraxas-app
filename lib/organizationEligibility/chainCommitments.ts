import { ZERO_BYTES32 } from "@/lib/partner/chainAttestation/contract";
import { hashUtf8, hashSubjectBinding } from "@/lib/partner/chainAttestation/hashes";
import { organizationPolicyContract } from "./policies";
import { organizationPartnerHmac } from "./opaque";
import { listOrganizationEligibilityMatching } from "./store";
import { mapReviewedOrganizationIssuer } from "./mapIssuer";
import type { OrganizationEligibilityRecord } from "./types";
import type { OrganizationResultCategory } from "./contract";

export const ZERO_COMMITMENT = ZERO_BYTES32;

export function organizationCommitment(organizationRef: string): `0x${string}` {
  return hashUtf8(organizationRef.trim());
}

export function actorCommitment(actorRef: string): `0x${string}` {
  return hashUtf8(actorRef.trim());
}

export function institutionalResultCategoryHash(category: string): `0x${string}` {
  return hashUtf8(category.trim());
}

export function isInstitutionalPolicyId(policyId: string): boolean {
  return organizationPolicyContract(policyId) !== null;
}

export interface InstitutionalAttestationCommitments {
  require_institutional: boolean;
  organization_commitment: `0x${string}`;
  actor_commitment: `0x${string}`;
  institutional_result_category: `0x${string}`;
  subject_binding_hash: `0x${string}`;
  expires_at_unix?: number;
  record: OrganizationEligibilityRecord | null;
}

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function resolveInstitutionalAttestationCommitments(input: {
  partnerId: string;
  policyId: string;
  policyVersion: number;
  action: string;
  actionScope: string;
  environment: "sandbox" | "production";
  walletBindingHash?: string | null;
}): Promise<InstitutionalAttestationCommitments> {
  if (!isInstitutionalPolicyId(input.policyId)) {
    return {
      require_institutional: false,
      organization_commitment: ZERO_COMMITMENT,
      actor_commitment: ZERO_COMMITMENT,
      institutional_result_category: ZERO_COMMITMENT,
      subject_binding_hash: hashSubjectBinding(input.walletBindingHash),
      record: null,
    };
  }

  const matches = await listOrganizationEligibilityMatching({
    partner_hmac: organizationPartnerHmac(input.partnerId),
    result_category: input.policyId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    action: input.action,
    environment: input.environment,
  });
  const scoped = matches.filter((row) => row.action_scope === input.actionScope);
  const live = scoped.find((row) => row.currently_valid && row.consent_bound && row.status === "issued");
  if (!live) {
    if (scoped.some((row) => row.status === "revoked" || row.status === "withdrawn")) fail("organization_revoked");
    if (scoped.some((row) => row.status === "expired")) fail("expired");
    fail("consent_required");
  }
  if (live.environment !== input.environment) fail("environment_mismatch");
  if (live.policy_id !== input.policyId || live.policy_version !== input.policyVersion) fail("policy_mismatch");
  if (live.action !== input.action) fail("action_mismatch");
  if (!live.consent_bound) fail("consent_required");

  const mapped = mapReviewedOrganizationIssuer({
    issuer_key: "abraxas.organization_eligibility",
    result_category: live.result_category as OrganizationResultCategory,
  });
  if (!mapped.ok) fail(mapped.reason);
  if (live.method_category === "wallet_control" || live.method_category === "self_attestation" || live.method_category === "account_login") {
    fail("issuer_mapping_required");
  }
  const policy = organizationPolicyContract(live.result_category);
  if (!policy || policy.wallet_control_qualifies) fail("issuer_mapping_required");
  if (live.subject_binding_hash && input.walletBindingHash && live.subject_binding_hash !== hashSubjectBinding(input.walletBindingHash)) {
    fail("wallet_binding_mismatch");
  }
  const rawSubject = live.subject_binding_hash?.trim() ?? "";
  const subject = /^0x[0-9a-fA-F]{64}$/.test(rawSubject)
    ? rawSubject.toLowerCase() as `0x${string}`
    : ZERO_COMMITMENT;
  return {
    require_institutional: true,
    organization_commitment: organizationCommitment(live.organization_ref),
    actor_commitment: actorCommitment(live.actor_ref),
    institutional_result_category: institutionalResultCategoryHash(live.result_category),
    subject_binding_hash: subject,
    expires_at_unix: Math.floor(new Date(live.expires_at).getTime() / 1000),
    record: live,
  };
}

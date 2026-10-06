// FILE: lib/partner/narrowPartnerResult/build.ts
// Server-side derivation of authorized narrow partner results from signed receipts.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { evaluateDecisionReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import { assertCustodySafePayload } from "@/lib/custody/guardrails";
import { pickAllowedKeys } from "@/lib/privacy/selectiveDisclosure";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { extractProvenancePartnerFacts } from "@/lib/partner/provenancePartnerResult";
import { isContentOriginDisclosurePolicyId } from "@/lib/provenance/constants";
import { policyExplicitlyRequiresProductEligibility } from "@/lib/policy/evaluatePolicy";
import { getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import type { PolicyEvaluationResult } from "@/lib/policy/types";
import { isInstitutionalClaimsSubject } from "@/lib/decisionReceipts/receiptSubjectPseudonym";
import {
  NARROW_PARTNER_RESULT_ALLOWED_FIELDS,
  NARROW_PARTNER_RESULT_FORBIDDEN_KEYS,
  NARROW_PARTNER_RESULT_SCHEMA_VERSION,
  type NarrowPartnerResult,
} from "./contract";

function sanitizeNarrowResult(payload: NarrowPartnerResult): NarrowPartnerResult {
  const picked = pickAllowedKeys(payload, NARROW_PARTNER_RESULT_ALLOWED_FIELDS) ?? payload;
  const json = JSON.stringify(picked);
  for (const forbidden of NARROW_PARTNER_RESULT_FORBIDDEN_KEYS) {
    if (json.includes(`"${forbidden}"`)) {
      throw new Error(`narrow_partner_result_forbidden_field:${forbidden}`);
    }
  }
  const custody = assertCustodySafePayload(picked, "partner_api");
  if (!custody.ok) {
    throw new Error(`narrow_partner_result_custody_violation:${custody.violations[0]?.code ?? "unknown"}`);
  }
  return picked as NarrowPartnerResult;
}

function trustEnvelope(trust: Awaited<ReturnType<typeof evaluateDecisionReceiptTrust>>): Pick<
  NarrowPartnerResult,
  "currently_valid" | "production_usable" | "trust_environment" | "invalidation_reasons"
> {
  return {
    currently_valid: trust.currently_valid,
    production_usable: trust.production_usable,
    trust_environment: trust.production_usable ? "production" : "sandbox",
    invalidation_reasons: trust.invalidation_reasons,
  };
}

async function loadVerificationDecisionClaims(decisionId: string): Promise<{
  decision: string;
  claims_json: Record<string, unknown>;
  subject_id: string;
  request_id: string | null;
} | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("verification_decisions")
    .select("decision, claims_json, subject_id, request_id")
    .eq("id", decisionId)
    .maybeSingle();
  if (!data) return null;
  return {
    decision: data.decision as string,
    claims_json: (data.claims_json as Record<string, unknown>) ?? {},
    subject_id: data.subject_id as string,
    request_id: (data.request_id as string | null) ?? null,
  };
}

function buildAgeNarrowFacts(input: {
  disclosedResult: string;
  claims: Record<string, unknown>;
  productEligibilityRequired: boolean;
}): Pick<NarrowPartnerResult, "over_21" | "identity_verified" | "assurance_level"> {
  const identityVerified = Boolean(input.claims.identity_verified);
  const productEligibilityVerified = Boolean(input.claims.product_eligibility);
  const over21 = input.disclosedResult === "age_eligible_21"
    && input.productEligibilityRequired
    && productEligibilityVerified;
  return {
    identity_verified: identityVerified,
    over_21: over21,
    assurance_level: identityVerified ? "L2" : null,
  };
}

async function buildApprovedFacts(input: {
  policyId: string;
  policyVersion: number;
  claims: Record<string, unknown>;
}): Promise<Pick<NarrowPartnerResult, "provenance" | "over_21" | "identity_verified" | "assurance_level">> {
  const pack = inferPolicyPackFromPolicyId(input.policyId);
  if (!pack) return {};

  if (isContentOriginDisclosurePolicyId(input.policyId)
    || pack?.id === "content_ai_disclosure"
    || pack?.id === "content_source_integrity") {
    const evaluation = {
      decision: "approved",
      claims: input.claims,
      reason_codes: [],
      valid_until: null,
      missing_claims: [],
    } satisfies PolicyEvaluationResult;
    const provenance = extractProvenancePartnerFacts(evaluation);
    return provenance ? { provenance } : {};
  }

  if (pack.disclosed_result === "age_eligible_21" || pack.disclosed_result === "age_eligible_18") {
    const productEligibilityRequired = typeof input.claims.product_eligibility_required === "boolean"
      ? input.claims.product_eligibility_required
      : await inferProductEligibilityRequired(input.policyId, input.policyVersion);
    return buildAgeNarrowFacts({
      disclosedResult: pack.disclosed_result,
      claims: input.claims,
      productEligibilityRequired,
    });
  }

  return {};
}

async function inferProductEligibilityRequired(policyId: string, policyVersion: number): Promise<boolean> {
  const policy = await getPartnerPolicyAtVersion(policyId, policyVersion);
  if (!policy) return false;
  return policyExplicitlyRequiresProductEligibility(policy.rules_json);
}

export async function buildNarrowPartnerResultForReceipt(
  receiptId: string,
): Promise<NarrowPartnerResult | null> {
  const record = await getReceiptById(receiptId);
  if (!record) return null;

  const trust = await evaluateDecisionReceiptTrust(record, { allowSandbox: true });
  const pack = inferPolicyPackFromPolicyId(record.policy_id);
  const resultFamily = pack?.disclosed_result ?? "policy_result";

  const base: NarrowPartnerResult = {
    schema_version: NARROW_PARTNER_RESULT_SCHEMA_VERSION,
    receipt_id: record.id,
    policy_id: record.policy_id,
    partner_id: record.partner_id,
    decision: record.decision_result,
    result_family: resultFamily,
    ...trustEnvelope(trust),
  };

  if (record.decision_result !== "approved" || !trust.signature_valid || !trust.currently_valid) {
    return sanitizeNarrowResult(base);
  }

  const decision = await loadVerificationDecisionClaims(record.verification_decision_id);
  if (!decision || decision.decision !== "approved") {
    return sanitizeNarrowResult(base);
  }

  const approvedFacts = await buildApprovedFacts({
    policyId: record.policy_id,
    policyVersion: record.policy_version,
    claims: decision.claims_json,
  });

  const institutional = await isInstitutionalClaimsSubject(decision.subject_id);
  const pairwiseRef = institutional ? record.subject_pseudonym_id : undefined;

  return sanitizeNarrowResult({
    ...base,
    ...approvedFacts,
    ...(pairwiseRef ? { pairwise_subject_ref: pairwiseRef } : {}),
  });
}

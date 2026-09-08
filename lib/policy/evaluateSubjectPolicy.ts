// FILE: lib/policy/evaluateSubjectPolicy.ts
// Unified policy evaluation with issuer trust context for a subject.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { assertPolicyBelongsToPartner } from "@/lib/policy/assertPolicyOwnership";
import { getPartnerPolicy, getPartnerPolicyAtVersion } from "@/lib/policy/getPolicy";
import { resolveEffectivePolicyRules } from "@/lib/policy/resolveEffectivePolicyRules";
import { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
import { isBrowseAccessPolicy } from "@/lib/policy/selfAttestationGuards";
import { getActiveSelfAttestations } from "@/lib/assurance/selfAttestation/selfAttestationLedger";
import { ledgerRowsToClaims } from "@/lib/assurance/selfAttestation/selfAttestationClaims";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import type { PartnerPolicy, PolicyEvaluationResult } from "@/lib/policy/types";

export interface SubjectPolicyEvaluation {
  policy: PartnerPolicy;
  evaluation: PolicyEvaluationResult;
  claims: CredentialClaimRecord[];
}

export async function evaluatePolicyForSubject(input: {
  suiAddress: string;
  policyId: string;
  partnerId: string;
  /** When set, evaluate against the pinned historical version (P1-1 reproducibility). */
  policyVersion?: number;
}): Promise<SubjectPolicyEvaluation> {
  const policy = input.policyVersion != null
    ? await getPartnerPolicyAtVersion(input.policyId, input.policyVersion)
    : await getPartnerPolicy(input.policyId);
  if (!policy) throw new Error("Policy not found");
  assertPolicyBelongsToPartner(policy, input.partnerId);

  const subject = normalizeSuiAddress(input.suiAddress);
  const claims = await getActiveClaims(subject);

  const effectiveRules = resolveEffectivePolicyRules(policy);
  let mergedClaims = [...claims];

  if (isBrowseAccessPolicy(effectiveRules)) {
    const rows = await getActiveSelfAttestations({
      holderRef: subject,
      partnerId: input.partnerId,
      policyId: policy.id,
      purpose: "browse",
    });
    mergedClaims = [...mergedClaims, ...ledgerRowsToClaims(rows)];
  }

  const residency = mergedClaims.find(c => c.claim_type === "residency_country")?.claim_value?.country as string | undefined;
  const trustContext = await loadPolicyTrustContext({
    partnerId: input.partnerId,
    policyId: policy.id,
    jurisdiction: residency ?? claims.find(c => c.jurisdiction)?.jurisdiction,
  });

  const evaluation = evaluatePolicyRules(effectiveRules, mergedClaims, {
    jurisdiction: trustContext.jurisdiction,
    partnerId: input.partnerId,
    policyId: policy.id,
    trustRulesByClaimType: trustContext.trustRulesByClaimType,
  });

  return { policy, evaluation, claims: mergedClaims };
}

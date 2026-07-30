// FILE: lib/policy/evaluateSubjectPolicy.ts
// Unified policy evaluation with issuer trust context for a subject.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { assertPolicyBelongsToPartner } from "@/lib/policy/assertPolicyOwnership";
import { getPartnerPolicy } from "@/lib/policy/getPolicy";
import { loadPolicyTrustContext } from "@/lib/trust/loadPolicyTrustContext";
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
}): Promise<SubjectPolicyEvaluation> {
  const policy = await getPartnerPolicy(input.policyId);
  if (!policy) throw new Error("Policy not found");
  assertPolicyBelongsToPartner(policy, input.partnerId);

  const subject = normalizeSuiAddress(input.suiAddress);
  const claims = await getActiveClaims(subject);
  const residency = claims.find(c => c.claim_type === "residency_country")?.claim_value?.country as string | undefined;
  const trustContext = await loadPolicyTrustContext({
    partnerId: input.partnerId,
    policyId: policy.id,
    jurisdiction: residency ?? claims.find(c => c.jurisdiction)?.jurisdiction,
  });

  const evaluation = evaluatePolicyRules(policy.rules_json, claims, {
    jurisdiction: trustContext.jurisdiction,
    partnerId: input.partnerId,
    policyId: policy.id,
    trustRulesByClaimType: trustContext.trustRulesByClaimType,
  });

  return { policy, evaluation, claims };
}
